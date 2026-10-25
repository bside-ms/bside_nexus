import { NextResponse } from 'next/server';
import type { z } from 'zod';
import type { Group } from '@/db/schema';
import { getGroupById, getSubgroups, insertGroup, isArchivedGroup, updateGroupSettings } from '@/lib/db/groupActions';
import { writeLogEntry } from '@/lib/db/logActions';
import { syncIncludedGroupRoles } from '@/lib/groupRoles';
import { keycloakCreateGroup, keycloakGetGroupById, keycloakSetGroupAttributes } from '@/lib/keycloak/groupActions';
import isEmptyString from '@/lib/utils/isEmptyString';
import slugifyGroupName from '@/lib/utils/slugifyGroupName';
import type { groupArchiveSchema, groupCreateSchema, groupSettingsSchema, subgroupCreateSchema } from '@/lib/validation/groupSchemas';

// Only for system admins, the routes check the role.

const getGroupOrError = async (groupId: string): Promise<Group | NextResponse> =>
    (await getGroupById(groupId)) ?? NextResponse.json({ error: 'Die Gruppe konnte nicht gefunden werden.' }, { status: 400 });

const getSlugOrError = (displayName: string): string | NextResponse => {
    const slug = slugifyGroupName(displayName);
    return isEmptyString(slug) ? NextResponse.json({ error: 'Der Name muss Buchstaben oder Ziffern enthalten.' }, { status: 400 }) : slug;
};

const slugTakenError = (path: string): NextResponse =>
    NextResponse.json({ error: `Es gibt bereits eine Gruppe ${path}. Wähle einen anderen Namen.` }, { status: 409 });

/**
 * Creates a group below /kreise.
 * This function is triggered by the /api/group/create endpoint.
 */
export const createGroup = async (
    { displayName, categoryName, groupType, hidden }: z.infer<typeof groupCreateSchema>,
    executingUserId: string,
    ipAddress: string,
): Promise<NextResponse> => {
    const slug = getSlugOrError(displayName);
    if (slug instanceof NextResponse) {
        return slug;
    }

    const path = `/kreise/${slug}`;
    const created = await keycloakCreateGroup('kreise', slug, {
        display_name: displayName,
        category_name: categoryName,
        group_type: groupType,
        ...(hidden ? { visibility: 'hidden' } : {}),
    });
    if (created === null) {
        return slugTakenError(path);
    }

    await insertGroup({
        id: created.id,
        name: slug,
        path,
        groupType,
        categoryName,
        displayName,
        memberGroup: created.memberGroupId,
        adminGroup: created.adminGroupId,
        parentGroup: null,
        parentAdminsManage: false,
        hidden,
        status: 'active',
    });

    await writeLogEntry({
        userId: executingUserId,
        ipAddress,
        eventType: 'group.create',
        affectedUserId: null,
        affectedGroupId: created.id,
        description: `Gruppe "${displayName}" (${path}) in der Kategorie "${categoryName}" erstellt.`,
    });

    return NextResponse.json({ success: true, groupId: created.id }, { status: 201 });
};

/**
 * Creates a subgroup below /untergruppen. The parent must not be a subgroup itself.
 * This function is triggered by the /api/group/create-subgroup endpoint.
 */
export const createSubgroup = async (
    { parentGroupId, displayName, groupType, hidden, parentAdminsManage }: z.infer<typeof subgroupCreateSchema>,
    executingUserId: string,
    ipAddress: string,
): Promise<NextResponse> => {
    const parent = await getGroupOrError(parentGroupId);
    if (parent instanceof NextResponse) {
        return parent;
    }

    if (parent.parentGroup !== null) {
        return NextResponse.json({ error: 'Untergruppen können keine eigenen Untergruppen haben.' }, { status: 400 });
    }

    if (isArchivedGroup(parent)) {
        return NextResponse.json({ error: 'Archivierte Gruppen können keine neuen Untergruppen bekommen.' }, { status: 400 });
    }

    const slug = getSlugOrError(displayName);
    if (slug instanceof NextResponse) {
        return slug;
    }

    const path = `/untergruppen/${slug}`;
    const created = await keycloakCreateGroup('untergruppen', slug, {
        display_name: displayName,
        group_type: groupType,
        parent_group_id: parentGroupId,
        parent_admins_manage: String(parentAdminsManage),
        ...(hidden ? { visibility: 'hidden' } : {}),
    });
    if (created === null) {
        return slugTakenError(path);
    }

    await insertGroup({
        id: created.id,
        name: slug,
        path,
        groupType,
        // Subgroups show the category of their parent.
        categoryName: '',
        displayName,
        memberGroup: created.memberGroupId,
        adminGroup: created.adminGroupId,
        parentGroup: parentGroupId,
        parentAdminsManage,
        hidden,
        status: 'active',
    });

    await writeLogEntry({
        userId: executingUserId,
        ipAddress,
        eventType: 'group.create',
        affectedUserId: null,
        affectedGroupId: created.id,
        description: `Untergruppe "${displayName}" (${path}) von "${parent.displayName}" erstellt.`,
    });

    return NextResponse.json({ success: true, groupId: created.id }, { status: 201 });
};

/**
 * Saves the settings of the system-settings dialog.
 * The Keycloak name and path stay, other tools rely on them.
 * This function is triggered by the /api/group/settings endpoint.
 */
