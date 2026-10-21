'use client';

/* eslint-disable react/jsx-no-bind */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Check, Loader2, X } from 'lucide-react';
import type { ReactElement } from 'react';
import { toast } from 'sonner';
import { useBreakpointContext } from '@/components/common/BreakpointContext';
import { GroupMemberAvatar } from '@/components/group/details/members/GroupMembersColumns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { MAX_USERS_PER_ADD } from '@/lib/constants';
import { cn } from '@/lib/utils';

// Shape of /api/group/userlist.
interface PossibleMember {
    id: string;
    name: string;
    displayName: string;
}

interface AddMembersResponse {
    success?: boolean;
    error?: string;
    addedUserIds?: Array<string>;
}

type LoadState = 'loading' | 'error' | 'loaded';

const TITLE = 'Mitglieder hinzufügen';
const DESCRIPTION = `Wähle bis zu ${MAX_USERS_PER_ADD} Personen aus.`;

interface GroupMemberAddFormProps {
    groupId: string;
    onMembersAdded: () => void;
    onClose: () => void;
}

// Containers unmount it when they close. Every open loads a fresh list.
function GroupMemberAddForm({ groupId, onMembersAdded, onClose }: GroupMemberAddFormProps): ReactElement {
    const [possibleMembers, setPossibleMembers] = useState<Array<PossibleMember>>([]);
    const [loadState, setLoadState] = useState<LoadState>('loading');
    const [selectedIds, setSelectedIds] = useState<Array<string>>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // The panel can be closed while a request runs. Then the late answer must not touch the next panel.
    const isMountedRef = useRef(true);
    useEffect((): (() => void) => {
        isMountedRef.current = true;
        return (): void => {
            isMountedRef.current = false;
        };
    }, []);

    const loadPossibleMembers = useCallback(async (): Promise<void> => {
        setLoadState('loading');
        try {
            const response = await fetch('/api/group/userlist', {
                method: 'POST',
                headers: { 'Cache-Control': 'no-store', 'Content-Type': 'application/json' },
                body: JSON.stringify({ groupId }),
            });
            if (!response.ok) {
                throw new Error(`userlist answered ${response.status}`);
            }
            const users: Array<PossibleMember> = await response.json();
            if (isMountedRef.current) {
                setPossibleMembers(users);
                setLoadState('loaded');
            }
        } catch {
            if (isMountedRef.current) {
                setLoadState('error');
            }
        }
    }, [groupId]);

    useEffect(() => {
        void loadPossibleMembers();
    }, [loadPossibleMembers]);

    const isLimitReached = selectedIds.length >= MAX_USERS_PER_ADD;

    const toggleSelection = (userId: string): void => {
        setSelectedIds((ids) => (ids.includes(userId) ? ids.filter((id) => id !== userId) : [...ids, userId]));
    };

    const selectedMembers = selectedIds
        .map((id) => possibleMembers.find((possibleMember) => possibleMember.id === id))
        .filter((possibleMember): possibleMember is PossibleMember => possibleMember !== undefined);

    const handleSubmit = async (): Promise<void> => {
        setIsSubmitting(true);

        let result: AddMembersResponse = {};
        let isSuccess = false;
        try {
            const response = await fetch('/api/group/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ groupId, userIdsToBeAdded: selectedIds }),
            });
            result = await response.json();
            isSuccess = response.ok && result.success === true;
        } catch {
            result = {};
        }

        // Also after a partial failure, some users may have been added.
        const addedUserIds = result.addedUserIds ?? [];
        if (addedUserIds.length > 0) {
            onMembersAdded();
        }

        if (isSuccess) {
            const firstAdded = possibleMembers.find((possibleMember) => possibleMember.id === addedUserIds[0]);
            toast.success(
                addedUserIds.length === 1 && firstAdded
                    ? `${firstAdded.displayName} wurde hinzugefügt.`
                    : `${addedUserIds.length} Personen wurden hinzugefügt.`,
            );
            if (isMountedRef.current) {
                onClose();
            }
            return;
        }

        toast.error(result.error ?? 'Die Benutzer*innen konnten nicht hinzugefügt werden.');
        if (!isMountedRef.current) {
            return;
        }

        // Users who were added before the error leave the list, so a retry only sends the rest.
        setPossibleMembers((members) => members.filter((possibleMember) => !addedUserIds.includes(possibleMember.id)));
        setSelectedIds((ids) => ids.filter((id) => !addedUserIds.includes(id)));
        setIsSubmitting(false);
    };

    if (loadState === 'loading') {
        return (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-zinc-500 dark:text-zinc-400">
                <Loader2 className="size-4 animate-spin" />
                Benutzer*innen werden geladen …
            </div>
        );
    }

    if (loadState === 'error') {
        return (
            <div className="flex flex-col items-center gap-4 py-8 text-center text-sm">
                <p>Die Liste der Benutzer*innen konnte nicht geladen werden.</p>
                <Button variant="outline" onClick={() => void loadPossibleMembers()}>
                    Erneut versuchen
                </Button>
            </div>
        );
    }

    if (possibleMembers.length === 0) {
        return <p className="py-8 text-center text-sm">Alle aktiven Benutzer*innen sind bereits Mitglied dieser Gruppe.</p>;
    }

    return (
        <div className="flex min-h-0 flex-1 flex-col gap-4">
            <Command className="flex min-h-0 flex-1 flex-col rounded-md border">
                <CommandInput placeholder="Name oder Username suchen …" disabled={isSubmitting} />
                <CommandList className="max-h-none min-h-0 flex-1">
                    <CommandEmpty>Niemand gefunden.</CommandEmpty>
                    <CommandGroup>
                        {possibleMembers.map((possibleMember) => {
                            const isSelected = selectedIds.includes(possibleMember.id);
                            return (
                                <CommandItem
                                    key={possibleMember.id}
                                    // cmdk searches in the value, usernames keep it unique.
                                    value={`${possibleMember.displayName} @${possibleMember.name}`}
                                    // At the limit, only already selected users can still be clicked (to deselect them).
                                    disabled={isSubmitting || (isLimitReached && !isSelected)}
                                    onSelect={() => toggleSelection(possibleMember.id)}
                                    className="gap-3 py-2"
                                >
                                    <span
                                        aria-hidden="true"
                                        className={cn(
                                            'flex size-4 shrink-0 items-center justify-center rounded-sm border border-zinc-300 dark:border-zinc-600',
                                            isSelected &&
                                                'border-zinc-900 bg-zinc-900 text-zinc-50 dark:border-zinc-50 dark:bg-zinc-50 dark:text-zinc-900',
                                        )}
                                    >
                                        {isSelected && <Check className="size-3" />}
                                    </span>
                                    <GroupMemberAvatar username={possibleMember.name} />
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate font-medium">{possibleMember.displayName}</p>
                                        <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">@{possibleMember.name}</p>
                                    </div>
                                    <span className="sr-only">{isSelected ? 'ausgewählt' : 'nicht ausgewählt'}</span>
                                </CommandItem>
                            );
                        })}
                    </CommandGroup>
                </CommandList>
            </Command>

            <p className="text-sm text-zinc-500 dark:text-zinc-400">
                {isLimitReached
                    ? `Du kannst höchstens ${MAX_USERS_PER_ADD} Personen auf einmal hinzufügen.`
                    : `${selectedIds.length} von ${MAX_USERS_PER_ADD} ausgewählt`}
            </p>

            {selectedMembers.length > 0 && (
                <div className="flex max-h-24 flex-wrap gap-1.5 overflow-y-auto">
                    {selectedMembers.map((selectedMember) => (
                        <Badge key={selectedMember.id} variant="secondary" className="gap-1 pr-1">
                            {selectedMember.displayName}
                            <button
                                type="button"
                                className="rounded-full p-0.5 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                                disabled={isSubmitting}
                                onClick={() => toggleSelection(selectedMember.id)}
                            >
                                <X className="size-3" />
                                <span className="sr-only">{selectedMember.displayName} abwählen</span>
                            </button>
                        </Badge>
                    ))}
                </div>
            )}

            <Button disabled={selectedIds.length === 0 || isSubmitting} onClick={() => void handleSubmit()}>
                {isSubmitting && <Loader2 className="animate-spin" />}
                {selectedIds.length === 0
                    ? 'Personen auswählen'
                    : selectedIds.length === 1
                      ? '1 Person hinzufügen'
                      : `${selectedIds.length} Personen hinzufügen`}
            </Button>
        </div>
    );
}

