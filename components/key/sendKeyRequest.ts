'use client';

import { toast } from 'sonner';

interface KeyResponse {
    success?: boolean;
    error?: string;
}

// Sends a JSON request to /api/key/* and shows a toast. Returns the response on success, otherwise null.
// The API sends a matching message for expected errors and a generic one otherwise.
const sendKeyRequest = async <T extends object>(
    method: 'POST' | 'PATCH' | 'DELETE',
    url: string,
    body: unknown,
    messages: { success?: string; error: string },
): Promise<T | null> => {
    try {
        const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: body === undefined ? undefined : JSON.stringify(body),
        });
        const data = (await response.json().catch(() => ({}))) as KeyResponse & T;
        if (response.ok && data.success === true) {
            if (messages.success !== undefined) {
                toast.success(messages.success);
            }
            return data;
        }
        toast.error(data.error ?? messages.error);
        return null;
    } catch {
        toast.error(messages.error);
        return null;
    }
};

export default sendKeyRequest;
