import type { Client4 } from '@mattermost/client';
import type { UserProfile } from '@mattermost/types/users';
import getMattermostClient from '@/lib/mattermost/getMattermostClient';

const getUserByUsername = async (username: string): Promise<UserProfile | null> => {
    const client: Client4 = getMattermostClient();

    try {
        return await client.getUserByUsername(username);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
        // no mattermost user for this id has been found.
        if (error.response && error.response.status === 404) {
            return null;
        }

        return null;
    }
};

export const invalidateMattermostSession = async (username: string): Promise<void> => {
    const client: Client4 = getMattermostClient();

    const currentUser = await getUserByUsername(username);
    if (currentUser === null || currentUser.id === undefined) {
        throw new Error('Dein Mattermost-Konto konnte nicht gefunden werden.');
    }

    await client.revokeAllSessionsForUser(currentUser.id);
};

export const changeMattermostDisplayname = async (username: string, newDisplayname: string): Promise<void> => {
    const client: Client4 = getMattermostClient();

    const currentUser = await getUserByUsername(username);
    if (currentUser === null || currentUser.id === undefined) {
        throw new Error('Dein Mattermost-Konto konnte nicht gefunden werden.');
    }

    currentUser.nickname = newDisplayname;
    await client.updateUser(currentUser);
};
