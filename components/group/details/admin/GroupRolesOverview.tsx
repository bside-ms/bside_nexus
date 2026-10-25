'use client';

import { useCallback, useState } from 'react';
import axios from 'axios';
import { KeyRound, Loader2 } from 'lucide-react';
import type { ReactElement } from 'react';
import GroupRolesDialog from '@/components/group/details/admin/GroupRolesDialog';
import { GROUP_ROLE_CLIENT_LABELS } from '@/lib/constants';
import type { GroupRolesResponse } from '@/lib/groupRoles';
import useAsyncEffectOnMount from '@/lib/utils/useAsyncEffectOnMount';

const locationHints = {
    members: '',
    group: ' (an der Gruppe selbst)',
    admin: ' (an der Admin-Gruppe)',
};

// Only for system admins. Loaded after the page, so Keycloak does not slow it down.
const GroupRolesOverview = ({ groupId }: { groupId: string }): ReactElement => {
    const [roles, setRoles] = useState<GroupRolesResponse['roles'] | null>(null);
    const [loadError, setLoadError] = useState(false);

    const loadRoles = useCallback(async (): Promise<void> => {
        try {
            const response = await axios.get<GroupRolesResponse>('/api/group/roles', { params: { groupId } });
            setRoles(response.data.roles);
            setLoadError(false);
        } catch {
            setLoadError(true);
        }
    }, [groupId]);

    useAsyncEffectOnMount(loadRoles);

    return (
        <div className="grid gap-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-muted-foreground text-sm">Keycloak-Rollen (nur für System-Admins sichtbar)</span>
                <GroupRolesDialog groupId={groupId} onRolesChanged={loadRoles} />
            </div>
            {roles === null && !loadError && (
                <div className="text-muted-foreground flex items-center gap-2 text-sm">
                    <Loader2 className="size-4 animate-spin" />
                    Lädt …
                </div>
            )}
            {loadError && <p className="text-sm text-red-600">Die Rollen konnten nicht geladen werden.</p>}
            {roles?.length === 0 && <p className="text-muted-foreground text-sm">Die Gruppe hat keine Rollen.</p>}
            {roles !== null && roles.length > 0 && (
                <ul className="grid gap-1">
                    {roles.map((role) => (
                        <li key={`${role.location}:${role.clientId}:${role.roleName}`} className="flex items-center gap-2 text-sm">
                            <KeyRound className="size-4 shrink-0" />
                            <span>
                                {GROUP_ROLE_CLIENT_LABELS[role.clientId]}: {role.roleName}
                                <span className="text-muted-foreground">{locationHints[role.location]}</span>
                            </span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default GroupRolesOverview;