interface GroupMemberAddPanelProps {
    groupId: string;
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onMembersAdded: () => void;
}

// Drawer on phones. Sheet from bigger devices. Same containers as the member panel.
export function GroupMemberAddPanel({ groupId, isOpen, onOpenChange, onMembersAdded }: GroupMemberAddPanelProps): ReactElement {
    const { isMd } = useBreakpointContext();
    const close = (): void => onOpenChange(false);

    if (!isMd) {
        return (
            <Drawer open={isOpen} onOpenChange={onOpenChange}>
                {/* No autofocus on the search field, the keyboard would cover half of the list. */}
                <DrawerContent className="max-h-[85svh]" onOpenAutoFocus={(event) => event.preventDefault()}>
                    <DrawerHeader className="flex items-center gap-3 text-left">
                        <div className="min-w-0 flex-1">
                            <DrawerTitle>{TITLE}</DrawerTitle>
                            <DrawerDescription>{DESCRIPTION}</DrawerDescription>
                        </div>
                        <DrawerClose asChild>
                            <Button variant="ghost" size="icon" className="shrink-0">
                                <X />
                                <span className="sr-only">Schließen</span>
                            </Button>
                        </DrawerClose>
                    </DrawerHeader>
                    <div className="flex min-h-0 flex-1 flex-col p-4 pt-0">
                        <GroupMemberAddForm groupId={groupId} onMembersAdded={onMembersAdded} onClose={close} />
                    </div>
                </DrawerContent>
            </Drawer>
        );
    }

    return (
        <Sheet open={isOpen} onOpenChange={onOpenChange}>
            <SheetContent className="flex flex-col gap-6 sm:max-w-md">
                <SheetHeader className="pr-6 text-left">
                    <SheetTitle>{TITLE}</SheetTitle>
                    <SheetDescription>{DESCRIPTION}</SheetDescription>
                </SheetHeader>
                <GroupMemberAddForm groupId={groupId} onMembersAdded={onMembersAdded} onClose={close} />
            </SheetContent>
        </Sheet>
    );
}
