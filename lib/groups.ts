import { isEmpty } from 'lodash-es';
import { NextResponse } from 'next/server';
import type { Group } from '@/db/schema';
import getUserSession from '@/lib/auth/getUserSession';
import {
    addAdminToDbGroup,
    addUserToDbGroup,
    canManageGroup,
    countOtherActiveGroupAdmins,
    getGroupAdminStatus,
    getGroupById,
    isGlobalAdmin,
    removeAdminFromDbGroup,
    removeUserFromDbGroup,
    updateDescription,
    updateWebsiteLink,
    updateWikiLink,
} from '@/lib/db/groupActions';
import { writeLogEntry } from '@/lib/db/logActions';
import { getPossibleGroupMembers } from '@/lib/db/userActions';
import { keycloakUpdateGroupAttributes } from '@/lib/keycloak/groupActions';
import { keycloakAddUserToGroup, keycloakRemoveUserFromGroup } from '@/lib/keycloak/userActions';

// Returns the group, or the error response if the user may not manage it.
const getManageableGroup = async (groupId: string, executingUserId: string): Promise<Group | NextResponse> => {
    const group = await getGroupById(groupId);
    if (group === null) {
        return NextResponse.json({ error: 'Die Gruppe konnte nicht gefunden werden.' }, { status: 400 });
    }

    if (!(await canManageGroup(executingUserId, group))) {
        return NextResponse.json({ error: 'Dir fehlen die erforderlichen Rechte, um diese Aktion durchzuführen.' }, { status: 403 });
    }

    return group;
};

/**
 * A group must keep at least one active admin, unless parentAdminsManage is set.
 * System admins can, but only with allowWithoutAdmin, which the UI sends after an extra warning.
 * Returns the error response, or null if the change is allowed.
 */
const checkRemainingAdmins = async (
    userIdToLoseAdmin: string,
    group: Group,
    executingUserId: string,
    allowWithoutAdmin: boolean,
): Promise<NextResponse | null> => {
    if (group.parentAdminsManage || (await countOtherActiveGroupAdmins(group.id, userIdToLoseAdmin)) > 0) {
        return null;
    }

    if (allowWithoutAdmin && isGlobalAdmin(executingUserId)) {
        return null;
    }

    return NextResponse.json(
        {
            error: 'Die Gruppe braucht mindestens eine Administrator*in. Ernenne zuerst eine weitere Person zur Administrator*in.',
            code: 'LAST_ADMIN',
        },
        { status: 409 },
    );
};

/**
 * Demotes a user from an admin in a group.
 * This function is triggered by the /api/group/demote endpoint.
 * @param userIdToBeDemoted
 * @param groupId
 * @param executingUserId
 * @param ipAddress
 * @param allowWithoutAdmin only for system admins: allows demoting the last admin
 */
export const removeAdminFromGroup = async (
    userIdToBeDemoted: string,
    groupId: string,
    executingUserId: string,
    ipAddress: string,
    allowWithoutAdmin: boolean = false,
): Promise<NextResponse> => {
    const dbGroup = await getManageableGroup(groupId, executingUserId);
    if (dbGroup instanceof NextResponse) {
        return dbGroup;
    }

    if (dbGroup.adminGroup === null) {
        return NextResponse.json({ error: 'Die Gruppe hat keine Administrator*innen-Gruppe.' }, { status: 400 });
    }

    const userIsMemberOfGroup = await getGroupAdminStatus(userIdToBeDemoted, groupId);
    if (userIsMemberOfGroup !== 'Admin') {
        return NextResponse.json({ error: 'Die Administrator*in konnte nicht entfernt werden.' }, { status: 400 });
    }

    const remainingAdminsError = await checkRemainingAdmins(userIdToBeDemoted, dbGroup, executingUserId, allowWithoutAdmin);
    if (remainingAdminsError !== null) {
        return remainingAdminsError;
    }

    await keycloakRemoveUserFromGroup(userIdToBeDemoted, dbGroup.adminGroup);
    await removeAdminFromDbGroup(userIdToBeDemoted, dbGroup.id);

    // ToDo: Force a refresh in our other tools.

    await writeLogEntry({
        userId: executingUserId,
        ipAddress,
        eventType: 'group.demote',
        affectedUserId: userIdToBeDemoted,
        affectedGroupId: groupId,
        description: 'Als Administrator*in der Gruppe entfernt.',
    });

    return NextResponse.json({ success: true });
};

/**
 * Promotes a user to an admin in a group.
 * This function is triggered by the /api/group/promote endpoint.
 * @param userIdToBePromoted
 * @param groupId
 * @param executingUserId
 * @param ipAddress
 */
