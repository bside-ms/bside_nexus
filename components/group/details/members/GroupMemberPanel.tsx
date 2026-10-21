'use client';

/* eslint-disable react/jsx-no-bind */

import { X } from 'lucide-react';
import type { ReactElement } from 'react';
import type { GroupMemberActionContext } from '@/components/group/details/members/GroupMemberActions';
import { GroupMemberDetails } from '@/components/group/details/members/GroupMemberDetails';
import type { GroupMember } from '@/components/group/details/members/GroupMembersColumns';
import { GroupMemberAvatar } from '@/components/group/details/members/GroupMembersColumns';
import { Button } from '@/components/ui/button';
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';

export type GroupMemberPanelVariant = 'drawer' | 'sheet';

export interface GroupMemberPanelSelection {
    member: GroupMember;
    // The mobile list opens a drawer, the desktop table a sheet.
    variant: GroupMemberPanelVariant;
}

interface GroupMemberPanelProps {
    // Kept after closing, so the panel does not go blank during its close animation.
    selection: GroupMemberPanelSelection | null;
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    // Without actionContext (no group admin), only the copy actions are shown.
    actionContext?: GroupMemberActionContext;
}

export function GroupMemberPanel({ selection, isOpen, onOpenChange, actionContext }: GroupMemberPanelProps): ReactElement | null {
    if (selection === null) {
        return null;
    }

    const { member, variant } = selection;
    const close = (): void => onOpenChange(false);

    if (variant === 'drawer') {
        return (
            <Drawer open={isOpen} onOpenChange={onOpenChange}>
                <DrawerContent>
                    <DrawerHeader className="flex items-center gap-3 text-left">
                        <GroupMemberAvatar username={member.username} className="size-12" />
                        <div className="min-w-0 flex-1">
                            <DrawerTitle className="truncate">{member.displayName}</DrawerTitle>
                            <DrawerDescription className="truncate">@{member.username}</DrawerDescription>
                        </div>
                        <DrawerClose asChild>
                            <Button variant="ghost" size="icon" className="shrink-0">
                                <X />
                                <span className="sr-only">Schließen</span>
                            </Button>
                        </DrawerClose>
                    </DrawerHeader>
                    <GroupMemberDetails member={member} actionContext={actionContext} onClose={close} className="p-4 pt-0" />
                </DrawerContent>
            </Drawer>
        );
    }

    return (
        <Sheet open={isOpen} onOpenChange={onOpenChange}>
            <SheetContent className="flex flex-col gap-6">
                <SheetHeader className="flex-row items-center gap-3 space-y-0 pr-6 text-left">
                    <GroupMemberAvatar username={member.username} className="size-12" />
                    <div className="min-w-0 flex-1">
                        <SheetTitle className="truncate">{member.displayName}</SheetTitle>
                        <SheetDescription className="truncate">@{member.username}</SheetDescription>
                    </div>
                </SheetHeader>
                <GroupMemberDetails member={member} actionContext={actionContext} onClose={close} />
            </SheetContent>
        </Sheet>
    );
}
