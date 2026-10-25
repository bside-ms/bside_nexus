import type GroupRepresentation from '@keycloak/keycloak-admin-client/lib/defs/groupRepresentation';
import { isNil } from 'lodash-es';
import getClient from '@/lib/keycloak/getClient';
import getKeycloakClient from '@/lib/keycloak/getClient';
import type { AugmentedUserRepresentation } from '@/lib/keycloak/userActions';
import { augmentUser } from '@/lib/keycloak/userActions';
import isEmptyString from '@/lib/utils/isEmptyString';

// Improving our DX since some fields are always set, also declaring our custom attributes here.
export type AugmentedGroupRepresentation = GroupRepresentation &
    Required<Pick<GroupRepresentation, 'id' | 'name' | 'path'>> & {
        attributes: {
            groupType?: 'koerperschaft' | 'kreis' | 'permission';
            categoryName?: string;
            displayName?: string;
            shortName?: string;
            description?: string;
            wikiLink?: string;
            websiteLink?: string;
            parentGroupId?: string;
            parentAdminsManage: boolean;
            hidden: boolean;
            status?: string;
            includedGroupIds: Array<string>;
        };
    };

const augmentGroup = (group: GroupRepresentation): AugmentedGroupRepresentation | null => {
    if (isEmptyString(group.id) || isEmptyString(group.name) || isEmptyString(group.path)) {
        return null;
    }

    return {
        ...group,
        id: group.id,
        name: group.name,
        path: group.path,
        attributes: {
            groupType: Array.isArray(group.attributes?.group_type) ? group.attributes.group_type[0] : undefined,
            categoryName: Array.isArray(group.attributes?.category_name) ? group.attributes.category_name[0] : undefined,
            displayName: Array.isArray(group.attributes?.display_name) ? group.attributes.display_name[0] : group.name,
            shortName: Array.isArray(group.attributes?.short_name) ? group.attributes.short_name[0] : undefined,
            description: Array.isArray(group.attributes?.description) ? group.attributes.description[0] : undefined,
            wikiLink: Array.isArray(group.attributes?.wikiLink) ? group.attributes.wikiLink[0] : undefined,
            websiteLink: Array.isArray(group.attributes?.websiteLink) ? group.attributes.websiteLink[0] : undefined,
            parentGroupId: Array.isArray(group.attributes?.parent_group_id) ? group.attributes.parent_group_id[0] : undefined,
            parentAdminsManage:
                Array.isArray(group.attributes?.parent_admins_manage) && group.attributes.parent_admins_manage[0] === 'true',
            hidden: Array.isArray(group.attributes?.visibility) && group.attributes.visibility[0] === 'hidden',
            status: Array.isArray(group.attributes?.status) ? group.attributes.status[0] : undefined,
            includedGroupIds: Array.isArray(group.attributes?.included_group_ids) ? group.attributes.included_group_ids : [],
        },
    };
};

// Not caught, with an incomplete tree the sync would mark the missing groups as deleted.
const getSubGroups = async (parentGroupId: string): Promise<Array<AugmentedGroupRepresentation>> =>
    (await (await getClient()).groups.listSubGroups({ parentId: parentGroupId, briefRepresentation: false, first: 0, max: 9999 }))
        .map(augmentGroup)
        .filter((group): group is AugmentedGroupRepresentation => group !== null);

const getParentGroups = async (): Promise<Array<AugmentedGroupRepresentation>> =>
    (await (await getClient()).groups.find({ briefRepresentation: false, first: 0, max: 9999 }))
        .map(augmentGroup)
        .filter((group): group is AugmentedGroupRepresentation => group !== null);

export const keycloakGetGroupById = async (groupId: string): Promise<AugmentedGroupRepresentation | null> => {
    try {
        const group = await (await getClient()).groups.findOne({ id: groupId });

        return isNil(group) ? null : augmentGroup(group);
    } catch {
        return null;
    }
};

const getAllGroupsFlat = async (): Promise<Array<AugmentedGroupRepresentation>> => {
    const allGroupsFlat = new Array<AugmentedGroupRepresentation>();

    const processGroups = async (group: AugmentedGroupRepresentation): Promise<void> => {
        allGroupsFlat.push(group);

        const subGroups = group.id === undefined ? [] : await getSubGroups(group.id);

        await Promise.all(subGroups.map(processGroups));
    };

    await Promise.all((await getParentGroups()).map(processGroups));

    return allGroupsFlat;
};

export const membersGroupIdentifier = 'mitglieder';
export const adminGroupIdentifier = 'admin';
const relevantCategories = ['koerperschaften', 'kreise', 'status', 'untergruppen'];

