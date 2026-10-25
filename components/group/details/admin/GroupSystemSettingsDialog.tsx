'use client';

import { useState } from 'react';
import axios from 'axios';
import { Archive, ArchiveRestore, Loader2, Settings2, TriangleAlert, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { ReactElement } from 'react';
import CategorySelect from '@/components/group/details/admin/CategorySelect';
import { postGroupAction } from '@/components/group/details/postGroupAction';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { GROUP_ROLE_CLIENT_LABELS } from '@/lib/constants';
import type { GroupRole, GroupRolesResponse } from '@/lib/groupRoles';

interface GroupSystemSettingsDialogProps {
    groupId: string;
    displayName: string;
    categoryName: string;
    // Existing categories, only needed for groups without a parent.
    categories: Array<string>;
    includedGroupIds: Array<string>;
    // All other groups, to choose the included ones from.
    groupOptions: Array<{ id: string; displayName: string }>;
    hidden: boolean;
    parentAdminsManage: boolean;
    isSubgroup: boolean;
    isArchived: boolean;
    // Always false for groups without a parent.
    parentArchived: boolean;
    subgroupCount: number;
    adminCount: number;
}

// Only for system admins. The API checks this too.
const GroupSystemSettingsDialog = ({
    groupId,
    displayName,
    categoryName,
    categories,
    includedGroupIds,
    groupOptions,
    hidden,
    parentAdminsManage,
    isSubgroup,
    isArchived,
    parentArchived,
    subgroupCount,
    adminCount,
}: GroupSystemSettingsDialogProps): ReactElement => {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [newDisplayName, setNewDisplayName] = useState(displayName);
    const [newCategoryName, setNewCategoryName] = useState(categoryName);
    const [newIncludedGroupIds, setNewIncludedGroupIds] = useState(includedGroupIds);
    const [newHidden, setNewHidden] = useState(hidden);
    const [newParentAdminsManage, setNewParentAdminsManage] = useState(parentAdminsManage);
    const [confirmArchive, setConfirmArchive] = useState(false);
    // Set while asking whether removed included groups lose the roles of this group.
    const [rolesToRemove, setRolesToRemove] = useState<Array<GroupRole> | null>(null);

    const onOpenChange = (isOpen: boolean): void => {
        // Start from the saved values each time.
        setNewDisplayName(displayName);
        setNewCategoryName(categoryName);
        setNewIncludedGroupIds(includedGroupIds);
        setNewHidden(hidden);
        setNewParentAdminsManage(parentAdminsManage);
        setConfirmArchive(false);
        setRolesToRemove(null);
        setOpen(isOpen);
    };

    const onChanged = (): void => {
        setOpen(false);
        router.refresh();
    };

    const saveSettings = async (removeRolesFromRemovedGroups: boolean): Promise<void> => {
        setIsLoading(true);
        await postGroupAction(
            '/api/group/settings',
            {
                groupId,
                displayName: newDisplayName.trim(),
                // Subgroups show the category of their parent.
                ...(isSubgroup ? {} : { categoryName: newCategoryName.trim() }),
                includedGroupIds: newIncludedGroupIds,
                removeRolesFromRemovedGroups,
                hidden: newHidden,
                parentAdminsManage: isSubgroup && newParentAdminsManage,
            },
            { success: 'Die Einstellungen wurden gespeichert.', error: 'Die Einstellungen konnten nicht gespeichert werden.' },
            onChanged,
        );
        setIsLoading(false);
    };

    const removedGroupIds = includedGroupIds.filter((id) => !newIncludedGroupIds.includes(id));

    // Asks first if included groups were removed and this group has roles they could lose.
    const onSave = async (): Promise<void> => {
        if (removedGroupIds.length === 0) {
            await saveSettings(false);
            return;
        }

        setIsLoading(true);
        try {
            const response = await axios.get<GroupRolesResponse>('/api/group/roles', { params: { groupId } });
            const memberRoles = response.data.roles.filter((role) => role.location === 'members');
            if (memberRoles.length > 0) {
                setRolesToRemove(memberRoles);
                setIsLoading(false);
                return;
            }
        } catch {
            // If the roles can not be loaded, save without removing them.
        }
        await saveSettings(false);
    };

    const setArchived = async (archived: boolean): Promise<void> => {
        setIsLoading(true);
        await postGroupAction(
            '/api/group/archive',
            { groupId, archived },
            {
                success: archived ? 'Die Gruppe wurde archiviert.' : 'Die Gruppe wurde wiederhergestellt.',
                error: 'Der Archiv-Status konnte nicht geändert werden.',
            },
            onChanged,
        );
        setIsLoading(false);
    };

    // Same limits as the API.
    const trimmedDisplayName = newDisplayName.trim();
    const isDisplayNameValid = trimmedDisplayName.length >= 3 && trimmedDisplayName.length <= 100;
    const hasChanges =
        trimmedDisplayName !== displayName ||
        newCategoryName.trim() !== categoryName ||
        newIncludedGroupIds.join() !== includedGroupIds.join() ||
        newHidden !== hidden ||
        newParentAdminsManage !== parentAdminsManage;
    const groupNames = new Map(groupOptions.map((option) => [option.id, option.displayName]));
    const selectableGroups = groupOptions.filter((option) => !newIncludedGroupIds.includes(option.id));

    const losesManagers = isSubgroup && parentAdminsManage && !newParentAdminsManage && adminCount === 0;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                    <Settings2 className="mr-2 size-4" />
                    Systemverwaltung
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[520px]">
                <DialogHeader>
                    <DialogTitle>Systemverwaltung</DialogTitle>
                    <DialogDescription>Diese Einstellungen können nur System-Admins ändern.</DialogDescription>
                </DialogHeader>

                <div className="grid gap-4">
                    <div className="grid gap-1">
                        <Label htmlFor="group-display-name">Anzeigename</Label>
                        <Input
                            id="group-display-name"
                            value={newDisplayName}
                            onChange={(event) => setNewDisplayName(event.target.value)}
                            autoComplete="off"
                            maxLength={100}
                        />
                        <p className={isDisplayNameValid ? 'text-muted-foreground text-sm' : 'text-sm text-red-600'}>
                            {isDisplayNameValid
                                ? 'Name und Pfad in Keycloak bleiben gleich.'
                                : 'Der Anzeigename muss zwischen 3 und 100 Zeichen lang sein.'}
                        </p>
                    </div>

                    {!isSubgroup && (
                        <div className="grid gap-1">
                            <Label htmlFor="group-category">Kategorie</Label>
                            <CategorySelect
                                id="group-category"
                                value={newCategoryName}
                                onChange={setNewCategoryName}
                                categories={categories}
                                allowEmpty={true}
                            />
                            <p className="text-muted-foreground text-sm">Ohne Kategorie erscheint die Gruppe nicht in der Seitenleiste.</p>
                        </div>
                    )}

                    <div className="grid gap-2">
                        <Label htmlFor="group-included">Eingeschlossene Gruppen</Label>
                        {newIncludedGroupIds.length > 0 && (
                            <ul className="flex flex-wrap gap-2">
                                {newIncludedGroupIds.map((includedGroupId) => (
                                    <li
                                        key={includedGroupId}
                                        className="flex items-center gap-1 rounded-md border py-0.5 pr-0.5 pl-2 text-sm"
                                    >
                                        {groupNames.get(includedGroupId) ?? includedGroupId}
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="size-6"
                                            onClick={() =>
                                                setNewIncludedGroupIds(newIncludedGroupIds.filter((id) => id !== includedGroupId))
                                            }
                                        >
                                            <X className="size-3.5" />
                                            <span className="sr-only">{groupNames.get(includedGroupId)} entfernen</span>
                                        </Button>
                                    </li>
                                ))}
                            </ul>
                        )}
                        <Select value="" onValueChange={(id) => setNewIncludedGroupIds([...newIncludedGroupIds, id])}>
                            <SelectTrigger id="group-included">
                                <SelectValue placeholder="Gruppe hinzufügen" />
                            </SelectTrigger>
                            <SelectContent>
                                {selectableGroups.map((option) => (
                                    <SelectItem key={option.id} value={option.id}>
                                        {option.displayName}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <p className="text-muted-foreground text-sm">
                            Ihre Mitglieder werden hier mit angezeigt, lassen sich aber nur in ihrer Gruppe ändern. Beim Speichern erhalten
                            neu eingeschlossene Gruppen die Rollen dieser Gruppe.
                        </p>
                    </div>

                    <div className="flex items-start gap-3">
                        <Checkbox id="group-hidden" checked={newHidden} onCheckedChange={(checked) => setNewHidden(checked === true)} />
                        <div className="grid gap-1 leading-none">
                            <Label htmlFor="group-hidden">Versteckt</Label>
                            <p className="text-muted-foreground text-sm">Nur Mitglieder und Verwaltende sehen die Gruppe.</p>
                        </div>
                    </div>

                    {isSubgroup && (
                        <div className="flex items-start gap-3">
                            <Checkbox
                                id="group-parent-admins-manage"
                                checked={newParentAdminsManage}
                                onCheckedChange={(checked) => setNewParentAdminsManage(checked === true)}
                            />
                            <div className="grid gap-1 leading-none">
                                <Label htmlFor="group-parent-admins-manage">Admins der Obergruppe dürfen verwalten</Label>
                                <p className="text-muted-foreground text-sm">Gilt nur in Nexus, nicht in Keycloak.</p>
                            </div>
                        </div>
                    )}

                    {losesManagers && (
                        <Alert>
                            <TriangleAlert />
                            <AlertDescription>
                                Die Gruppe hat keine eigenen Administrator*innen. Danach können sie nur noch System-Admins verwalten.
                            </AlertDescription>
                        </Alert>
                    )}

                    {rolesToRemove === null ? (
                        <Button onClick={onSave} disabled={isLoading || !hasChanges || !isDisplayNameValid}>
                            {isLoading ? <Loader2 className="size-4 animate-spin" /> : 'Speichern'}
                        </Button>
                    ) : (
                        <Alert>
                            <TriangleAlert />
                            <AlertDescription className="grid gap-3">
                                <p>
                                    {removedGroupIds.map((id) => groupNames.get(id) ?? id).join(', ')}{' '}
                                    {removedGroupIds.length === 1 ? 'wird' : 'werden'} nicht mehr eingeschlossen. Sollen diese Rollen dort
                                    ebenfalls entfernt werden?
                                </p>
                                <ul className="list-disc pl-5">
                                    {rolesToRemove.map((role) => (
                                        <li key={`${role.clientId}:${role.roleName}`}>
                                            {GROUP_ROLE_CLIENT_LABELS[role.clientId]}: {role.roleName}
                                        </li>
                                    ))}
                                </ul>
                                <p>Hatte eine Gruppe eine dieser Rollen auch unabhängig davon, verliert sie sie trotzdem.</p>
                                <div className="grid gap-2 sm:grid-cols-3">
                                    <Button variant="outline" onClick={() => setRolesToRemove(null)} disabled={isLoading}>
                                        Zurück
                                    </Button>
                                    <Button variant="outline" onClick={() => saveSettings(false)} disabled={isLoading}>
                                        Rollen behalten
                                    </Button>
                                    <Button variant="destructive" onClick={() => saveSettings(true)} disabled={isLoading}>
                                        {isLoading ? <Loader2 className="size-4 animate-spin" /> : 'Rollen entfernen'}
                                    </Button>
                                </div>
                            </AlertDescription>
                        </Alert>
                    )}
                </div>

                <Separator />

                <div className="grid gap-3">
                    <h3 className="font-medium">{isArchived ? 'Wiederherstellen' : 'Archivieren'}</h3>
                    {!isArchived && !confirmArchive && (
                        <>
                            <p className="text-muted-foreground text-sm">
                                Archivierte Gruppen bleiben mit Mitgliedern sichtbar, werden aber getrennt aufgelistet.
                                {subgroupCount > 0 && ' Die Untergruppen gelten dann ebenfalls als archiviert.'}
                            </p>
                            <Button variant="outline" onClick={() => setConfirmArchive(true)} disabled={isLoading}>
                                <Archive className="mr-2 size-4" />
                                Archivieren
                            </Button>
                        </>
                    )}
                    {!isArchived && confirmArchive && (
                        <>
                            <p className="text-sm">
                                Soll die Gruppe wirklich archiviert werden? Rechte und Mitgliedschaften bleiben bestehen.
                            </p>
                            <div className="grid grid-cols-2 gap-2">
                                <Button variant="outline" onClick={() => setConfirmArchive(false)} disabled={isLoading}>
                                    Abbrechen
                                </Button>
                                <Button variant="destructive" onClick={() => setArchived(true)} disabled={isLoading}>
                                    {isLoading ? <Loader2 className="size-4 animate-spin" /> : 'Archivieren'}
                                </Button>
                            </div>
                        </>
                    )}
                    {isArchived && (
                        <>
                            <p className="text-muted-foreground text-sm">
                                {parentArchived
                                    ? 'Die Obergruppe ist archiviert. Stelle zuerst sie wieder her.'
                                    : 'Die Gruppe wird wieder als aktiv aufgelistet.'}
                            </p>
                            <Button variant="outline" onClick={() => setArchived(false)} disabled={isLoading || parentArchived}>
                                <ArchiveRestore className="mr-2 size-4" />
                                Wiederherstellen
                            </Button>
                        </>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default GroupSystemSettingsDialog;
