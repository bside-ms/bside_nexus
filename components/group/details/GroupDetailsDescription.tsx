'use client';

import { useState } from 'react';
import { isEmpty } from 'lodash-es';
import { Edit, ExternalLink, ShieldX, Star, Users } from 'lucide-react';
import Link from 'next/link';
import type { ReactElement } from 'react';
import { useBreakpointContext } from '@/components/common/BreakpointContext';
import { GroupDescriptionForm } from '@/components/group/details/GroupDetailsDescriptionForm';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
    Drawer,
    DrawerClose,
    DrawerContent,
    DrawerDescription,
    DrawerFooter,
    DrawerHeader,
    DrawerTitle,
    DrawerTrigger,
} from '@/components/ui/drawer';
import type { GroupAdminStatus } from '@/lib/db/groupActions';

export interface GroupDetailsProps {
    groupId: string;
    wikiLink: string;
    websiteLink: string;
    description: string;
    isAdmin: GroupAdminStatus;
    isGlobalAdmin: boolean;
}

const MemberStatusBadge = ({ isAdmin }: { isAdmin: GroupAdminStatus }): ReactElement => {
    return (
        <Badge variant={isAdmin === 'Admin' ? 'default' : 'secondary'}>
            {isAdmin === 'Admin' && (
                <>
                    <Star className="mr-1 size-3" /> Administrator*in
                </>
            )}
            {isAdmin === 'Member' && (
                <>
                    <Users className="mr-1 size-3" /> Mitglied
                </>
            )}
            {isAdmin === 'None' && (
                <>
                    <ShieldX className="mr-1 size-3" /> Gast
                </>
            )}
        </Badge>
    );
};

const GroupDetailsDescriptionMobile = ({
    groupId,
    wikiLink,
    websiteLink,
    description,
    isAdmin,
    isGlobalAdmin,
}: GroupDetailsProps): ReactElement => {
    const [open, setOpen] = useState(false);

    const isAdminOrGlobalAdmin = isAdmin === 'Admin' || isGlobalAdmin;

    return (
        <Drawer open={open} onOpenChange={setOpen}>
            <Card className="w-full max-w-full lg:max-w-[50%]">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle>Gruppenbeschreibung</CardTitle>
                    {isAdminOrGlobalAdmin && (
                        <DrawerTrigger asChild>
                            <Button size="sm" variant="outline">
                                <Edit className="mr-2 size-4" />
                                Gruppe bearbeiten
                            </Button>
                        </DrawerTrigger>
                    )}
                </CardHeader>
                <CardContent>
                    <p>{isEmpty(description) ? 'Diese Gruppe hat aktuell noch keine Beschreibung.' : description}</p>
                    <div className="mt-4 flex space-x-4">
                        <MemberStatusBadge isAdmin={isAdmin} />
                        {!isEmpty(websiteLink) && (
                            <Link href={websiteLink} target="_blank" className="flex items-center text-sm text-blue-600 hover:underline">
                                Website <ExternalLink className="ml-1 size-4" />
                            </Link>
                        )}
                        {!isEmpty(wikiLink) && (
                            <Link href={wikiLink} target="_blank" className="flex items-center text-sm text-blue-600 hover:underline">
                                Wiki <ExternalLink className="ml-1 size-4" />
                            </Link>
                        )}
                    </div>
                </CardContent>
            </Card>

            {isAdminOrGlobalAdmin && (
                <DrawerContent>
                    <DrawerHeader className="text-left">
                        <DrawerTitle>Gruppendetails bearbeiten</DrawerTitle>
                        <DrawerDescription>Bearbeite die Gruppendetails hier. Klicke speichern, wenn du fertig bist.</DrawerDescription>
                    </DrawerHeader>
                    <GroupDescriptionForm
                        className="px-4"
                        description={description}
                        groupId={groupId}
                        wikiLink={wikiLink}
                        websiteLink={websiteLink}
                    />
                    <DrawerFooter className="pt-2">
                        <DrawerClose asChild>
                            <Button variant="outline">Abbrechen</Button>
                        </DrawerClose>
                    </DrawerFooter>
                </DrawerContent>
            )}
        </Drawer>
    );
};

const GroupDetailsDescriptionDesktop = ({
    groupId,
    wikiLink,
    websiteLink,
    description,
    isAdmin,
    isGlobalAdmin,
}: GroupDetailsProps): ReactElement => {
    const [open, setOpen] = useState(false);

    const isAdminOrGlobalAdmin = isAdmin === 'Admin' || isGlobalAdmin;

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <Card className="col-span-2">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle>Gruppenbeschreibung</CardTitle>
                    {isAdminOrGlobalAdmin && (
                        <DialogTrigger asChild>
                            <Button size="sm" variant="outline">
                                <Edit className="mr-2 size-4" />
                                Gruppe bearbeiten
                            </Button>
                        </DialogTrigger>
                    )}
                </CardHeader>
                <CardContent>
                    <p>{isEmpty(description) ? 'Diese Gruppe hat aktuell noch keine Beschreibung.' : description}</p>
                    <div className="mt-4 flex space-x-4">
                        <MemberStatusBadge isAdmin={isAdmin} />
                        {!isEmpty(websiteLink) && (
                            <Link href={websiteLink} target="_blank" className="flex items-center text-sm text-blue-600 hover:underline">
                                Website <ExternalLink className="ml-1 size-4" />
                            </Link>
                        )}
                        {!isEmpty(wikiLink) && (
                            <Link href={wikiLink} target="_blank" className="flex items-center text-sm text-blue-600 hover:underline">
                                Wiki <ExternalLink className="ml-1 size-4" />
                            </Link>
                        )}
                    </div>
                </CardContent>
            </Card>

            {isAdminOrGlobalAdmin && (
                <DialogContent className="sm:max-w-[425px] md:max-w-[645px] lg:max-w-[890px]">
                    <DialogHeader>
                        <DialogTitle>Gruppendetails bearbeiten</DialogTitle>
                        <DialogDescription>Bearbeite die Gruppendetails hier. Klicke speichern, wenn du fertig bist.</DialogDescription>
                    </DialogHeader>
                    <GroupDescriptionForm description={description} groupId={groupId} wikiLink={wikiLink} websiteLink={websiteLink} />
                </DialogContent>
            )}
        </Dialog>
    );
};

export function GroupDetailsDescription({
    groupId,
    wikiLink,
    websiteLink,
    description,
    isAdmin,
    isGlobalAdmin,
}: GroupDetailsProps): ReactElement {
    const { isLg } = useBreakpointContext();

    if (!isLg) {
        return <GroupDetailsDescriptionMobile {...{ groupId, wikiLink, websiteLink, description, isAdmin, isGlobalAdmin }} />;
    }

    return <GroupDetailsDescriptionDesktop {...{ groupId, wikiLink, websiteLink, description, isAdmin, isGlobalAdmin }} />;
}
