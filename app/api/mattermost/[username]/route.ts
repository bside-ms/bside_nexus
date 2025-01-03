import axios from 'axios';
import type { NextRequest } from 'next/server';
import getMattermostClient from '@/lib/mattermost/getClient';

export async function GET(req: NextRequest, { params }: { params: { username: string } }): Promise<Response> {
    const { username } = params;

    if (!username) {
        return new Response(JSON.stringify({ error: 'User NAME is required' }), { status: 400 });
    }

    const userid = (await (await getMattermostClient()).getUserByUsername(username)).id;

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
}
