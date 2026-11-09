import { FileText, KeyRound, Users } from 'lucide-react';
import Link from 'next/link';
import type { ReactElement } from 'react';
import NavTile from '@/components/common/NavTile';
import KeyPageShell from '@/components/key/KeyPageShell';
import ProtocolTable from '@/components/key/ProtocolTable';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getKeyOverviewStats } from '@/lib/db/keyActions';
import { countProtocolsWithoutScan, listProtocols } from '@/lib/db/keyProtocolActions';
import requireKeyPageAccess from '@/lib/key/requireKeyPageAccess';

export default async function KeyOverviewPage(): Promise<ReactElement> {
    await requireKeyPageAccess();
    const [stats, recentProtocols, withoutScan] = await Promise.all([
        getKeyOverviewStats(),
        listProtocols({ limit: 8 }),
        countProtocolsWithoutScan(),
    ]);

    const statCards = [
        { label: 'Ausgegebene Schlüssel', value: stats.keysIssued },
        { label: 'Schließungen', value: stats.keyTypes },
        { label: 'Personen', value: stats.persons },
        { label: 'Tresore', value: stats.safes },
    ];

    return (
        <KeyPageShell title="Schlüsselverwaltung" description="Wer hat welche Schlüssel? Ausgaben, Rückgaben und Verluste mit Quittung.">
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                {statCards.map((stat) => (
                    <Card key={stat.label}>
                        <CardHeader className="pb-2">
                            <CardDescription>{stat.label}</CardDescription>
                            <CardTitle className="text-3xl tabular-nums">{stat.value}</CardTitle>
                        </CardHeader>
                    </Card>
                ))}
            </div>

            {withoutScan > 0 && (
                <Alert>
                    <AlertTitle>{withoutScan === 1 ? '1 Quittung' : `${withoutScan} Quittungen`} ohne unterschriebenen Scan</AlertTitle>
                    <AlertDescription>
                        <Link href="/key/protocols?ohneScan=1" className="underline">
                            Zur Liste
                        </Link>
                    </AlertDescription>
                </Alert>
            )}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <NavTile
                    title="Personen und Tresore"
                    description="Schlüssel ausgeben, zurücknehmen und Verluste melden."
                    href="/key/profiles"
                    icon={Users}
                />
                <NavTile title="Schließungen" description="Schlüsselarten, Bestand und wer sie hat." href="/key/types" icon={KeyRound} />
                <NavTile title="Protokolle" description="Alle Quittungen mit PDF-Download." href="/key/protocols" icon={FileText} />
            </div>

            <Card>
                <CardHeader className="flex-row items-center justify-between space-y-0">
                    <CardTitle className="text-lg">Letzte Protokolle</CardTitle>
                    <Button asChild variant="outline" size="sm">
                        <Link href="/key/protocols">Alle anzeigen</Link>
                    </Button>
                </CardHeader>
                <CardContent>
                    <ProtocolTable protocols={recentProtocols} />
                </CardContent>
            </Card>

            <p className="text-sm text-muted-foreground">
                Transponder werden in wAppLoxx verwaltet. Hier stehen sie nur, wenn sie auf einer Quittung vermerkt sind.
            </p>
        </KeyPageShell>
    );
}