export const addAdminToGroup = async (
    userIdToBePromoted: string,
    groupId: string,
    executingUserId: string,
    ipAddress: string,
): Promise<NextResponse> => {
    const dbGroup = await getManageableGroup(groupId, executingUserId);
    if (dbGroup instanceof NextResponse) {
        return dbGroup;
    }

    if (dbGroup.adminGroup === null) {
        return NextResponse.json({ error: 'Die Gruppe hat keine Administrator*innen-Gruppe.' }, { status: 400 });
    }

    const userIsMemberOfGroup = await getGroupAdminStatus(userIdToBePromoted, groupId);
    if (userIsMemberOfGroup !== 'Member') {
        return NextResponse.json({ error: 'Die Benutzer*in kann nicht zur Administrator*in ernannt werden.' }, { status: 400 });
    }

    await keycloakAddUserToGroup(userIdToBePromoted, dbGroup.adminGroup);
    await addAdminToDbGroup(userIdToBePromoted, dbGroup.id);

    // ToDo: Force a refresh in our other tools.

    await writeLogEntry({
        userId: executingUserId,
        ipAddress,
        eventType: 'group.promote',
        affectedUserId: userIdToBePromoted,
        affectedGroupId: groupId,
        description: 'Als Administrator*in der Gruppe hinzugefügt.',
    });

    return NextResponse.json({ success: true });
};

/**
 * Adds users to a group as members.
 * This function is triggered by the /api/group/add endpoint.
 *
 * @param userIdsToBeAdded
 * @param groupId
 * @param executingUserId
 * @param ipAddress
 */
export const addUsersToGroup = async (
    userIdsToBeAdded: Array<string>,
    groupId: string,
    executingUserId: string,
    ipAddress: string,
): Promise<NextResponse> => {
    const dbGroup = await getManageableGroup(groupId, executingUserId);
    if (dbGroup instanceof NextResponse) {
        return dbGroup;
    }

    if (dbGroup.memberGroup === null) {
        return NextResponse.json({ error: 'Die Mitgliedschaft in dieser Gruppe kann hier nicht geändert werden.' }, { status: 400 });
    }

    const possibleMemberIds = new Set((await getPossibleGroupMembers(groupId)).map((user) => user.id));
    const userIds = [...new Set(userIdsToBeAdded)].filter((userId) => possibleMemberIds.has(userId));
    if (userIds.length === 0) {
        return NextResponse.json(
            { error: 'Die ausgewählten Personen sind bereits Mitglied oder können nicht hinzugefügt werden.' },
            { status: 400 },
        );
    }

    const addedUserIds: Array<string> = [];
    for (const userId of userIds) {
        try {
            await keycloakAddUserToGroup(userId, dbGroup.memberGroup);
            await addUserToDbGroup(userId, dbGroup.id);
            addedUserIds.push(userId);

            // ToDo: Force a refresh in our other tools.

            await writeLogEntry({
                userId: executingUserId,
                ipAddress,
                eventType: 'group.add',
                affectedUserId: userId,
                affectedGroupId: groupId,
                description: 'Als Mitglied der Gruppe hinzugefügt.',
            });
        } catch (error: unknown) {
            // Do not pass the message on, it can contain internals from Keycloak or the database.
            // eslint-disable-next-line no-console
            console.error('[addUsersToGroup]', error);
            return NextResponse.json(
                {
                    error:
                        addedUserIds.length === 0
                            ? 'Die Personen konnten nicht hinzugefügt werden.'
                            : `Es wurden nur ${addedUserIds.length} von ${userIds.length} Personen hinzugefügt. Versuche es für die übrigen erneut.`,
                    addedUserIds,
                },
                { status: 500 },
            );
        }
    }

    return NextResponse.json({ success: true, addedUserIds });
};

/**
 * Removes a user from a group.
 * This function is triggered by the /api/group/remove endpoint.
 * @param userIdToBeRemoved
 * @param groupId
 * @param executingUserId
 * @param ipAddress
 * @param allowWithoutAdmin only for system admins: allows removing the last admin
 */
