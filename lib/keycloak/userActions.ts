import type UserRepresentation from '@keycloak/keycloak-admin-client/lib/defs/userRepresentation';
import { isNil } from 'lodash-es';
import getClient from '@/lib/keycloak/getClient';

// Improving our DX since some fields are always set, also declaring our custom attributes here.
export type AugmentedUserRepresentation = UserRepresentation &
    Required<Pick<UserRepresentation, 'id' | 'username' | 'firstName' | 'email' | 'emailVerified'>> & {
        attributes: {
            redmineId?: string;
            mattermostId?: string;
        };
    };

export const augmentUser = (user: UserRepresentation): AugmentedUserRepresentation | null => {
    if (
        isNil(user.id) ||
        isNil(user.username) ||
        isNil(user.firstName) ||
        isNil(user.email) ||
        isNil(user.emailVerified) ||
        isNil(user.enabled)
    ) {
        return null;
    }

    return {
        ...user,
        id: user.id,
        username: user.username,
        firstName: user.firstName,
        email: user.email,
        emailVerified: user.emailVerified,
        enabled: user.enabled,
        attributes: {
            redmineId: Array.isArray(user.attributes?.redmineId) ? user.attributes.redmineId[0] : undefined,
            mattermostId: Array.isArray(user.attributes?.mattermostId) ? user.attributes.mattermostId[0] : undefined,
        },
    };
};

export const keycloakGetAllUsers = async (): Promise<Array<UserRepresentation>> => {
    return (await getClient()).users.find({ first: 0, max: 9999 });
};

export const keycloakRemoveUserFromGroup = async (userId: string, groupId: string): Promise<string> => {
    return (await getClient()).users.delFromGroup({ id: userId, groupId });
};

export const keycloakAddUserToGroup = async (userId: string, groupId: string): Promise<string> => {
    return (await getClient()).users.addToGroup({ id: userId, groupId });
};
