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
            groupType?: 'koerperschaft' | 'kreis';
            categoryName?: string;
            displayName?: string;
            shortName?: string;
            description?: string;
            wikiLink?: string;
            websiteLink?: string;
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
        },
    };
};

const getSubGroups = async (parentGroupId: string): Promise<Array<AugmentedGroupRepresentation>> => {
    try {
        return (
            await (await getClient()).groups.listSubGroups({ parentId: parentGroupId, briefRepresentation: false, first: 0, max: 9999 })
        )
            .map(augmentGroup)
            .filter((group): group is AugmentedGroupRepresentation => group !== null);
    } catch {
        return [];
    }
};

const getParentGroups = async (): Promise<Array<AugmentedGroupRepresentation>> => {
    try {
        return (await (await getClient()).groups.find({ briefRepresentation: false, first: 0, max: 9999 }))
            .map(augmentGroup)
            .filter((group): group is AugmentedGroupRepresentation => group !== null);
    } catch {
        return [];
    }
};

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
const ignoredSubgroups = ['eingeschränkt', 'erweitert'];
const relevantParentGroups = ['koerperschaften', 'kreise', 'status', 'permission'];

export const getSubGroupsByGroup = async (group: AugmentedGroupRepresentation): Promise<Array<AugmentedGroupRepresentation>> =>
    (await getAllGroupsFlat()).filter(({ path }) => path !== group.path && path.startsWith(group.path));

export const keycloakGetGroupMembers = async (
    group: AugmentedGroupRepresentation,
): Promise<[group: AugmentedGroupRepresentation | null, Array<AugmentedUserRepresentation>]> => {
    const membersGroup = group.path.endsWith(membersGroupIdentifier)
        ? group
        : (await getSubGroupsByGroup(group)).find(({ path }) => path.endsWith(membersGroupIdentifier));

    if (isNil(membersGroup)) {
        return [null, []];
    }

    const groupMembers = await (await getClient()).groups.listMembers({ id: membersGroup.id, first: 0, max: 9999 });

    return [membersGroup, groupMembers.map(augmentUser).filter((user): user is AugmentedUserRepresentation => user !== null)];
};

/*
 * Population Methods.
 */

export const keycloakGetAllGroups = async (): Promise<Map<AugmentedGroupRepresentation, Array<AugmentedGroupRepresentation>>> => {
    const allGroups = await getAllGroupsFlat();

    // ignore everything except for koerperschaft and kreis
    const filteredGroups = allGroups
        .filter((group) => !ignoredSubgroups.some((ignoredSubgroup) => group.path.endsWith(ignoredSubgroup)))
        .filter((group) => relevantParentGroups.some((parentGroup) => group.path.includes(parentGroup)))
        .filter((group) => group.path.split('/').length > 1);

    const parentGroups = filteredGroups.filter((group) => group.path.split('/').length === 3);
    const childrenGroups = filteredGroups.filter((group) => group.path.split('/').length > 3);

    const groupMap = new Map<AugmentedGroupRepresentation, Array<AugmentedGroupRepresentation>>();
    parentGroups.forEach((parent) => {
        const children = childrenGroups.filter((child) => child.path.startsWith(`${parent.path}/`));
        groupMap.set(parent, children);
    });

    console.log(groupMap);

    return groupMap;
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
