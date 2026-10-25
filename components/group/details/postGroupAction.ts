'use client';

import axios from 'axios';
import { toast } from 'sonner';

export interface GroupActionResponse {
    success?: boolean;
    error?: string;
}

export async function postGroupAction<T extends GroupActionResponse = GroupActionResponse>(
    url: string,
    body: Record<string, unknown>,
    messages: { success: string; error: string },
    onSuccess: (data: T) => void,
): Promise<boolean> {
    try {
        const response = await axios.post<T>(url, body);

        if (response.data.success === true) {
            toast.success(messages.success);
            onSuccess(response.data);
            return true;
        }

        toast.error(response.data.error ?? messages.error);
        return false;
    } catch (error: unknown) {
        // 4xx responses carry a message for the user (missing rights, last admin, …).
        // 5xx messages can contain internals from Keycloak, so they get the generic message.
        const response = axios.isAxiosError<GroupActionResponse>(error) ? error.response : undefined;
        const isClientError = response !== undefined && response.status < 500;
        toast.error(isClientError ? (response.data.error ?? messages.error) : messages.error);
        return false;
    }
}
