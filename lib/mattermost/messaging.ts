// Messages from the Nexus bot. Outside production they go to the test channel, only test users get real DMs.

import type { Client4 } from '@mattermost/client';
import { isProduction } from '@/lib/environment';
import getMattermostClient from '@/lib/mattermost/getMattermostClient';

export type MattermostDelivery =
    | { status: 'sent'; postId: string }
    // Posted to the test channel instead
    | { status: 'redirected'; postId: string }
    | { status: 'skipped'; reason: string };

const TEST_PREFIX = '**Test**';

const splitList = (value: string | undefined): Array<string> =>
    (value ?? '')
        .split(',')
        .map((entry) => entry.trim().toLowerCase())
        .filter((entry) => entry !== '');

export const getMattermostTestChannelId = (): string | null => {
    const channelId = (process.env.MATTERMOST_TEST_CHANNEL_ID ?? '').trim();
    return channelId === '' ? null : channelId;
};

export const getMattermostTestUsers = (): Array<string> => splitList(process.env.MATTERMOST_TEST_USERS);

// Always in production, otherwise only for test users.
export const isMattermostWriteAllowed = (username: string): boolean =>
    isProduction() || getMattermostTestUsers().includes(username.trim().toLowerCase());

// Puts @mentions in code, so nobody gets pinged. Mail addresses and test users stay as they are.
export const neutralizeMentions = (message: string, allowed: Array<string> = getMattermostTestUsers()): string =>
    message.replaceAll(/(?<![\w`@])@([a-z0-9](?:[a-z0-9._-]*[a-z0-9_-])?)/gi, (match: string, name: string) =>
        allowed.includes(name.toLowerCase()) ? match : `\`${match}\``,
    );

let botUserId: string | null = null;

const getBotUserId = async (client: Client4): Promise<string> => {
    botUserId ??= (await client.getMe()).id;
    return botUserId;
};

const findUserId = async (client: Client4, username: string): Promise<string | null> => {
    try {
        return (await client.getUserByUsername(username)).id;
    } catch {
        return null;
    }
};

const postToTestChannel = async (target: string, message: string, rootId?: string): Promise<MattermostDelivery> => {
    const testChannelId = getMattermostTestChannelId();
    if (testChannelId === null) {
        return { status: 'skipped', reason: 'Testsystem ohne MATTERMOST_TEST_CHANNEL_ID' };
    }
    const text = `${TEST_PREFIX} · ${target}\n\n${neutralizeMentions(message)}`;
    const client = getMattermostClient();
    if (rootId !== undefined) {
        try {
            const reply = await client.createPost({ channel_id: testChannelId, root_id: rootId, message: text });
            return { status: 'redirected', postId: reply.id };
        } catch {
            // The test DB is a prod copy, so the root post can be outside the test channel.
            const fallback = await client.createPost({
                channel_id: testChannelId,
                message: `${text}\n\n_(Thread nicht im Test-Kanal gefunden)_`,
            });
            return { status: 'redirected', postId: fallback.id };
        }
    }
    const created = await client.createPost({ channel_id: testChannelId, message: text });
    return { status: 'redirected', postId: created.id };
};

/**
 * Sends a direct message from the bot.
 */
export const sendDirectMessage = async (username: string, message: string): Promise<MattermostDelivery> => {
    if (!isMattermostWriteAllowed(username)) {
        return postToTestChannel(`DM an \`@${username}\``, message);
    }

    const client = getMattermostClient();
    const userId = await findUserId(client, username);
    if (userId === null) {
        return { status: 'skipped', reason: `Kein Mattermost-Account für ${username}` };
    }
    const channel = await client.createDirectChannel([await getBotUserId(client), userId]);
    const text = isProduction() ? message : `${TEST_PREFIX}\n\n${neutralizeMentions(message)}`;
    const post = await client.createPost({ channel_id: channel.id, message: text });
    return { status: 'sent', postId: post.id };
};

/**
 * Posts to a channel, with rootId as a reply in a thread.
 */
export const postToChannel = async (
    channelId: string,
    message: string,
    options: { rootId?: string; channelLabel?: string } = {},
): Promise<MattermostDelivery> => {
    if (!isProduction()) {
        const label = options.channelLabel ?? channelId;
        return postToTestChannel(
            options.rootId === undefined ? `Kanal ${label}` : `Kanal ${label}, Antwort im Thread`,
            message,
            options.rootId,
        );
    }

    const post = await getMattermostClient().createPost({ channel_id: channelId, root_id: options.rootId, message });
    return { status: 'sent', postId: post.id };
};
