'use client';

import axios from 'axios';
import { toast } from 'sonner';
import type { GroupMember } from '@/components/group/details/members/GroupMembersColumns';
import isNotEmptyString from '@/lib/utils/isNotEmptyString';

interface GroupActionResponse {
    success?: boolean;
    error?: string;
}

async function postGroupAction(
    url: string,
    body: Record<string, unknown>,
    messages: { success: string; error: string },
    onSuccess: () => void,
): Promise<boolean> {
    try {
        const response = await axios.post<GroupActionResponse>(url, body);

        if (response.data.success === true) {
            toast.success(messages.success);
            onSuccess();
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

// Legacy way of copying. Used when the Clipboard API is missing or blocked.
function copyWithExecCommand(value: string): boolean {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const textarea = document.createElement('textarea');
    textarea.value = value;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';

    // Inside the member panel, its focus trap would pull focus away from a textarea outside of it.
    const container = previousFocus?.closest('[role="dialog"]') ?? document.body;
    container.append(textarea);
    textarea.select();

    try {
        return document.execCommand('copy');
    } catch {
        return false;
    } finally {
        textarea.remove();
        previousFocus?.focus();
    }
}

async function copyWithClipboardApi(value: string): Promise<boolean> {
    try {
        await navigator.clipboard.writeText(value);
        return true;
    } catch {
        // Fallback to legacy method if Clipboard API is not available.
        return copyWithExecCommand(value);
    }
}

export async function copyToClipboard(value: string, successMessage: string): Promise<boolean> {
    // navigator.clipboard only exists in secure contexts.
    const isCopied = window.isSecureContext ? await copyWithClipboardApi(value) : copyWithExecCommand(value);

    if (isCopied) {
        toast.success(successMessage);
    } else {
        toast.error('Kopieren in die Zwischenablage ist fehlgeschlagen.');
    }
    return isCopied;
}

export interface GroupMemberActionConfirmation {
    title: string;
    description: string;
    confirmLabel: string;
}

export interface GroupMemberAction {
    id: string;
    label: string;
    onSelect: () => Promise<boolean>;
    isAdminAction: boolean;
    isDestructive: boolean;
    confirmation?: GroupMemberActionConfirmation;
    disabledReason?: string;
}

// Display a fallback if an email could not be fetched.
export const hasMemberEmail = (member: GroupMember): boolean => isNotEmptyString(member.email) && member.email !== '-';

export interface GroupMemberActionContext {
    onMembersChanged: () => void;
    currentUserId: string;
    isSystemAdmin: boolean;
    adminCount: number;
}

// Without a context (no group admin), only the copy actions are available.
export const getGroupMemberActions = (member: GroupMember, context?: GroupMemberActionContext): Array<GroupMemberAction> => {
    const actions: Array<GroupMemberAction> = [
        {
            id: 'copy-username',
            label: 'Mattermost-Namen kopieren',
            onSelect: () => copyToClipboard(member.username, 'Mattermost-Name wurde kopiert.'),
            isAdminAction: false,
            isDestructive: false,
        },
    ];

    if (hasMemberEmail(member)) {
        actions.push({
            id: 'copy-email',
            label: 'Mail-Adresse kopieren',
            onSelect: () => copyToClipboard(member.email, 'Mail-Adresse wurde kopiert.'),
            isAdminAction: false,
            isDestructive: false,
        });
    }

    if (!context) {
        return actions;
    }

    const { onMembersChanged, currentUserId, isSystemAdmin, adminCount } = context;
    const isSelf = member.userId === currentUserId;
    const isLastAdmin = member.status === 'admin' && adminCount <= 1;

    const lastAdminReason =
        isLastAdmin && !isSystemAdmin
            ? 'Die Gruppe braucht mindestens eine Administrator*in. Ernenne zuerst eine weitere Person zur Administrator*in.'
            : undefined;

    const lastAdminWarning =
        isLastAdmin && isSystemAdmin
            ? ' Die Gruppe hat danach keine Administrator*innen mehr. Neue können dann nur System-Admins ernennen.'
            : '';
    const allowWithoutAdmin = isLastAdmin && isSystemAdmin;

    const selfUndoHint = isSystemAdmin ? '' : ' Das kannst du nicht selbst rückgängig machen.';

    actions.push({
        id: 'remove',
        label: isSelf ? 'Gruppe verlassen' : 'Aus der Gruppe entfernen',
        onSelect: () =>
            postGroupAction(
                '/api/group/remove',
                { userIdToBeRemoved: member.userId, groupId: member.groupId, allowWithoutAdmin },
                {
                    success: 'Benutzer*in wurde erfolgreich entfernt.',
                    error: 'Ein Fehler ist aufgetreten. Die Benutzer*in konnte nicht entfernt werden.',
                },
                onMembersChanged,
            ),
        isAdminAction: true,
        isDestructive: true,
        disabledReason: lastAdminReason,
        confirmation: {
            title: isSelf ? 'Gruppe verlassen?' : 'Aus der Gruppe entfernen?',
            description:
                (isSelf ? `Du wirst aus der Gruppe entfernt.${selfUndoHint}` : `${member.displayName} wird aus der Gruppe entfernt.`) +
                lastAdminWarning,
            confirmLabel: isSelf ? 'Verlassen' : 'Entfernen',
        },
    });

    if (member.status === 'admin') {
        actions.push({
            id: 'demote',
            label: 'Administrator*in entfernen',
            onSelect: () =>
                postGroupAction(
                    '/api/group/demote',
                    { userIdToBeDemoted: member.userId, groupId: member.groupId, allowWithoutAdmin },
                    {
                        success: 'Administrator*in wurde erfolgreich entfernt.',
                        error: 'Ein Fehler ist aufgetreten. Die Administrator*in konnte nicht entfernt werden.',
                    },
                    onMembersChanged,
                ),
            isAdminAction: true,
            isDestructive: false,
            disabledReason: lastAdminReason,
            confirmation: {
                title: 'Administrator*in entfernen?',
                description:
                    (isSelf
                        ? `Du bist danach keine Administrator*in dieser Gruppe mehr, bleibst aber Mitglied.${selfUndoHint}`
                        : `${member.displayName} ist danach keine Administrator*in dieser Gruppe mehr, bleibt aber Mitglied.`) +
                    lastAdminWarning,
                confirmLabel: 'Administrator*in entfernen',
            },
        });
    }

    if (member.status === 'member') {
        actions.push({
            id: 'promote',
            label: 'Zur Administrator*in ernennen',
            onSelect: () =>
                postGroupAction(
                    '/api/group/promote',
                    { userIdToBePromoted: member.userId, groupId: member.groupId },
                    {
                        success: 'Benutzer*in wurde erfolgreich zur Administrator*in ernannt.',
                        error: 'Ein Fehler ist aufgetreten. Die Benutzer*in konnte nicht zur Administrator*in ernannt werden.',
                    },
                    onMembersChanged,
                ),
            isAdminAction: true,
            isDestructive: false,
            confirmation: {
                title: 'Zur Administrator*in ernennen?',
                description: `${member.displayName} kann danach Mitglieder hinzufügen und entfernen sowie die Gruppe bearbeiten.`,
                confirmLabel: 'Ernennen',
            },
        });
    }

    return actions;
};
