/** @type {import('next').NextConfig} */
const nextConfig = {
    basePath: process.env.NEXT_PUBLIC_BASE_PATH ?? '',

    images: {
        domains: ['chat.b-side.ms'],
    },
};

export default nextConfig;
