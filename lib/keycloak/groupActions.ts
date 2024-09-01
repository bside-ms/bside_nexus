import type GroupRepresentation from '@keycloak/keycloak-admin-client/lib/defs/groupRepresentation';
import { isNil, upperFirst } from 'lodash-es';
import getUserSession from '@/lib/auth/getUserSession';
import getClient from '@/lib/keycloak/getClient';
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
            displayName: Array.isArray(group.attributes?.display_name) ? group.attributes.display_name[0] : undefined,
            shortName: Array.isArray(group.attributes?.short_name) ? group.attributes.short_name[0] : undefined,
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

export const getGroupName = (group: AugmentedGroupRepresentation): string =>
    group.attributes?.displayName ?? group.attributes?.shortName ?? upperFirst(group.name);

export const getGroupById = async (groupId: string): Promise<AugmentedGroupRepresentation | null> => {
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

export const getGroupsByPaths = async (groupPaths: Array<string>): Promise<Array<AugmentedGroupRepresentation>> => {
    const allGroups = await getAllGroupsFlat();

    return groupPaths
        .map((groupPath) => allGroups.find(({ path }) => path === groupPath))
        .filter((group): group is AugmentedGroupRepresentation => !isNil(group));
};

const membersGroupIdentifier = 'mitglieder';

export const getUserGroups = async (): Promise<Array<AugmentedGroupRepresentation>> => {
    const keycloakGroupPaths = (await getUserSession())?.keycloakGroups ?? [];

    return getGroupsByPaths(
        keycloakGroupPaths
            .filter((path) => path.endsWith(membersGroupIdentifier))
            .map((path) => path.replace(`/${membersGroupIdentifier}`, '')),
    );
};

export const sortGroups = (groups: Array<AugmentedGroupRepresentation>): Array<AugmentedGroupRepresentation> =>
    groups.toSorted((groupA, groupB) => getGroupName(groupA).localeCompare(getGroupName(groupB)));

export const getSubGroupsByGroup = async (group: AugmentedGroupRepresentation): Promise<Array<AugmentedGroupRepresentation>> =>
    (await getAllGroupsFlat()).filter(({ path }) => path !== group.path && path.startsWith(group.path));

export const getGroupMembers = async (
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