export const removeUserFromGroup = async (
    userIdToBeRemoved: string,
    groupId: string,
    executingUserId: string,
    ipAddress: string,
    allowWithoutAdmin: boolean = false,
): Promise<NextResponse> => {
    const dbGroup = await getManageableGroup(groupId, executingUserId);
    if (dbGroup instanceof NextResponse) {
        return dbGroup;
    }

    const userIsMemberOfGroup = await getGroupAdminStatus(userIdToBeRemoved, groupId);
    if (userIsMemberOfGroup === 'None') {
        return NextResponse.json({ error: 'Die Benutzer*in ist nicht Teil dieser Gruppe.' }, { status: 400 });
    }

    if (userIsMemberOfGroup === 'Admin') {
        const remainingAdminsError = await checkRemainingAdmins(userIdToBeRemoved, dbGroup, executingUserId, allowWithoutAdmin);
        if (remainingAdminsError !== null) {
            return remainingAdminsError;
        }
    }

    // Without a member subgroup, Keycloak can not be changed from here.
    if (dbGroup.memberGroup === null) {
        return NextResponse.json({ error: 'Die Mitgliedschaft in dieser Gruppe kann hier nicht geändert werden.' }, { status: 400 });
    }

    // Admins are usually in both subgroups in Keycloak. Remove them from both.
    if (userIsMemberOfGroup === 'Admin' && dbGroup.adminGroup !== null) {
        await keycloakRemoveUserFromGroup(userIdToBeRemoved, dbGroup.adminGroup);
    }
    await keycloakRemoveUserFromGroup(userIdToBeRemoved, dbGroup.memberGroup);
    await removeUserFromDbGroup(userIdToBeRemoved, dbGroup.id);

    // ToDo: Force a refresh in our other tools.

    await writeLogEntry({
        userId: executingUserId,
        ipAddress,
        eventType: 'group.remove',
        affectedUserId: userIdToBeRemoved,
        affectedGroupId: groupId,
        description: 'Als Mitglied der Gruppe entfernt.',
    });

    return NextResponse.json({ success: true });
};

/**
 * Updates the group description.
 * This function is triggered by the /api/group/details endpoint.
 * @param groupId
 * @param executingUserId
 * @param ipAddress
 * @param description
 * @param wikiLink
 * @param websiteLink
 */
export const updateGroupDescription = async (
    groupId: string,
    executingUserId: string,
    ipAddress: string,
    description?: string,
    wikiLink?: string,
    websiteLink?: string,
): Promise<NextResponse> => {
    const user = await getUserSession();
    if (user === null) {
        return NextResponse.json({ error: 'Du bist nicht eingeloggt.' }, { status: 401 });
    }

    const userId = user.id;
    if (isEmpty(userId)) {
        return NextResponse.json({ error: 'Die eingeloggte Benutzer*in konnte nicht identifiziert werden.' }, { status: 400 });
    }

    const dbGroup = await getManageableGroup(groupId, executingUserId);
    if (dbGroup instanceof NextResponse) {
        return dbGroup;
    }

    const currentDescription = isEmpty(dbGroup.description) ? undefined : dbGroup.description;
    if (currentDescription !== description) {
        await keycloakUpdateGroupAttributes({ groupId, description: description ?? '' });
        await updateDescription(groupId, description);
        await writeLogEntry({
            userId: executingUserId,
            ipAddress,
            eventType: 'group.details.description',
            affectedUserId: null,
            affectedGroupId: groupId,
            description: `Gruppenbeschreibung zu "${description}" geändert. Vorher: "${currentDescription}"`,
        });
    }

    const currentWebsiteLink = isEmpty(dbGroup.websiteLink) ? undefined : dbGroup.websiteLink;
    if (currentWebsiteLink !== websiteLink) {
        await keycloakUpdateGroupAttributes({ groupId, websiteLink: websiteLink ?? '' });
        await updateWebsiteLink(groupId, websiteLink);
        await writeLogEntry({
            userId: executingUserId,
            ipAddress,
            eventType: 'group.details.websiteLink',
            affectedUserId: null,
            affectedGroupId: groupId,
            description: `Webseite zu "${websiteLink}" geändert. Vorher: "${currentWebsiteLink}"`,
        });
    }

    const currentWikiLink = isEmpty(dbGroup.wikiLink) ? undefined : dbGroup.wikiLink;
    if (currentWikiLink !== wikiLink) {
        await keycloakUpdateGroupAttributes({ groupId, wikiLink: wikiLink ?? '' });
        await updateWikiLink(groupId, wikiLink);
        await writeLogEntry({
            userId: executingUserId,
            ipAddress,
            eventType: 'group.details.wikiLink',
            affectedUserId: null,
            affectedGroupId: groupId,
            description: `Wiki-Link zu "${wikiLink}" geändert. Vorher: "${currentWikiLink}"`,
        });
    }

    return NextResponse.json({ success: true });
};

export const isKollektivMitglied = async (): Promise<boolean> => {
    const user = await getUserSession();
    return user?.members?.includes('/koerperschaften/kollektiv/mitglieder') === true;
};
