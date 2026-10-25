'use client';

import { useCallback, useState } from 'react';
import axios from 'axios';
import { ArrowRightLeft, Edit, Info, Loader2, Trash2, TriangleAlert } from 'lucide-react';
import type { ReactElement } from 'react';
import { postGroupAction } from '@/components/group/details/postGroupAction';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import type { GroupRoleClient } from '@/lib/constants';
import { GROUP_ROLE_CLIENT_LABELS, GROUP_ROLE_CLIENTS } from '@/lib/constants';
import type { GroupRole, GroupRoleOptionsResponse } from '@/lib/groupRoles';
import isNotEmptyString from '@/lib/utils/isNotEmptyString';
import { newRoleNamePattern } from '@/lib/validation/groupSchemas';

const misplacedLocationLabels: Record<'group' | 'admin', string> = {
    group: 'an der Gruppe selbst (gilt für Mitglieder und Admins)',
    admin: 'an der Admin-Gruppe',
};

// Select value for "create a new role".
const NEW_ROLE = '__new__';

const roleKey = (role: GroupRole): string => `${role.location}:${role.clientId}:${role.roleName}`;

const RoleRow = ({
    role,
    isPending,
    isBusy,
    onRemove,
    onMove,
}: {
    role: GroupRole;
    isPending: boolean;
    isBusy: boolean;
    onRemove: (confirmed: boolean) => void;
    onMove?: () => void;
}): ReactElement => (
    <li className="flex flex-wrap items-center justify-between gap-2 py-1">
        <span className="text-sm">
            <span className="text-muted-foreground">{GROUP_ROLE_CLIENT_LABELS[role.clientId]}:</span> {role.roleName}
            {role.location !== 'members' && (
                <span className="text-muted-foreground block text-xs">{misplacedLocationLabels[role.location]}</span>
            )}
        </span>
        <div className="flex gap-1">
            {isPending ? (
                <>
                    <Button size="sm" variant="ghost" onClick={() => onRemove(false)} disabled={isBusy}>
                        Abbrechen
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => onRemove(true)} disabled={isBusy}>
                        Entfernen
                    </Button>
                </>
            ) : (
                <>
                    {onMove !== undefined && (
                        <Button size="sm" variant="outline" onClick={onMove} disabled={isBusy}>
                            <ArrowRightLeft className="mr-1 size-4" />
                            Zur Mitgliedsgruppe
                        </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => onRemove(false)} disabled={isBusy} aria-label="Rolle entfernen">
                        <Trash2 className="size-4" />
                    </Button>
                </>
            )}
        </div>
    </li>
);

// Only for system admins. The API checks this too.
interface GroupRolesDialogProps {
    groupId: string;
    onRolesChanged: () => void;
}

