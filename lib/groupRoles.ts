import { NextResponse } from 'next/server';
import type { z } from 'zod';
import type { Group } from '@/db/schema';
import type { GroupRoleClient } from '@/lib/constants';
import { GROUP_ROLE_CLIENTS, GROUP_ROLE_CREATABLE_CLIENTS } from '@/lib/constants';
import { getGroupById, getIncludedGroups } from '@/lib/db/groupActions';
import { writeLogEntry } from '@/lib/db/logActions';
import { keycloakGetDirectMembers } from '@/lib/keycloak/groupActions';
import type { KeycloakClientRole } from '@/lib/keycloak/roleActions';
import {
    keycloakAddGroupClientRole,
    keycloakCreateClientRole,
    keycloakListClientRoleNames,
    keycloakListGroupClientRoleNames,
    keycloakListGroupClientRoles,
    keycloakRemoveGroupClientRole,
} from '@/lib/keycloak/roleActions';
import type { groupRoleAddSchema, GroupRoleLocation, groupRoleMoveSchema, groupRoleRemoveSchema } from '@/lib/validation/groupSchemas';
import { newRoleNamePattern } from '@/lib/validation/groupSchemas';

// Roles are not mirrored in the DB, Keycloak is the only source.

export interface GroupRole {
    clientId: GroupRoleClient;
    roleName: string;
    location: GroupRoleLocation;
}

export interface GroupRolesResponse {
    roles: Array<GroupRole>;
}

// Only the dialog needs these.
export interface GroupRoleOptionsResponse extends GroupRolesResponse {
    // All roles per client, for the selection in the dialog.
    availableRoles: Record<GroupRoleClient, Array<string>>;
    creatableClients: ReadonlyArray<GroupRoleClient>;
    // Admins who would lose roles that are moved away from the admin group.
    adminsWithoutMembership: Array<string>;
    // They get the member roles too.
    includedGroupNames: Array<string>;
}

const locationLabels: Record<GroupRoleLocation, string> = {
    members: 'der Mitgliedsgruppe',
    group: 'der Gruppe selbst',
    admin: 'der Admin-Gruppe',
};

const isGroupRoleClient = (clientId: string): clientId is GroupRoleClient =>
    (GROUP_ROLE_CLIENTS as ReadonlyArray<string>).includes(clientId);

type ManageableGroup = Group & { memberGroup: string };

const getGroupOrError = async (groupId: string): Promise<ManageableGroup | NextResponse> => {
    const group = await getGroupById(groupId);
    if (group === null) {
        return NextResponse.json({ error: 'Die Gruppe konnte nicht gefunden werden.' }, { status: 400 });
    }

    if (group.memberGroup === null) {
        return NextResponse.json({ error: 'Die Gruppe hat keine Mitgliedsgruppe in Keycloak.' }, { status: 400 });
    }

    return { ...group, memberGroup: group.memberGroup };
};

const getKeycloakGroupId = (group: ManageableGroup, location: GroupRoleLocation): string | null => {
    switch (location) {
        case 'members':
            return group.memberGroup;
        case 'group':
            return group.id;
        case 'admin':
            return group.adminGroup;
    }
};

/**
 * Gives the member roles of a group to its included groups, or takes them away again.
 *
 * @param group
 * @param includedGroups
 * @param mode
 * @param executingUserId
 * @param ipAddress
 * @param roles only these roles, all member roles of the group if left out
 */
