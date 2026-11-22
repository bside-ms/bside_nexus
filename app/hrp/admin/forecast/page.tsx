import type { Metadata } from 'next';
import type { ReactElement } from 'react';
import type { ForecastPlanningRow } from '@/components/hrp/admin/ForecastPlanningClient';
import ForecastPlanningClient from '@/components/hrp/admin/ForecastPlanningClient';
import NavbarTop from '@/components/sidebar/NavbarTop';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { isGlobalAdmin } from '@/lib/db/groupActions';
import { getForecastPlanRows } from '@/lib/db/hrpAdminActions';
import { getForecastPlannerSession } from '@/lib/hrp/adminAccess';
import { getForecastWindow } from '@/lib/hrp/forecast';
import { toBerlinDateString } from '@/lib/hrp/hrpLogic';

const breadCrumbs = [
    { title: 'Zeiterfassung', url: '/hrp' },
    { title: 'Administration', url: '/hrp/admin' },
    { title: 'Stundenplanung Café', active: true },
];

export const metadata: Metadata = {
    title: 'Stundenplanung Café | B-Side Nexus',
    robots: 'noindex, nofollow',
};

interface PeriodOption {
    value: string;
    label: string;
    year: number;
    month: number;
}

// Three months back, the current month and two months ahead.
const buildPeriodOptions = (currentYear: number, currentMonth: number): Array<PeriodOption> =>
    Array.from({ length: 6 }, (_, index) => {
        const date = new Date(Date.UTC(currentYear, currentMonth - 3 + index, 1));
        const year = date.getUTCFullYear();
        const month = date.getUTCMonth();
        return {
            value: `${year}-${String(month + 1).padStart(2, '0')}`,
            label: date.toLocaleDateString('de-DE', { month: 'long', year: 'numeric', timeZone: 'UTC' }),
            year,
            month,
        };
    });

const formatBerlinDate = (date: Date): string =>
    new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Europe/Berlin' }).format(date);

export default async function ForecastPage({
    searchParams,
}: {
    searchParams?: Promise<Record<string, string | Array<string> | undefined>>;
}): Promise<ReactElement> {
    const session = await getForecastPlannerSession();
    if (session === null) {
        return (
            <div>
                <NavbarTop items={breadCrumbs} sidebar={true} />
                <div className="p-8">
                    <h1 className="text-2xl font-bold underline">Fehlende Berechtigungen</h1>
                    <p className="mt-4">Die Stundenplanung ist nur für die Thekenleitung und Systemadministrator*innen verfügbar.</p>
                    <p className="mt-4">Bitte kontaktiere eine Administrator*in, wenn du dies für einen Fehler hältst.</p>
                </div>
            </div>
        );
    }

    const today = toBerlinDateString(new Date());
    const currentValue = today.slice(0, 7);
    const options = buildPeriodOptions(Number(today.slice(0, 4)), Number(today.slice(5, 7)) - 1);

    const rawPeriod = (await searchParams)?.period;
    const requested = Array.isArray(rawPeriod) ? rawPeriod[0] : rawPeriod;
    const selected = options.find((option) => option.value === requested) ?? options.find((option) => option.value === currentValue);
    if (selected === undefined) {
        throw new Error('Current payroll month is missing from the period options.');
    }

    const { year, month } = selected;
    const { label } = getForecastWindow(year, month);
    const canEditOwn = isGlobalAdmin(session.id);
    const rows: Array<ForecastPlanningRow> = (await getForecastPlanRows(year, month)).map((row) => ({
        contractId: row.contractId,
        userName: row.userName,
        validToLabel: row.validTo === null ? null : formatBerlinDate(row.validTo),
        plannedHours: row.plannedHours,
        finalizedHours: row.finalizedHours,
        isOwnContract: row.userId === session.id && !canEditOwn,
    }));

    return (
        <div>
            <NavbarTop items={breadCrumbs} sidebar={true} />
            <div className="mx-auto max-w-3xl space-y-6 p-4 lg:p-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-2xl">Stundenplanung Café</CardTitle>
                        <CardDescription>
                            Trage die Stunden ein, die vom {label} geplant sind. Die Buchhaltung sieht sie in der Abrechnung vorausgefüllt
                            und kann sie vor dem Abschluss noch ändern.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <form method="get" className="flex flex-wrap items-end gap-3">
                            <div className="flex min-w-0 flex-col gap-1">
                                <label className="text-xs font-medium text-muted-foreground" htmlFor="forecast-period">
                                    Abrechnungsmonat
                                </label>
                                <select
                                    id="forecast-period"
                                    name="period"
                                    defaultValue={selected.value}
                                    className="rounded border bg-background px-3 py-2 text-sm"
                                >
                                    {options.map((option) => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <Button type="submit" variant="outline">
                                Anzeigen
                            </Button>
                        </form>

                        <ForecastPlanningClient key={selected.value} year={year} month={month} rows={rows} />
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