const GroupRolesDialog = ({ groupId, onRolesChanged }: GroupRolesDialogProps): ReactElement => {
    const [open, setOpen] = useState(false);
    const [data, setData] = useState<GroupRoleOptionsResponse | null>(null);
    const [loadError, setLoadError] = useState(false);
    const [isBusy, setIsBusy] = useState(false);
    const [pendingRemoval, setPendingRemoval] = useState<string | null>(null);
    const [clientId, setClientId] = useState<GroupRoleClient>('nextcloud');
    const [roleName, setRoleName] = useState('');
    const [newRoleName, setNewRoleName] = useState('');

    const loadRoles = useCallback(async (): Promise<void> => {
        try {
            const response = await axios.get<GroupRoleOptionsResponse>('/api/group/roles', { params: { groupId, options: true } });
            setData(response.data);
            setLoadError(false);
        } catch {
            setLoadError(true);
        }
    }, [groupId]);

    const onOpenChange = (isOpen: boolean): void => {
        setOpen(isOpen);
        setPendingRemoval(null);
        if (isOpen) {
            setData(null);
            void loadRoles();
        }
    };

    const runAction = async (
        url: string,
        body: Record<string, unknown>,
        messages: { success: string; error: string },
    ): Promise<boolean> => {
        setIsBusy(true);
        const isSuccess = await postGroupAction(url, { groupId, ...body }, messages, () => {
            setPendingRemoval(null);
            onRolesChanged();
        });
        await loadRoles();
        setIsBusy(false);
        return isSuccess;
    };

    const removeRole = (role: GroupRole, confirmed: boolean): void => {
        const key = roleKey(role);
        if (!confirmed) {
            setPendingRemoval(pendingRemoval === key ? null : key);
            return;
        }

        void runAction(
            '/api/group/roles/remove',
            { clientId: role.clientId, roleName: role.roleName, location: role.location },
            { success: 'Die Rolle wurde entfernt.', error: 'Die Rolle konnte nicht entfernt werden.' },
        );
    };

    const moveRole = (role: GroupRole): void => {
        void runAction(
            '/api/group/roles/move',
            { clientId: role.clientId, roleName: role.roleName, from: role.location },
            { success: 'Die Rolle hängt jetzt an der Mitgliedsgruppe.', error: 'Die Rolle konnte nicht verschoben werden.' },
        );
    };

    const isNewRole = roleName === NEW_ROLE;
    const roleToAdd = isNewRole ? newRoleName.trim() : roleName;
    const isNewRoleNameValid = !isNewRole || newRoleNamePattern.test(roleToAdd);

    const addRole = async (): Promise<void> => {
        const isSuccess = await runAction(
            '/api/group/roles/add',
            { clientId, roleName: roleToAdd, create: isNewRole },
            { success: 'Die Rolle wurde vergeben.', error: 'Die Rolle konnte nicht vergeben werden.' },
        );
        if (isSuccess) {
            setRoleName('');
            setNewRoleName('');
        }
    };

    const memberRoles = data?.roles.filter((role) => role.location === 'members') ?? [];
    const misplacedRoles = data?.roles.filter((role) => role.location !== 'members') ?? [];
    const assignedNames = new Set(memberRoles.filter((role) => role.clientId === clientId).map((role) => role.roleName));
    const selectableRoles = (data?.availableRoles[clientId] ?? []).filter((name) => !assignedNames.has(name));
    const canCreate = data?.creatableClients.includes(clientId) ?? false;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                    <Edit className="mr-2 size-4" />
                    Bearbeiten
                </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>Rechte der Gruppe</DialogTitle>
                    <DialogDescription>
                        Rollen für Nextcloud, Payload und Nexus. Sie hängen an der Mitgliedsgruppe und gelten damit für alle Mitglieder.
                    </DialogDescription>
                </DialogHeader>

                <Alert>
                    <Info />
                    <AlertDescription>
                        <p>Änderungen wirken in den Diensten erst beim nächsten Login der Personen.</p>
                        {data !== null && data.includedGroupNames.length > 0 && (
                            <p>
                                Neue und entfernte Rollen gelten auch für die eingeschlossenen Gruppen: {data.includedGroupNames.join(', ')}
                                .
                            </p>
                        )}
                    </AlertDescription>
                </Alert>

                {data === null && !loadError && (
                    <div className="flex justify-center py-6">
                        <Loader2 className="size-6 animate-spin" />
                    </div>
                )}
                {loadError && <p className="text-sm text-red-600">Die Rollen konnten nicht geladen werden.</p>}

                {data !== null && (
                    <>
                        <div className="grid gap-2">
                            <h3 className="font-medium">Vergebene Rollen</h3>
                            {memberRoles.length === 0 ? (
                                <p className="text-muted-foreground text-sm">Die Gruppe hat noch keine Rollen.</p>
                            ) : (
                                <ul className="divide-y">
                                    {memberRoles.map((role) => (
                                        <RoleRow
                                            key={roleKey(role)}
                                            role={role}
                                            isPending={pendingRemoval === roleKey(role)}
                                            isBusy={isBusy}
                                            onRemove={(confirmed) => removeRole(role, confirmed)}
                                        />
                                    ))}
                                </ul>
                            )}
                        </div>

                        {misplacedRoles.length > 0 && (
                            <Alert>
                                <TriangleAlert />
                                <AlertTitle>Nicht an der Mitgliedsgruppe</AlertTitle>
                                <AlertDescription>
                                    <p>
                                        Diese Rollen stammen aus der alten Struktur. Verschiebe sie zur Mitgliedsgruppe oder entferne sie.
                                    </p>
                                    {data.adminsWithoutMembership.length > 0 && (
                                        <p className="mt-2">
                                            Nicht in der Mitgliedsgruppe und damit ohne die Rollen der Admin-Gruppe nach dem Verschieben:{' '}
                                            {data.adminsWithoutMembership.join(', ')}
                                        </p>
                                    )}
                                    <ul className="mt-2 w-full divide-y">
                                        {misplacedRoles.map((role) => (
                                            <RoleRow
                                                key={roleKey(role)}
                                                role={role}
                                                isPending={pendingRemoval === roleKey(role)}
                                                isBusy={isBusy}
                                                onRemove={(confirmed) => removeRole(role, confirmed)}
                                                onMove={() => moveRole(role)}
                                            />
                                        ))}
                                    </ul>
                                </AlertDescription>
                            </Alert>
                        )}

                        <Separator />

                        <div className="grid gap-3">
                            <h3 className="font-medium">Rolle hinzufügen</h3>
                            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
                                <div className="grid gap-1">
                                    <Label htmlFor="role-client">Dienst</Label>
                                    <Select
                                        value={clientId}
                                        onValueChange={(value) => {
                                            setClientId(value as GroupRoleClient);
                                            setRoleName('');
                                        }}
                                    >
                                        <SelectTrigger id="role-client">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {GROUP_ROLE_CLIENTS.map((client) => (
                                                <SelectItem key={client} value={client}>
                                                    {GROUP_ROLE_CLIENT_LABELS[client]}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid gap-1">
                                    <Label htmlFor="role-name">Rolle</Label>
                                    <Select value={roleName} onValueChange={setRoleName}>
                                        <SelectTrigger id="role-name">
                                            <SelectValue placeholder="Rolle wählen" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {canCreate && (
                                                <>
                                                    <SelectItem value={NEW_ROLE}>Neue Rolle anlegen …</SelectItem>
                                                    <SelectSeparator />
                                                </>
                                            )}
                                            {selectableRoles.map((name) => (
                                                <SelectItem key={name} value={name}>
                                                    {name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            {isNewRole && (
                                <div className="grid gap-1">
                                    <Label htmlFor="role-new-name">Name der neuen Rolle</Label>
                                    <Input
                                        id="role-new-name"
                                        value={newRoleName}
                                        onChange={(event) => setNewRoleName(event.target.value)}
                                        placeholder="z. B. kreis_festival_finanzen"
                                        autoComplete="off"
                                    />
                                    <p className={isNewRoleNameValid ? 'text-muted-foreground text-sm' : 'text-sm text-red-600'}>
                                        Nur Kleinbuchstaben, Ziffern, „_“ und „-“. In Nextcloud entsteht daraus eine Gruppe mit diesem
                                        Namen.
                                    </p>
                                </div>
                            )}
                            <Button onClick={addRole} disabled={isBusy || !isNotEmptyString(roleToAdd) || !isNewRoleNameValid}>
                                {isBusy ? <Loader2 className="size-4 animate-spin" /> : 'Hinzufügen'}
                            </Button>
                        </div>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
};

export default GroupRolesDialog;
