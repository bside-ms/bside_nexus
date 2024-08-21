import KeycloakAdminClient from '@keycloak/keycloak-admin-client';
import type UserRepresentation from '@keycloak/keycloak-admin-client/lib/defs/userRepresentation';

let adminClient: KeycloakAdminClient | null = null;

const getClient = async (): Promise<KeycloakAdminClient> => {
    if (adminClient !== null) {
        return adminClient;
    }

    const client = new KeycloakAdminClient({
        baseUrl: `${process.env.KEYCLOAK_URL ?? '/'}auth`,
        realmName: process.env.KEYCLOAK_REALM,
    });

    await client.auth({
        clientId: process.env.KEYCLOAK_CLIENT_ID ?? '',
        clientSecret: process.env.KEYCLOAK_CLIENT_SECRET,
        username: process.env.KEYCLOAK_API_USER,
        password: process.env.KEYCLOAK_API_PASS,
        grantType: 'password',
    });

    adminClient = client;

    return client;
};

export const getAllUsers = async (): Promise<Array<UserRepresentation>> => {
    return (await getClient()).users.find({ first: 0, max: 9999 });
};
