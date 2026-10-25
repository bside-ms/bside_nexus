import type { NextRequest } from 'next/server';
import type { MattermostAvatar } from '@/lib/mattermost/avatarCache';
import { getDefaultAvatar, getMattermostAvatar } from '@/lib/mattermost/avatarCache';

// The browser keeps an avatar for an hour. After that it asks again with the ETag and mostly gets a 304 from the server cache.
const CACHE_CONTROL = 'public, max-age=3600';
// After a Mattermost error the default picture must not stick, so the next load tries again.
const CACHE_CONTROL_ON_ERROR = 'no-store';

const imageResponse = (req: NextRequest, avatar: MattermostAvatar, cacheControl: string): Response => {
    const headers = { 'Cache-Control': cacheControl, ETag: avatar.etag };

    if (req.headers.get('if-none-match') === avatar.etag) {
        return new Response(null, { status: 304, headers });
    }

    return new Response(new Uint8Array(avatar.image), {
        status: 200,
        headers: { ...headers, 'Content-Type': avatar.contentType },
    });
};

export async function GET(req: NextRequest, props: { params: Promise<{ username: Array<string> }> }): Promise<Response> {
    const params = await props.params;
    const username = params.username.join('/');

    // replace spaces and german special characters with dashes
    const fixedUsername = username.replace(/\s/g, '-').replace(/[äöüß()/]/g, '-');

    const withoutDefault = req.nextUrl.searchParams.get('fallback') === 'none';

    try {
        const avatar = fixedUsername ? await getMattermostAvatar(fixedUsername) : null;

        if (avatar !== null) {
            return imageResponse(req, avatar, CACHE_CONTROL);
        }

        return withoutDefault
            ? new Response(null, { status: 404, headers: { 'Cache-Control': CACHE_CONTROL } })
            : imageResponse(req, await getDefaultAvatar(), CACHE_CONTROL);
    } catch (error: unknown) {
        // eslint-disable-next-line no-console
        console.error('[api/mattermost]', error);

        return withoutDefault
            ? new Response(null, { status: 502, headers: { 'Cache-Control': CACHE_CONTROL_ON_ERROR } })
            : imageResponse(req, await getDefaultAvatar(), CACHE_CONTROL_ON_ERROR);
    }
}
