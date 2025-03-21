import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
    basePath: process.env.NEXT_PUBLIC_BASE_PATH ?? '',

    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'chat.b-side.ms',
            },
        ],
    },
};

export default nextConfig;
