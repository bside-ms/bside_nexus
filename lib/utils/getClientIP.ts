import type { NextRequest } from 'next/server';

export function getClientIP(request: Request | NextRequest): string {
    try {
        const treafikRealIp = request.headers.get('x-real-ip');
        if (treafikRealIp !== null) {
            return treafikRealIp;
        }

        const forwardedFor = request.headers.get('x-forwarded-for');
        if (forwardedFor !== null) {
            const ips = forwardedFor.split(',');
            const cleanIP = ips[0]?.trim();
            if (cleanIP !== undefined) {
                return cleanIP;
            }
        }

        return '';
    } catch {
        throw new Error('Failed to get client IP address');
    }
}
