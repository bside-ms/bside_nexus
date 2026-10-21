import { NetworkError } from '@keycloak/keycloak-admin-client';
import getKeycloakClient from '@/lib/keycloak/getClient';

/**
 * Errormessage shown to the user.
 * All other errors stay in the server log, their messages can contain internals from Keycloak.
 */
export class AccountChangeError extends Error {
    public readonly status: number;

    public constructor(message: string, status: number) {
        super(message);
        this.name = 'AccountChangeError';
        this.status = status;
    }
}

// Keycloak answers 409 if the username or mail address is already taken.
const isKeycloakConflict = (error: unknown): boolean => error instanceof NetworkError && error.response.status === 409;

export const keycloakChangeUsername = async (userId: string, newUsername: string): Promise<void> => {
    const client = await getKeycloakClient();

    try {
        await client.users.update(
            { id: userId }, // ID of the user to update
            { username: newUsername }, // Values to be updated
        );
    } catch (error: unknown) {
        if (isKeycloakConflict(error)) {
            throw new AccountChangeError('Dieser Username ist bereits vergeben.', 409);
        }
        throw error;
    }

    // ToDo: Log the username change in the database and remove the console.log.
    // eslint-disable-next-line no-console
    console.log(`Username successfully updated for user ID '${userId}' to '${newUsername}'.`);
};

export const keycloakChangeMail = async (userId: string, newMail: string): Promise<void> => {
    const client = await getKeycloakClient();

    const usersWithMail = await client.users.find({ email: newMail, exact: true });
    if (usersWithMail.some((user) => user.id !== userId)) {
        throw new AccountChangeError('Diese Mail-Adresse ist bereits vergeben.', 409);
    }

    try {
        await client.users.update(
            { id: userId }, // ID of the user to update
            { email: newMail }, // Values to be updated
        );
    } catch (error: unknown) {
        if (isKeycloakConflict(error)) {
            throw new AccountChangeError('Diese Mail-Adresse ist bereits vergeben.', 409);
        }
        throw error;
    }

    // ToDo: Log the mail change in the database and remove the console.log.
    // eslint-disable-next-line no-console
    console.log(`Mail successfully updated for user ID '${userId}' to '${newMail}'.`);
};

export const keycloakChangeDisplayname = async (userId: string, newDisplayname: string): Promise<void> => {
    const client = await getKeycloakClient();

    await client.users.update(
        { id: userId }, // ID of the user to update
        { firstName: newDisplayname }, // Values to be updated
    );

    // eslint-disable-next-line no-console
    console.log(`Displayname updated for user ID '${userId}' to '${newDisplayname}'.`);
};
