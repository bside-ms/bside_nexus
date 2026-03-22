import type { ReactElement } from 'react';
import NavbarTop from '@/components/sidebar/NavbarTop';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import getUserSession from '@/lib/auth/getUserSession';
import { getAllPayrollHourly, getManagedContracts } from '@/lib/db/hrpAdminActions';

const breadCrumbs = [
    { title: 'Zeiterfassung', url: '/hrp' },
    { title: 'Administration', url: '/hrp/admin' },
    { title: 'Abrechnungen', active: true },
];

const monthLabel = (monthZeroBased: number) =>
    new Date(2000, monthZeroBased, 1).toLocaleDateString('de-DE', {
        month: 'long',
    });

export default async function PayrollPage(): Promise<ReactElement> {
    const session = await getUserSession();
    const contracts = await getManagedContracts(session!.id);

    const payrolls = await getAllPayrollHourly();
    const filteredPayrolls = payrolls.filter((p) => contracts.some((c) => c.id === p.contractId));

    // Grouping by year and month
    const grouped = filteredPayrolls.reduce<Record<string, { year: number; month: number; items: typeof payrolls }>>((acc, p) => {
        const key = `${p.year}-${String(p.month + 1).padStart(2, '0')}`;
        if (!acc[key]) {
            acc[key] = {
                year: p.year,
                month: p.month,
                items: [],
            };
        }
        acc[key].items.push(p);
        return acc;
    }, {});

    const sortedKeys = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

    return (
        <div>
            <NavbarTop items={breadCrumbs} sidebar={true} />
            <div className="p-6 space-y-6 max-w-7xl mx-auto">
                <div className="flex justify-between items-center">
                    <h1 className="text-3xl font-bold">Abrechnungen</h1>
                </div>

                {payrolls.length === 0 ? (
                    <Card>
                        <CardHeader>
                            <CardTitle>Abgeschlossene Abrechnungen (Stundenbasis)</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-center py-12 text-muted-foreground">Noch keine Abrechnungen vorhanden.</div>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-8">
                        {sortedKeys.map((key) => {
                            const group = grouped[key];
                            if (group === undefined) {
                                return <div key={key} />;
                            }
                            return (
                                <Card key={key} className="overflow-hidden border-2 border-primary/10">
                                    <CardHeader className="bg-primary/5 border-b py-4">
                                        <CardTitle className="text-lg flex items-center justify-between">
                                            <span>
                                                Abrechnungszeitraum: {monthLabel(group.month)} {group.year}
                                            </span>
                                            <Badge variant="secondary" className="font-mono">
                                                {group.items.length} {group.items.length === 1 ? 'Eintrag' : 'Einträge'}
                                            </Badge>
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-0">
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-sm text-left border-collapse">
                                                <thead className="bg-muted/50 text-muted-foreground border-b uppercase text-[10px] tracking-wider">
                                                    <tr>
                                                        <th className="p-4 font-semibold">Mitarbeiter*in</th>
                                                        <th className="p-4 font-semibold text-right">Stunden</th>
                                                        <th className="p-4 font-semibold text-right">Auszahlung</th>
                                                        <th className="p-4 font-semibold">Abgeschlossen am</th>
                                                        <th className="p-4 font-semibold">Status</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {group.items.map((p) => (
                                                        <tr
                                                            key={p.id}
                                                            className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                                                        >
                                                            <td className="p-4 font-medium">{p.userName}</td>
                                                            <td className="p-4 text-right font-mono">{p.finalPayoutHours} h</td>
                                                            <td className="p-4 text-right font-mono font-semibold">-</td>
                                                            <td className="p-4 text-muted-foreground">
                                                                {p.finalizedAt?.toLocaleString('de-DE', {
                                                                    day: '2-digit',
                                                                    month: '2-digit',
                                                                    year: 'numeric',
                                                                    hour: '2-digit',
                                                                    minute: '2-digit',
                                                                })}
                                                            </td>
                                                            <td className="p-4">
                                                                <Badge
                                                                    variant="outline"
                                                                    className="bg-green-50 text-green-700 border-green-200"
                                                                >
                                                                    {p.status === 'finalized' ? 'Abgeschlossen' : p.status}
                                                                </Badge>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                )}

                <div className="text-sm text-muted-foreground bg-slate-50 p-4 rounded-md border border-slate-200 italic">
                    Hinweis: Hier werden aktuell nur Abrechnungen für Mitarbeitende auf Stundenbasis aufgeführt. Die Details einer
                    Abrechnung können über die entsprechende Mitarbeiter-Ansicht in der Übersicht eingesehen werden.
                </div>
            </div>
        </div>
    );
}
