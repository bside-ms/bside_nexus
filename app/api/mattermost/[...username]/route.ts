import axios from 'axios';
import type { NextRequest } from 'next/server';
import getMattermostClient from '@/lib/mattermost/getMattermostClient';

export async function GET(req: NextRequest, props: { params: Promise<{ username: Array<string> }> }): Promise<Response> {
    const params = await props.params;
    const username = params.username.join('/');

    if (!username) {
        return new Response(JSON.stringify({ error: 'Username is required' }), { status: 400 });
    }

    // replace spaces and german special characters with dashes
    const fixedUsername = username.replace(/\s/g, '-').replace(/[äöüß()/]/g, '-');

    try {
        const userid = (await getMattermostClient().getUserByUsername(fixedUsername)).id;

        if (!userid) {
            return new Response(JSON.stringify({ error: 'User ID is required' }), { status: 400 });
        }

        const mattermostUrl = `${process.env.MATTERMOST_URL}/api/v4/users/${userid}/image`;
        const authToken = process.env.MATTERMOST_AUTH_TOKEN;

        if (!authToken) {
            return new Response(JSON.stringify({ error: 'Server misconfiguration: Missing authorization token' }), {
                status: 500,
            });
        }

        try {
            const response = await axios.get(mattermostUrl, {
                headers: {
                    Authorization: `Bearer ${authToken}`,
                },
                responseType: 'arraybuffer', // Ensures the image data is fetched as a binary buffer
            });

            return new Response(response.data, {
                headers: {
                    'Content-Type': response.headers['content-type'],
                    'Cache-Control': 'public, max-age=2592000, immutable', // cache for 30 days
                },
                status: 200,
            });

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
            return new Response(
                JSON.stringify({
                    error: 'Failed to fetch avatar from Mattermost',
                }),
                {
                    status: error.response?.status || 500,
                },
            );
        }
    } catch {
        return new Response(JSON.stringify(''), {
            status: 200,
        });
    }
}
