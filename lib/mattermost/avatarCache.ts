import { ClientError } from '@mattermost/client';
import type { UserProfile } from '@mattermost/types/users';
import getMattermostClient from '@/lib/mattermost/getMattermostClient';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

// In-memory avatar cache.
// After CHECK_INTERVAL_MS one cheap user lookup tells us if the picture changed.

const CHECK_INTERVAL_MS = 48 * 60 * 60 * 1000;
const MAX_ENTRIES = 2000;

export interface MattermostAvatar {
    image: Buffer;
    contentType: string;
    etag: string;
}

interface CacheEntry {
    // null: there is no Mattermost user with this username.
    avatar: MattermostAvatar | null;
    lastPictureUpdate: number;
    checkedAt: number;
}

const cache = new Map<string, CacheEntry>();
const pending = new Map<string, Promise<MattermostAvatar | null>>();

const store = (username: string, entry: CacheEntry): void => {
    cache.delete(username);
    cache.set(username, entry);

    if (cache.size > MAX_ENTRIES) {
        const oldestKey = cache.keys().next().value;
        if (oldestKey !== undefined) {
            cache.delete(oldestKey);
        }
    }
};

// null only for a 404. Other errors (Mattermost down, wrong token) are thrown, so they are not cached as "no account".
const findUser = async (username: string): Promise<UserProfile | null> => {
    try {
        return await getMattermostClient().getUserByUsername(username);
    } catch (error: unknown) {
        if (error instanceof ClientError && error.status_code === 404) {
            return null;
        }
        throw error;
    }
};

const loadAvatar = async (username: string): Promise<MattermostAvatar | null> => {
    const cached = cache.get(username);

    const user = await findUser(username);
    if (user === null) {
        store(username, { avatar: null, lastPictureUpdate: 0, checkedAt: Date.now() });
        return null;
    }

    // Mattermost leaves the field out while the user has no uploaded picture.
    const lastPictureUpdate = user.last_picture_update ?? 0;
    if (cached?.avatar && cached.lastPictureUpdate === lastPictureUpdate) {
        store(username, { ...cached, checkedAt: Date.now() });
        return cached.avatar;
    }

    const response = await fetch(`${process.env.MATTERMOST_URL}/api/v4/users/${user.id}/image`, {
        headers: { Authorization: `Bearer ${process.env.MATTERMOST_AUTH_TOKEN}` },
        cache: 'no-store',
    });
    if (!response.ok) {
        throw new Error(`Mattermost answered ${response.status} for the avatar of ${username}`);
    }

    const avatar: MattermostAvatar = {
        image: Buffer.from(await response.arrayBuffer()),
        contentType: response.headers.get('content-type') ?? 'image/png',
        etag: `"${user.id}-${lastPictureUpdate}"`,
    };
    store(username, { avatar, lastPictureUpdate, checkedAt: Date.now() });

    return avatar;
};

let defaultAvatar: Promise<MattermostAvatar> | null = null;

// Served for unknown users and when Mattermost fails. Other devices use the endpoint too and expect a real image.
export const getDefaultAvatar = (): Promise<MattermostAvatar> => {
    defaultAvatar ??= readFile(path.join(process.cwd(), 'public', 'default-avatar.png')).then((image) => ({
        image,
        contentType: 'image/png',
        etag: `"default-${createHash('sha1').update(image).digest('hex').slice(0, 16)}"`,
    }));

    return defaultAvatar;
};

// Returns null if the user has no Mattermost account. Throws if Mattermost cannot be reached.
export const getMattermostAvatar = async (username: string): Promise<MattermostAvatar | null> => {
    const cached = cache.get(username);
    if (cached !== undefined && Date.now() - cached.checkedAt < CHECK_INTERVAL_MS) {
        return cached.avatar;
    }

    // Many avatars of one user can be requested at the same time (e.g. sidebar and member list). Only one of them goes to Mattermost.
    const running = pending.get(username);
    if (running !== undefined) {
        return running;
    }

    const promise = loadAvatar(username).finally(() => pending.delete(username));
    pending.set(username, promise);

    return promise;
};
