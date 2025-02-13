import getKeycloakClient from '@/lib/keycloak/getClient';

export const keycloakChangeUsername = async (userId: string, newUsername: string): Promise<void> => {
    const client = await getKeycloakClient();

    try {
        await client.users.update(
            { id: userId }, // ID of the user to update
            { username: newUsername }, // Values to be updated
        );

        // ToDo: Log the username change in the database and remove the console.log.
        // eslint-disable-next-line no-console
        console.log(`Username successfully updated for user ID '${userId}' to '${newUsername}'.`);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
        if (error.response && error.response.data) {
            throw new Error(error.response.data.errorMessage || 'Keycloak error occurred.');
        }

        throw new Error('An unexpected error occurred while updating the username.');
    }
};

export const keycloakChangeMail = async (userId: string, newMail: string): Promise<void> => {
    const client = await getKeycloakClient();

    const user = await client.users.find({ email: newMail });

    if (user.length > 0) {
        throw new Error('Mail-Adresse ist bereits vergeben.');
    }

    try {
        await client.users.update(
            { id: userId }, // ID of the user to update
            { email: newMail }, // Values to be updated
        );

        // ToDo: Log the mail change in the database and remove the console.log.
        // eslint-disable-next-line no-console
        console.log(`Mail successfully updated for user ID '${userId}' to '${newMail}'.`);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
        if (error.response && error.response.data) {
            throw new Error(error.response.data.errorMessage || 'Keycloak error occurred.');
        }

        throw new Error('An unexpected error occurred while updating the username.');
    }
};

export const keycloakChangeDisplayname = async (userId: string, newDisplayname: string): Promise<void> => {
    const client = await getKeycloakClient();

    try {
        await client.users.update(
            { id: userId }, // ID of the user to update
            { firstName: newDisplayname }, // Values to be updated
        );

        // eslint-disable-next-line no-console
        console.log(`Displayname updated for user ID '${userId}' to '${newDisplayname}'.`);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
        // Handle specific Keycloak errors
        if (error.response && error.response.data) {
            throw new Error(error.response.data.errorMessage || 'Keycloak error occurred.');
        }

        throw new Error('An unexpected error occurred while updating the displayname.');
    }
};