export const syncIncludedGroupRoles = async (
    group: Group,
    includedGroups: Array<Group>,
    mode: 'add' | 'remove',
    executingUserId: string,
    ipAddress: string,
    roles?: Array<KeycloakClientRole>,
): Promise<void> => {
    if (group.memberGroup === null) {
        return;
    }

    const rolesToSync = roles ?? (await keycloakListGroupClientRoles(group.memberGroup)).filter((role) => isGroupRoleClient(role.clientId));

    for (const includedGroup of includedGroups) {
        if (includedGroup.memberGroup === null) {
            continue;
        }

        const ownRoles = new Set(
            (await keycloakListGroupClientRoles(includedGroup.memberGroup)).map((role) => `${role.clientId}:${role.roleName}`),
        );
        for (const { clientId, roleName } of rolesToSync) {
            // Skip roles that are already as wanted, so the log only shows real changes.
            if (ownRoles.has(`${clientId}:${roleName}`) === (mode === 'add')) {
                continue;
            }

            if (mode === 'add') {
                await keycloakAddGroupClientRole(includedGroup.memberGroup, clientId, roleName);
            } else {
                await keycloakRemoveGroupClientRole(includedGroup.memberGroup, clientId, roleName);
            }

            await writeLogEntry({
                userId: executingUserId,
                ipAddress,
                eventType: mode === 'add' ? 'group.role.add' : 'group.role.remove',
                affectedUserId: null,
                affectedGroupId: includedGroup.id,
                description:
                    mode === 'add'
                        ? `Rolle ${clientId}:${roleName} vergeben, weil die Gruppe in "${group.displayName}" eingeschlossen ist.`
                        : `Rolle ${clientId}:${roleName} entfernt, weil die Gruppe sie über "${group.displayName}" hatte.`,
            });
        }
    }
};

/**
 * Lists the roles of the member group, plus old mappings on the group itself or its admin group.
 * This function is triggered by the /api/group/roles endpoint.
 *
 * @param groupId
 * @param withOptions adds what the dialog needs to add and move roles
 */
export const getGroupRoles = async (groupId: string, withOptions: boolean): Promise<NextResponse> => {
    const group = await getGroupOrError(groupId);
    if (group instanceof NextResponse) {
        return group;
    }

    const locations: Array<GroupRoleLocation> = group.adminGroup === null ? ['members', 'group'] : ['members', 'group', 'admin'];
    const roles = (
        await Promise.all(
            locations.map(async (location): Promise<Array<GroupRole>> => {
                const keycloakGroupId = getKeycloakGroupId(group, location);
                const clientRoles = keycloakGroupId === null ? [] : await keycloakListGroupClientRoles(keycloakGroupId);
                return clientRoles
                    .filter((role): role is typeof role & { clientId: GroupRoleClient } => isGroupRoleClient(role.clientId))
                    .map((role) => ({ ...role, location }));
            }),
        )
    ).flat();

    if (!withOptions) {
        return NextResponse.json({ roles } satisfies GroupRolesResponse);
    }

    const availableRoles = Object.fromEntries(
        await Promise.all(GROUP_ROLE_CLIENTS.map(async (clientId) => [clientId, await keycloakListClientRoleNames(clientId)] as const)),
    ) as Record<GroupRoleClient, Array<string>>;

    let adminsWithoutMembership: Array<string> = [];
    if (group.adminGroup !== null && roles.some((role) => role.location === 'admin')) {
        const memberIds = new Set((await keycloakGetDirectMembers(group.memberGroup)).map((user) => user.id));
        adminsWithoutMembership = (await keycloakGetDirectMembers(group.adminGroup))
            .filter((admin) => !memberIds.has(admin.id))
            .map((admin) => admin.username);
    }

    const response: GroupRoleOptionsResponse = {
        roles,
        availableRoles,
        creatableClients: GROUP_ROLE_CREATABLE_CLIENTS,
        adminsWithoutMembership,
        includedGroupNames: (await getIncludedGroups(group)).map((includedGroup) => includedGroup.displayName),
    };
    return NextResponse.json(response);
};

/**
 * Gives the member group a client role.
 * This function is triggered by the /api/group/roles/add endpoint.
 */
