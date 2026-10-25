'use client';

/* eslint-disable react/jsx-no-bind */

import { Fragment, useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import type { ReactElement } from 'react';
import type { GroupMemberAction, GroupMemberActionContext } from '@/components/group/details/members/GroupMemberActions';
import { getGroupMemberActions, hasMemberEmail } from '@/components/group/details/members/GroupMemberActions';
import type { GroupMember } from '@/components/group/details/members/GroupMembersColumns';
import { formatMemberStatus } from '@/components/group/details/members/GroupMembersColumns';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import isNotEmptyString from '@/lib/utils/isNotEmptyString';

interface GroupMemberDetailsProps {
    member: GroupMember;
    actionContext?: GroupMemberActionContext;
    onClose: () => void;
    className?: string;
}

// The containers unmount it when they close. A pending confirmation is reset on every open.
export function GroupMemberDetails({ member, actionContext, onClose, className }: GroupMemberDetailsProps): ReactElement {
    const [pendingAction, setPendingAction] = useState<GroupMemberAction | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // The panel can be closed while a request runs. Then the late answer must not close a panel opened in the meantime.
    const isMountedRef = useRef(true);
    useEffect((): (() => void) => {
        isMountedRef.current = true;
        return (): void => {
            isMountedRef.current = false;
        };
    }, []);

    const actions = getGroupMemberActions(member, actionContext);
    const adminActions = actions.filter((action) => action.isAdminAction);
    const otherActions = actions.filter((action) => !action.isAdminAction);

    // Several actions can be disabled for the same reason, show it only once.
    const disabledReasons = [...new Set(adminActions.map((action) => action.disabledReason).filter(isNotEmptyString))];

    const handleSelect = (action: GroupMemberAction): void => {
        if (action.confirmation) {
            setPendingAction(action);
            return;
        }
        void action.onSelect();
        onClose();
    };

    // Waits for the server (and Keycloak) before closing. On errors, the toast explains it and the panel goes back to the overview.
    const handleConfirm = async (): Promise<void> => {
        if (pendingAction === null) {
            return;
        }

        setIsSubmitting(true);
        const isSuccess = await pendingAction.onSelect();
        if (!isMountedRef.current) {
            return;
        }

        setIsSubmitting(false);
        if (isSuccess) {
            onClose();
        } else {
            setPendingAction(null);
        }
    };

    if (pendingAction?.confirmation) {
        return (
            <div className={cn('flex flex-col gap-2', className)}>
                <div className="space-y-1.5 pb-2">
                    <p className="font-semibold">{pendingAction.confirmation.title}</p>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">{pendingAction.confirmation.description}</p>
                </div>
                <Button
                    variant={pendingAction.isDestructive ? 'destructive' : 'default'}
                    disabled={isSubmitting}
                    onClick={() => void handleConfirm()}
                >
                    {isSubmitting && <Loader2 className="animate-spin" />}
                    {pendingAction.confirmation.confirmLabel}
                </Button>
                <Button variant="outline" disabled={isSubmitting} onClick={() => setPendingAction(null)}>
                    Abbrechen
                </Button>
            </div>
        );
    }

    const renderActionButton = (action: GroupMemberAction): ReactElement => (
        <Button
            key={action.id}
            variant="outline"
            className={cn(action.isDestructive && 'text-red-600 hover:text-red-700 dark:text-red-500 dark:hover:text-red-400')}
            disabled={action.disabledReason !== undefined}
            onClick={() => handleSelect(action)}
        >
            {action.label}
        </Button>
    );

    return (
        <div className={cn('flex flex-col gap-4', className)}>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
                <dt className="text-zinc-500 dark:text-zinc-400">Status</dt>
                <dd>{formatMemberStatus(member.status)}</dd>
                {member.viaGroup !== undefined && (
                    <Fragment>
                        <dt className="text-zinc-500 dark:text-zinc-400">Über</dt>
                        <dd>
                            <Link href={`/portal/groups/${member.viaGroup.id}`} className="underline underline-offset-4">
                                {member.viaGroup.displayName}
                            </Link>
                        </dd>
                    </Fragment>
                )}
                {hasMemberEmail(member) && (
                    <Fragment>
                        <dt className="text-zinc-500 dark:text-zinc-400">E-Mail</dt>
                        <dd className="truncate">{member.email}</dd>
                    </Fragment>
                )}
            </dl>
            {member.viaGroup !== undefined && (
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    {member.displayName} ist Mitglied von {member.viaGroup.displayName} und steht deshalb auch in dieser Gruppe. Die
                    Mitgliedschaft lässt sich nur dort ändern.
                </p>
            )}
            <div className="flex flex-col gap-2">
                {adminActions.length > 0 && (
                    <Fragment>
                        {adminActions.map(renderActionButton)}
                        {disabledReasons.map((reason) => (
                            <p key={reason} className="text-sm text-zinc-500 dark:text-zinc-400">
                                {reason}
                            </p>
                        ))}
                        <Separator className="my-2" />
                    </Fragment>
                )}
                {otherActions.map(renderActionButton)}
            </div>
        </div>
    );
}
