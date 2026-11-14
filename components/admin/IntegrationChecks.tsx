'use client';

import { useState } from 'react';
import type { ReactElement } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

interface FolderStatus {
    path: string;
    purpose: 'write' | 'read';
    status: 'ok' | 'missing' | number;
}

type Delivery = { status: 'sent' | 'redirected'; postId: string } | { status: 'skipped'; reason: string };

interface CheckResponse {
    success?: boolean;
    error?: string;
    folders?: Array<FolderStatus>;
    deliveries?: Array<Delivery>;
}

const post = async (url: string, body: object): Promise<CheckResponse | null> => {
    try {
        const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        const data = (await response.json().catch(() => ({}))) as CheckResponse;
        if (response.ok && data.success === true) {
            return data;
        }
        toast.error(data.error ?? 'Die Prüfung ist fehlgeschlagen.');
        return null;
    } catch {
        toast.error('Die Prüfung ist fehlgeschlagen.');
        return null;
    }
};

const folderStatusText = (folder: FolderStatus): string => {
    if (folder.status === 'ok') {
        return 'erreichbar';
    }
    if (folder.status === 'missing') {
        return folder.purpose === 'write' ? 'existiert noch nicht (wird beim ersten Upload angelegt)' : 'nicht gefunden';
    }
    return `Fehler (HTTP ${folder.status})`;
};

const deliveryText = (delivery: Delivery): string => {
    if (delivery.status === 'skipped') {
        return `nicht gesendet: ${delivery.reason}`;
    }
    return delivery.status === 'sent' ? 'gesendet' : 'in den Test-Kanal umgeleitet';
};

export const NextcloudCheck = (): ReactElement => {
    const [isLoading, setIsLoading] = useState(false);
    const [folders, setFolders] = useState<Array<FolderStatus> | null>(null);

    const onCheck = async (): Promise<void> => {
        setIsLoading(true);
        const data = await post('/api/admin/integrations/nextcloud', {});
        setFolders(data?.folders ?? null);
        setIsLoading(false);
    };

    return (
        <div className="space-y-3">
            <Button variant="outline" onClick={onCheck} disabled={isLoading}>
                Ordner prüfen
            </Button>
            {folders !== null && (
                <ul className="space-y-1 text-sm">
                    {folders.map((folder) => (
                        <li key={folder.path}>
                            <span className="font-mono">{folder.path}</span> ({folder.purpose === 'write' ? 'Uploads' : 'nur lesen'}):{' '}
                            {folderStatusText(folder)}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

interface MattermostCheckProps {
    canTestThread: boolean;
}

export const MattermostCheck = ({ canTestThread }: MattermostCheckProps): ReactElement => {
    const [isLoading, setIsLoading] = useState(false);
    const [deliveries, setDeliveries] = useState<Array<Delivery> | null>(null);

    const onSend = async (kind: 'dm' | 'thread'): Promise<void> => {
        setIsLoading(true);
        const data = await post('/api/admin/integrations/mattermost', { kind });
        setDeliveries(data?.deliveries ?? null);
        setIsLoading(false);
    };

    return (
        <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => onSend('dm')} disabled={isLoading}>
                    Test-DM an mich
                </Button>
                {canTestThread && (
                    <Button variant="outline" onClick={() => onSend('thread')} disabled={isLoading}>
                        Thread im Test-Kanal
                    </Button>
                )}
            </div>
            {deliveries !== null && (
                <ul className="space-y-1 text-sm">
                    {deliveries.map((delivery, index) => (
                        <li key={index}>
                            Nachricht {index + 1}: {deliveryText(delivery)}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};