export const changeGroupSettings = async (
    {
        groupId,
        displayName,
        categoryName,
        includedGroupIds,
        removeRolesFromRemovedGroups,
        hidden,
        parentAdminsManage,
    }: z.infer<typeof groupSettingsSchema>,
    executingUserId: string,
    ipAddress: string,
): Promise<NextResponse> => {
    const group = await getGroupOrError(groupId);
    if (group instanceof NextResponse) {
        return group;
    }

    if (group.parentGroup === null && parentAdminsManage) {
        return NextResponse.json({ error: 'Nur Untergruppen können von den Admins der Obergruppe verwaltet werden.' }, { status: 400 });
    }

    if (group.parentGroup !== null && categoryName !== undefined) {
        return NextResponse.json({ error: 'Untergruppen übernehmen die Kategorie ihrer Obergruppe.' }, { status: 400 });
    }

    const newCategoryName = categoryName ?? group.categoryName;

    const includedGroups: Array<Group> = [];
    for (const includedGroupId of new Set(includedGroupIds)) {
        const includedGroup = await getGroupById(includedGroupId);
        if (includedGroup === null || includedGroup.id === groupId) {
            return NextResponse.json({ error: 'Eine der eingeschlossenen Gruppen ist ungültig.' }, { status: 400 });
        }
        includedGroups.push(includedGroup);
    }
    const newIncludedGroupIds = includedGroups.map((includedGroup) => includedGroup.id);
    const addedGroups = includedGroups.filter((includedGroup) => !group.includedGroups.includes(includedGroup.id));
    const removedGroups = (
        await Promise.all(group.includedGroups.filter((id) => !newIncludedGroupIds.includes(id)).map(getGroupById))
    ).filter((removedGroup): removedGroup is Group => removedGroup !== null);

    const changes: Array<{ eventType: string; description: string }> = [];
    if (group.displayName !== displayName) {
        changes.push({
            eventType: 'group.settings.displayName',
            description: `Anzeigename zu "${displayName}" geändert. Vorher: "${group.displayName}"`,
        });
    }

    if (group.categoryName !== newCategoryName) {
        changes.push({
            eventType: 'group.settings.categoryName',
            description: `Kategorie zu "${newCategoryName}" geändert. Vorher: "${group.categoryName}"`,
        });
    }

    if ([...group.includedGroups].sort().join() !== [...newIncludedGroupIds].sort().join()) {
        const names = includedGroups.map((includedGroup) => `"${includedGroup.displayName}"`).join(', ');
        changes.push({
            eventType: 'group.settings.includedGroups',
            description: includedGroups.length === 0 ? 'Keine Gruppen mehr eingeschlossen.' : `Eingeschlossene Gruppen: ${names}.`,
        });
    }

    if (group.hidden !== hidden) {
        changes.push({
            eventType: 'group.settings.visibility',
            description: hidden ? 'Gruppe versteckt.' : 'Gruppe sichtbar gemacht.',
        });
    }

    if (group.parentAdminsManage !== parentAdminsManage) {
        changes.push({
            eventType: 'group.settings.parentAdminsManage',
            description: parentAdminsManage
                ? 'Die Admins der Obergruppe dürfen die Gruppe verwalten.'
                : 'Die Admins der Obergruppe dürfen die Gruppe nicht mehr verwalten.',
        });
    }

    if (changes.length === 0) {
        return NextResponse.json({ success: true });
    }

    await keycloakSetGroupAttributes(groupId, {
        display_name: displayName,
        ...(group.parentGroup === null ? { category_name: isEmptyString(newCategoryName) ? null : newCategoryName } : {}),
        included_group_ids: newIncludedGroupIds,
        visibility: hidden ? 'hidden' : null,
        ...(group.parentGroup === null ? {} : { parent_admins_manage: String(parentAdminsManage) }),
    });
    await updateGroupSettings(groupId, {
        displayName,
        categoryName: newCategoryName,
        includedGroups: newIncludedGroupIds,
        hidden,
        parentAdminsManage,
    });

    for (const change of changes) {
        await writeLogEntry({ userId: executingUserId, ipAddress, affectedUserId: null, affectedGroupId: groupId, ...change });
    }

    // Members of included groups get the rights of this group.
    await syncIncludedGroupRoles(group, addedGroups, 'add', executingUserId, ipAddress);
    if (removeRolesFromRemovedGroups) {
        await syncIncludedGroupRoles(group, removedGroups, 'remove', executingUserId, ipAddress);
    }

    return NextResponse.json({ success: true });
};

/**
 * Archives or restores a group. Subgroups inherit the status of their parent, like in the sync.
 * This function is triggered by the /api/group/archive endpoint.
 */
export const setGroupArchived = async (
    { groupId, archived }: z.infer<typeof groupArchiveSchema>,
    executingUserId: string,
    ipAddress: string,
): Promise<NextResponse> => {
    const group = await getGroupOrError(groupId);
    if (group instanceof NextResponse) {
        return group;
    }

    const parent = group.parentGroup === null ? null : await getGroupById(group.parentGroup);
    if (!archived && parent !== null && isArchivedGroup(parent)) {
        return NextResponse.json(
            { error: `Die Obergruppe "${parent.displayName}" ist archiviert. Stelle zuerst sie wieder her.` },
            { status: 400 },
        );
    }

    await keycloakSetGroupAttributes(groupId, { status: archived ? 'archived' : null });
    await updateGroupSettings(groupId, { status: archived ? 'archived' : 'active' });

    // On restore, subgroups that were archived on their own stay archived.
    for (const subgroup of await getSubgroups(groupId)) {
        const ownStatus = archived ? undefined : (await keycloakGetGroupById(subgroup.id))?.attributes.status;
        await updateGroupSettings(subgroup.id, { status: archived || ownStatus === 'archived' ? 'archived' : 'active' });
    }

    await writeLogEntry({
        userId: executingUserId,
        ipAddress,
        eventType: archived ? 'group.archive' : 'group.restore',
        affectedUserId: null,
        affectedGroupId: groupId,
        description: archived ? 'Gruppe archiviert.' : 'Gruppe wiederhergestellt.',
    });

    return NextResponse.json({ success: true });
};