export const addGroupRole = async (
    { groupId, clientId, roleName, create }: z.infer<typeof groupRoleAddSchema>,
    executingUserId: string,
    ipAddress: string,
): Promise<NextResponse> => {
    const group = await getGroupOrError(groupId);
    if (group instanceof NextResponse) {
        return group;
    }

    if (create) {
        if (!GROUP_ROLE_CREATABLE_CLIENTS.includes(clientId)) {
            return NextResponse.json({ error: `Für ${clientId} können hier keine neuen Rollen angelegt werden.` }, { status: 400 });
        }

        if (!newRoleNamePattern.test(roleName)) {
            return NextResponse.json({ error: 'Neue Rollen dürfen nur Kleinbuchstaben, Ziffern, "_" und "-" enthalten.' }, { status: 400 });
        }

        if ((await keycloakListClientRoleNames(clientId)).includes(roleName)) {
            return NextResponse.json(
                { error: `Die Rolle ${clientId}:${roleName} gibt es bereits. Wähle sie aus der Liste.` },
                { status: 409 },
            );
        }

        await keycloakCreateClientRole(clientId, roleName);
        await writeLogEntry({
            userId: executingUserId,
            ipAddress,
            eventType: 'group.role.create',
            affectedUserId: null,
            affectedGroupId: groupId,
            description: `Rolle ${clientId}:${roleName} angelegt.`,
        });
    }

    if (!(await keycloakAddGroupClientRole(group.memberGroup, clientId, roleName))) {
        return NextResponse.json({ error: `Die Rolle ${clientId}:${roleName} gibt es nicht.` }, { status: 400 });
    }

    await writeLogEntry({
        userId: executingUserId,
        ipAddress,
        eventType: 'group.role.add',
        affectedUserId: null,
        affectedGroupId: groupId,
        description: `Rolle ${clientId}:${roleName} an die Mitgliedsgruppe vergeben.`,
    });

    await syncIncludedGroupRoles(group, await getIncludedGroups(group), 'add', executingUserId, ipAddress, [{ clientId, roleName }]);

    return NextResponse.json({ success: true });
};

/**
 * Removes a client role from the member group, or an old mapping from the group itself or its admin group.
 * This function is triggered by the /api/group/roles/remove endpoint.
 */
export const removeGroupRole = async (
    { groupId, clientId, roleName, location }: z.infer<typeof groupRoleRemoveSchema>,
    executingUserId: string,
    ipAddress: string,
): Promise<NextResponse> => {
    const group = await getGroupOrError(groupId);
    if (group instanceof NextResponse) {
        return group;
    }

    const keycloakGroupId = getKeycloakGroupId(group, location);
    if (keycloakGroupId === null || !(await keycloakRemoveGroupClientRole(keycloakGroupId, clientId, roleName))) {
        return NextResponse.json({ error: `Die Rolle ${clientId}:${roleName} gibt es nicht.` }, { status: 400 });
    }

    await writeLogEntry({
        userId: executingUserId,
        ipAddress,
        eventType: 'group.role.remove',
        affectedUserId: null,
        affectedGroupId: groupId,
        description: `Rolle ${clientId}:${roleName} von ${locationLabels[location]} entfernt.`,
    });

    // Old mappings on the group itself or its admin group were never passed on.
    if (location === 'members') {
        await syncIncludedGroupRoles(group, await getIncludedGroups(group), 'remove', executingUserId, ipAddress, [{ clientId, roleName }]);
    }

    return NextResponse.json({ success: true });
};

/**
 * Moves an old mapping from the group itself or its admin group to the member group.
 * This function is triggered by the /api/group/roles/move endpoint.
 */
export const moveGroupRole = async (
    { groupId, clientId, roleName, from }: z.infer<typeof groupRoleMoveSchema>,
    executingUserId: string,
    ipAddress: string,
): Promise<NextResponse> => {
    const group = await getGroupOrError(groupId);
    if (group instanceof NextResponse) {
        return group;
    }

    const fromGroupId = getKeycloakGroupId(group, from);
    if (fromGroupId === null || !(await keycloakListGroupClientRoleNames(fromGroupId, clientId)).includes(roleName)) {
        return NextResponse.json({ error: `Die Rolle ${clientId}:${roleName} liegt nicht an ${locationLabels[from]}.` }, { status: 400 });
    }

    // Add first, so nobody in the member group loses the role in between.
    await keycloakAddGroupClientRole(group.memberGroup, clientId, roleName);
    await keycloakRemoveGroupClientRole(fromGroupId, clientId, roleName);

    await writeLogEntry({
        userId: executingUserId,
        ipAddress,
        eventType: 'group.role.move',
        affectedUserId: null,
        affectedGroupId: groupId,
        description: `Rolle ${clientId}:${roleName} von ${locationLabels[from]} an die Mitgliedsgruppe verschoben.`,
    });

    await syncIncludedGroupRoles(group, await getIncludedGroups(group), 'add', executingUserId, ipAddress, [{ clientId, roleName }]);

    return NextResponse.json({ success: true });
};
