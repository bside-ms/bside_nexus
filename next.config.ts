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

    // eslint-disable-next-line @typescript-eslint/require-await
    async headers() {
        return [
            {
                source: '/:path*',
                headers: [
                    {
                        key: 'X-DNS-Prefetch-Control',
                        value: 'on',
                    },
                    {
                        key: 'Strict-Transport-Security',
                        value: 'max-age=31536000; includeSubDomains',
                    },
                    {
                        key: 'X-Frame-Options',
                        value: 'SAMEORIGIN',
                    },
                    {
                        key: 'X-Content-Type-Options',
                        value: 'nosniff',
                    },
                    {
                        key: 'Referrer-Policy',
                        value: 'strict-origin-when-cross-origin',
                    },
                ],
            },
        ];
    },
};

export default nextConfig;
