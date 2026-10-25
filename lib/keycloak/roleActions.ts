import type RoleRepresentation from '@keycloak/keycloak-admin-client/lib/defs/roleRepresentation';
import type { RoleMappingPayload } from '@keycloak/keycloak-admin-client/lib/defs/roleRepresentation';
import getKeycloakClient from '@/lib/keycloak/getClient';
import isNotEmptyString from '@/lib/utils/isNotEmptyString';

// The internal ids of clients do not change.
const clientUuids = new Map<string, string>();

const getClientUuid = async (clientId: string): Promise<string> => {
    const cachedUuid = clientUuids.get(clientId);
    if (cachedUuid !== undefined) {
        return cachedUuid;
    }

    const [client] = await (await getKeycloakClient()).clients.find({ clientId });

    if (client?.id === undefined) {
        throw new Error(`Client ${clientId} not found`);
    }

    clientUuids.set(clientId, client.id);
    return client.id;
};

const getRole = async (clientUuid: string, roleName: string): Promise<RoleMappingPayload | null> => {
    const role = await (await getKeycloakClient()).clients.findRole({ id: clientUuid, roleName });

    return isNotEmptyString(role?.id) && isNotEmptyString(role.name) ? { id: role.id, name: role.name } : null;
};

export const keycloakListClientRoleNames = async (clientId: string): Promise<Array<string>> => {
    const roles = await (await getKeycloakClient()).clients.listRoles({ id: await getClientUuid(clientId) });

    return roles
        .map((role) => role.name)
        .filter(isNotEmptyString)
        .sort((a, b) => a.localeCompare(b, 'de'));
};

export interface KeycloakClientRole {
    clientId: string;
    roleName: string;
}

// The client roles of all clients in one request.
export const keycloakListGroupClientRoles = async (groupId: string): Promise<Array<KeycloakClientRole>> => {
    const { clientMappings } = await (await getKeycloakClient()).groups.listRoleMappings({ id: groupId });

    // Keyed by clientId. The admin client types the values as any.
    return Object.entries((clientMappings ?? {}) as Record<string, { mappings?: Array<RoleRepresentation> }>).flatMap(
        ([clientId, { mappings }]) =>
            (mappings ?? [])
                .map((role) => role.name)
                .filter(isNotEmptyString)
                .map((roleName) => ({ clientId, roleName })),
    );
};

export const keycloakListGroupClientRoleNames = async (groupId: string, clientId: string): Promise<Array<string>> => {
    const roles = await (
        await getKeycloakClient()
    ).groups.listClientRoleMappings({ id: groupId, clientUniqueId: await getClientUuid(clientId) });

    return roles.map((role) => role.name).filter(isNotEmptyString);
};

// Returns false if the role does not exist.
export const keycloakAddGroupClientRole = async (groupId: string, clientId: string, roleName: string): Promise<boolean> => {
    const clientUuid = await getClientUuid(clientId);
    const role = await getRole(clientUuid, roleName);

    if (role === null) {
        return false;
    }

    await (await getKeycloakClient()).groups.addClientRoleMappings({ id: groupId, clientUniqueId: clientUuid, roles: [role] });
    return true;
};

// Returns false if the role does not exist.
export const keycloakRemoveGroupClientRole = async (groupId: string, clientId: string, roleName: string): Promise<boolean> => {
    const clientUuid = await getClientUuid(clientId);
    const role = await getRole(clientUuid, roleName);

    if (role === null) {
        return false;
    }

    await (await getKeycloakClient()).groups.delClientRoleMappings({ id: groupId, clientUniqueId: clientUuid, roles: [role] });
    return true;
};

export const keycloakCreateClientRole = async (clientId: string, roleName: string): Promise<void> => {
    await (await getKeycloakClient()).clients.createRole({ id: await getClientUuid(clientId), name: roleName });
};
