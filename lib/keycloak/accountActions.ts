import getClient from '@/lib/keycloak/getClient';

export const changeUsername = async (userId: string, newUsername: string): Promise<void> => {
    const client = await getClient();

    try {
        // Update the user's username in Keycloak
        await client.users.update(
            { id: userId }, // User identifier
            { username: newUsername }, // New username
        );
        // eslint-disable-next-line no-console
        console.log(`Username successfully updated for user ID '${userId}' to '${newUsername}'.`);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
        // Handle specific Keycloak errors
        if (error.response && error.response.data) {
            throw new Error(error.response.data.errorMessage || 'Keycloak error occurred.');
        }
        throw new Error('An unexpected error occurred while updating the username.');
    }
};
