'use client';

import { useState } from 'react';
import { FileCheck2, Loader2, Upload } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { ReactElement } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export interface ProtocolScanView {
    id: string;
    fileName: string;
    uploadedAt: string;
    uploadedByName: string | null;
}

interface ProtocolScansProps {
    protocolId: string;
    scans: Array<ProtocolScanView>;
    protocolDate: string | null;
    isConfigured: boolean;
}

const formatDateTime = (iso: string): string =>
    new Date(iso).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

// Lists the signed scans (newest first) and uploads a new one together with the date written on the paper.
const ProtocolScans = ({ protocolId, scans, protocolDate, isConfigured }: ProtocolScansProps): ReactElement => {
    const router = useRouter();
    const [file, setFile] = useState<File | null>(null);
    const [date, setDate] = useState(protocolDate ?? '');
    const [dateUnknown, setDateUnknown] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [current, ...older] = scans;

    const onUpload = async (): Promise<void> => {
        if (file === null) {
            return;
        }
        setIsLoading(true);
        const body = new FormData();
        body.append('file', file);
        body.append('date', dateUnknown ? '' : date);
        try {
            const response = await fetch(`/api/key/protocols/${protocolId}/scans`, { method: 'POST', body });
            const data = (await response.json().catch(() => ({}))) as { success?: boolean; error?: string };
            if (response.ok && data.success === true) {
                toast.success('Der Scan wurde in der Nextcloud abgelegt.');
                setFile(null);
                router.refresh();
            } else {
                toast.error(data.error ?? 'Der Scan konnte nicht hochgeladen werden.');
            }
        } catch {
            toast.error('Der Scan konnte nicht hochgeladen werden.');
        }
        setIsLoading(false);
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-lg">Unterschriebene Quittung</CardTitle>
                <CardDescription>
                    Scan oder Foto der unterschriebenen Quittung. Er wird in der Nextcloud abgelegt und dort nie überschrieben.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {current === undefined ? (
                    <p className="text-sm text-amber-600 dark:text-amber-400">Noch kein Scan hochgeladen.</p>
                ) : (
                    <div className="space-y-2 text-sm">
                        <a
                            href={`/api/key/protocols/${protocolId}/scans/${current.id}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 font-medium hover:underline"
                        >
                            <FileCheck2 className="size-4 text-green-600 dark:text-green-400" />
                            {current.fileName}
                        </a>
                        <p className="text-muted-foreground">
                            Hochgeladen am {formatDateTime(current.uploadedAt)}
                            {current.uploadedByName === null ? '' : ` von ${current.uploadedByName}`}
                        </p>
                        {older.length > 0 && (
                            <details className="text-muted-foreground">
                                <summary className="cursor-pointer">Frühere Scans ({older.length})</summary>
                                <ul className="mt-2 space-y-1">
                                    {older.map((scan) => (
                                        <li key={scan.id}>
                                            <a
                                                href={`/api/key/protocols/${protocolId}/scans/${scan.id}`}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="hover:underline"
                                            >
                                                {scan.fileName}
                                            </a>{' '}
                                            · {formatDateTime(scan.uploadedAt)}
                                        </li>
                                    ))}
                                </ul>
                            </details>
                        )}
                    </div>
                )}

                {isConfigured ? (
                    <div className="grid gap-3 border-t pt-4 sm:grid-cols-[1fr_12rem]">
                        <div className="grid gap-1.5">
                            <Label htmlFor="scan-file">{current === undefined ? 'Scan hochladen' : 'Neuen Scan hochladen'}</Label>
                            <Input
                                id="scan-file"
                                type="file"
                                accept="application/pdf,image/jpeg,image/png"
                                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                            />
                            <p className="text-xs text-muted-foreground">PDF, JPG oder PNG, höchstens 20 MB.</p>
                        </div>
                        <div className="grid content-start gap-1.5">
                            <Label htmlFor="scan-date">Datum auf der Quittung</Label>
                            <Input
                                id="scan-date"
                                type="date"
                                value={date}
                                disabled={dateUnknown}
                                onChange={(event) => setDate(event.target.value)}
                            />
                            <div className="flex items-center gap-2">
                                <Checkbox
                                    id="scan-date-unknown"
                                    checked={dateUnknown}
                                    onCheckedChange={(checked) => setDateUnknown(checked === true)}
                                />
                                <Label htmlFor="scan-date-unknown" className="font-normal">
                                    Kein Datum auf der Quittung
                                </Label>
                            </div>
                        </div>
                        <div className="sm:col-span-2">
                            <Button onClick={onUpload} disabled={file === null || isLoading || (!dateUnknown && date === '')}>
                                {isLoading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="mr-2 size-4" />}
                                Hochladen
                            </Button>
                        </div>
                    </div>
                ) : (
                    <p className="border-t pt-4 text-sm text-muted-foreground">
                        Die Nextcloud-Anbindung ist noch nicht eingerichtet, deshalb können noch keine Scans hochgeladen werden.
                    </p>
                )}
            </CardContent>
        </Card>
    );
};

export default ProtocolScans;