/*
 * Population Methods.
 */

export interface KeycloakGroupWithChildren {
    group: AugmentedGroupRepresentation;
    memberGroup: AugmentedGroupRepresentation | undefined;
    adminGroup: AugmentedGroupRepresentation | undefined;
}

export const keycloakGetAllGroups = async (): Promise<Array<KeycloakGroupWithChildren>> => {
    const allGroups = await getAllGroupsFlat();
    const childrenOf = (parent: AugmentedGroupRepresentation): Array<AugmentedGroupRepresentation> =>
        allGroups.filter((group) => group.path.startsWith(`${parent.path}/`) && !group.path.slice(parent.path.length + 1).includes('/'));

    return allGroups
        .filter((group) => {
            const [, category, name, ...rest] = group.path.split('/');
            return relevantCategories.includes(category ?? '') && name !== undefined && rest.length === 0;
        })
        .map((group) => {
            const children = childrenOf(group);

            return {
                group,
                memberGroup: children.find((child) => child.name === membersGroupIdentifier),
                adminGroup: children.find((child) => child.name === adminGroupIdentifier),
            };
        });
};

export const keycloakGetDirectMembers = async (groupId: string): Promise<Array<AugmentedUserRepresentation>> => {
    const groupMembers = await (await getClient()).groups.listMembers({ id: groupId, first: 0, max: 9999 });
    return groupMembers.map(augmentUser).filter((user): user is AugmentedUserRepresentation => user !== null);
};

export const keycloakUpdateGroupAttributes = async ({
    groupId,
    description,
    websiteLink,
    wikiLink,
}: {
    groupId: string;
    description?: string;
    websiteLink?: string;
    wikiLink?: string;
}): Promise<void> => {
    const client = await getKeycloakClient();
    const group = await client.groups.findOne({ id: groupId });

    if (group === undefined) {
        throw new Error('Group not found');
    }

    group.attributes ??= {};

    if (description !== undefined) {
        group.attributes.description = [description];
    }

    if (websiteLink !== undefined) {
        group.attributes.websiteLink = [websiteLink];
    }

    if (wikiLink !== undefined) {
        group.attributes.wikiLink = [wikiLink];
    }

    await client.groups.update({ id: groupId, realm: process.env.KEYCLOAK_REALM }, group);
};

// null or an empty list removes the attribute.
export const keycloakSetGroupAttributes = async (
    groupId: string,
    attributes: Record<string, string | Array<string> | null>,
): Promise<void> => {
    const client = await getKeycloakClient();
    const group = await client.groups.findOne({ id: groupId });

    if (group === undefined) {
        throw new Error('Group not found');
    }

    const changed = Object.fromEntries(
        Object.entries(attributes).map(([key, value]) => {
            const values = value === null ? [] : Array.isArray(value) ? value : [value];
            return [key, values.length === 0 ? undefined : values];
        }),
    );
    group.attributes = Object.fromEntries(Object.entries({ ...group.attributes, ...changed }).filter(([, value]) => value !== undefined));

    await client.groups.update({ id: groupId, realm: process.env.KEYCLOAK_REALM }, group);
};

export interface KeycloakCreatedGroup {
    id: string;
    memberGroupId: string;
    adminGroupId: string;
}

// Creates /<folder>/<slug> with its member and admin groups. Returns null if the slug is taken.
export const keycloakCreateGroup = async (
    folder: 'kreise' | 'untergruppen',
    slug: string,
    attributes: Record<string, string>,
): Promise<KeycloakCreatedGroup | null> => {
    const client = await getKeycloakClient();
    const parentFolder = (await getParentGroups()).find((group) => group.path === `/${folder}`);

    if (parentFolder === undefined) {
        throw new Error(`Group /${folder} not found`);
    }

    if ((await getSubGroups(parentFolder.id)).some((group) => group.name === slug)) {
        return null;
    }

    const { id } = await client.groups.createChildGroup(
        { id: parentFolder.id },
        { name: slug, attributes: Object.fromEntries(Object.entries(attributes).map(([key, value]) => [key, [value]])) },
    );

    try {
        const memberGroup = await client.groups.createChildGroup({ id }, { name: membersGroupIdentifier });
        const adminGroup = await client.groups.createChildGroup({ id }, { name: adminGroupIdentifier });

        return { id, memberGroupId: memberGroup.id, adminGroupId: adminGroup.id };
    } catch (error: unknown) {
        // A group without member and admin groups can not be managed.
        await client.groups.del({ id });
        throw error;
    }
};
