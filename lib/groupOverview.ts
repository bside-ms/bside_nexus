import type { Group } from '@/db/schema';
import { KOLLEKTIV_GROUP_ID } from '@/lib/constants';
import type { GroupAdminStatus } from '@/lib/db/groupActions';
import { canViewGroup, getGroupAdminStatus, getGroupById, getGroupMemberCount, isArchivedGroup } from '@/lib/db/groupActions';
import isNotEmptyString from '@/lib/utils/isNotEmptyString';

export interface GroupTreeNode {
    group: Group;
    // Only for subgroups shown without their parent group.
    parent: Group | null;
    subgroups: Array<Group>;
}

export interface GroupOverviewEntry {
    group: Group;
    memberCount: number;
    status: GroupAdminStatus;
    parent: Group | null;
    subgroups: Array<GroupOverviewEntry>;
}

export interface GroupOverview {
    bodies: Array<GroupOverviewEntry>;
    groups: Array<GroupOverviewEntry>;
    archived: Array<GroupOverviewEntry>;
}

const isShownInOverview = (group: Group): boolean => group.id !== KOLLEKTIV_GROUP_ID && !group.path.startsWith('/status/');

const compareNames = (a: string, b: string): number => a.localeCompare(b, 'de', { sensitivity: 'base' });

const getSortName = (node: GroupTreeNode): string =>
    node.parent === null ? node.group.displayName : `${node.parent.displayName} › ${node.group.displayName}`;

// Old subgroups have no category of their own.
export const getCategoryName = (node: GroupTreeNode): string =>
    isNotEmptyString(node.group.categoryName) ? node.group.categoryName : (node.parent?.categoryName ?? '');

// Subgroups go below their parent group if it is in the list, otherwise they are sorted by its name.
export const buildGroupTree = async (groups: Array<Group>, userId: string): Promise<Array<GroupTreeNode>> => {
    const shownGroups = groups.filter(isShownInOverview);
    const shownGroupIds = new Set(shownGroups.map((group) => group.id));
    const isNested = (group: Group): boolean => group.parentGroup !== null && shownGroupIds.has(group.parentGroup);

    const getVisibleParent = async (group: Group): Promise<Group | null> => {
        const parent = group.parentGroup === null ? null : await getGroupById(group.parentGroup);
        return parent !== null && (await canViewGroup(userId, parent)) ? parent : null;
    };

    const nodes = await Promise.all(
        shownGroups
            .filter((group) => !isNested(group))
            .map(async (group): Promise<GroupTreeNode> => ({ group, parent: await getVisibleParent(group), subgroups: [] })),
    );
    const nodesById = new Map(nodes.map((node) => [node.group.id, node]));

    for (const group of shownGroups.filter(isNested)) {
        nodesById.get(group.parentGroup ?? '')?.subgroups.push(group);
    }

    for (const node of nodes) {
        node.subgroups.sort((a, b) => compareNames(a.displayName, b.displayName));
    }

    return nodes.sort((a, b) => compareNames(getSortName(a), getSortName(b)));
};

// Subgroups go to the section of their parent group.
export const buildGroupOverview = async (groups: Array<Group>, userId: string): Promise<GroupOverview> => {
    const toEntry = async (group: Group, parent: Group | null, subgroups: Array<Group>): Promise<GroupOverviewEntry> => {
        const [memberCount, status, subgroupEntries] = await Promise.all([
            getGroupMemberCount(group.id),
            getGroupAdminStatus(userId, group.id),
            Promise.all(subgroups.map((subgroup) => toEntry(subgroup, null, []))),
        ]);
        return { group, memberCount, status, parent, subgroups: subgroupEntries };
    };

    const toEntries = async (list: Array<Group>): Promise<Array<GroupOverviewEntry>> =>
        Promise.all((await buildGroupTree(list, userId)).map((node) => toEntry(node.group, node.parent, node.subgroups)));

    const [entries, archived] = await Promise.all([
        toEntries(groups.filter((group) => !isArchivedGroup(group))),
        toEntries(groups.filter(isArchivedGroup)),
    ]);

    const isBody = (entry: GroupOverviewEntry): boolean => (entry.parent ?? entry.group).groupType === 'koerperschaft';

    return {
        bodies: entries.filter(isBody),
        groups: entries.filter((entry) => !isBody(entry)),
        archived,
    };
};
