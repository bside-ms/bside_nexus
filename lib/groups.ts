import { isEmpty } from 'lodash-es';
import { NextResponse } from 'next/server';
import {
    addAdminToDbGroup,
    addUserToDbGroup,
    getGroupAdminStatus,
    getGroupById,
    isGroupAdmin,
    removeAdminFromDbGroup,
    removeUserFromDbGroup,
    updateDescription,
    updateWebsiteLink,
    updateWikiLink,
} from './db/groupActions';
import getUserSession from '@/lib/auth/getUserSession';
import { writeLogEntry } from '@/lib/db/logActions';
import { keycloakUpdateGroupAttributes } from '@/lib/keycloak/groupActions';
import { keycloakAddUserToGroup, keycloakRemoveUserFromGroup } from '@/lib/keycloak/userActions';

/**
 * Demotes a user from an admin in a group.
 * This function is triggered by the /api/group/demote endpoint.
 * @param userIdToBeDemoted
 * @param groupId
 * @param executingUserId
 * @param ipAddress
 */
export const removeAdminFromGroup = async (
    userIdToBeDemoted: string,
    groupId: string,
    executingUserId: string,
    ipAddress: string,
): Promise<NextResponse> => {
    const idpGroup = await getGroupById(groupId);
    if (idpGroup === null) {
        return NextResponse.json({ error: 'Die Gruppe konnte nicht gefunden werden.' }, { status: 400 });
    }

    const dbGroup = await getGroupById(groupId);
    if (dbGroup === null || dbGroup.adminGroup === null) {
        return NextResponse.json({ error: 'Die Gruppe konnte nicht gefunden werden.' }, { status: 400 });
    }

    const adminStatus = await isGroupAdmin(executingUserId, groupId, true);
    if (!adminStatus) {
        return NextResponse.json({ error: 'Dir fehlen die erforderlichen Rechte um diese Aktion durchzuführen.' }, { status: 403 });
    }

    const userIsMemberOfGroup = await getGroupAdminStatus(userIdToBeDemoted, groupId);
    if (userIsMemberOfGroup !== 'Admin') {
        return NextResponse.json({ error: 'Die Administrator*in konnte nicht entfernt werden.' }, { status: 400 });
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
    const idpGroup = await getGroupById(groupId);
    if (idpGroup === null) {
        return NextResponse.json({ error: 'Die Gruppe konnte nicht gefunden werden.' }, { status: 400 });
    }

    const dbGroup = await getGroupById(groupId);
    if (dbGroup === null || dbGroup.adminGroup === null) {
        return NextResponse.json({ error: 'Die Gruppe konnte nicht gefunden werden.' }, { status: 400 });
    }

    const adminStatus = await isGroupAdmin(executingUserId, groupId, true);
    if (!adminStatus) {
        return NextResponse.json({ error: 'Dir fehlen die erforderlichen Rechte um diese Aktion durchzuführen.' }, { status: 403 });
    }

    const userIsMemberOfGroup = await getGroupAdminStatus(userIdToBePromoted, groupId);
    if (userIsMemberOfGroup !== 'Member') {
        return NextResponse.json({ error: 'Die Benutzer*in kann nicht zur Administrator*innen ernannt werden.' }, { status: 400 });
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
 * Adds a user from a group.
 * This function is triggered by the /api/group/add endpoint.
 * @param userIdToBeAdded
 * @param groupId
 * @param executingUserId
 * @param ipAddress
 */
export const addUserToGroup = async (
    userIdToBeAdded: string,
    groupId: string,
    executingUserId: string,
    ipAddress: string,
): Promise<NextResponse> => {
    const idpGroup = await getGroupById(groupId);
    if (idpGroup === null) {
        return NextResponse.json({ error: 'Die Gruppe konnte nicht gefunden werden.' }, { status: 400 });
    }

    const dbGroup = await getGroupById(groupId);
    if (dbGroup === null || dbGroup.memberGroup === null) {
        return NextResponse.json({ error: 'Die Gruppe konnte nicht gefunden werden.' }, { status: 400 });
    }

    const adminStatus = await isGroupAdmin(executingUserId, groupId, true);
    if (!adminStatus) {
        return NextResponse.json({ error: 'Dir fehlen die erforderlichen Rechte um diese Aktion durchzuführen.' }, { status: 403 });
    }

    const userIsMemberOfGroup = await getGroupAdminStatus(userIdToBeAdded, groupId);
    if (userIsMemberOfGroup !== 'None') {
        return NextResponse.json({ error: 'Die Benutzer*in ist bereits Mitglied dieser Gruppe.' }, { status: 400 });
    }

    await keycloakAddUserToGroup(userIdToBeAdded, dbGroup.memberGroup);
    await addUserToDbGroup(userIdToBeAdded, dbGroup.id);

    // ToDo: Force a refresh in our other tools.

    await writeLogEntry({
        userId: executingUserId,
        ipAddress,
        eventType: 'group.add',
        affectedUserId: userIdToBeAdded,
        affectedGroupId: groupId,
        description: 'Als Mitglied der Gruppe hinzugefügt.',
    });

    return NextResponse.json({ success: true });
};

/**
 * Removes a user from a group.
 * This function is triggered by the /api/group/remove endpoint.
 * @param userIdToBeRemoved
 * @param groupId
 * @param executingUserId
 * @param ipAddress
 */
export const removeUserFromGroup = async (
    userIdToBeRemoved: string,
    groupId: string,
    executingUserId: string,
    ipAddress: string,
): Promise<NextResponse> => {
    const idpGroup = await getGroupById(groupId);
    if (idpGroup === null) {
        return NextResponse.json({ error: 'Die Gruppe konnte nicht gefunden werden.' }, { status: 400 });
    }

    const dbGroup = await getGroupById(groupId);
    if (dbGroup === null) {
        return NextResponse.json({ error: 'Die Gruppe konnte nicht gefunden werden.' }, { status: 400 });
    }

    const adminStatus = await isGroupAdmin(executingUserId, groupId, true);
    if (!adminStatus) {
        return NextResponse.json({ error: 'Dir fehlen die erforderlichen Rechte um diese Aktion durchzuführen.' }, { status: 403 });
    }

    const userIsMemberOfGroup = await getGroupAdminStatus(userIdToBeRemoved, groupId);
    if (userIsMemberOfGroup === 'None') {
        return NextResponse.json({ error: 'Die Benutzer*in ist nicht Teil dieser Gruppe.' }, { status: 400 });
    }

    if (userIsMemberOfGroup === 'Admin' && dbGroup.adminGroup !== null) {
        await keycloakRemoveUserFromGroup(userIdToBeRemoved, dbGroup.adminGroup);
        await removeUserFromDbGroup(userIdToBeRemoved, dbGroup.id);
    }

    if (userIsMemberOfGroup === 'Member' && dbGroup.memberGroup !== null) {
        await keycloakRemoveUserFromGroup(userIdToBeRemoved, dbGroup.memberGroup);
        await removeUserFromDbGroup(userIdToBeRemoved, dbGroup.id);
    }

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

    const dbGroup = await getGroupById(groupId);
    if (dbGroup === null) {
        return NextResponse.json({ error: 'Die Gruppe konnte nicht gefunden werden.' }, { status: 400 });
    }

    const adminStatus = await isGroupAdmin(executingUserId, groupId, true);
    if (!adminStatus) {
        return NextResponse.json({ error: 'Dir fehlen die erforderlichen Rechte um diese Aktion durchzuführen.' }, { status: 403 });
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

export const hiddenSubGroups = ['01320ea0-c06e-4c7d-be5a-14a556209f2a', 'cf8e85a7-f828-4ae0-87d6-67a4959dcf83'];
