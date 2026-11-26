import type { Metadata } from 'next';
import type { ReactElement } from 'react';
import NavbarTop from '@/components/sidebar/NavbarTop';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import getUserSession from '@/lib/auth/getUserSession';
import { HRP_ADMIN_ROLE } from '@/lib/hrp/adminAccess';
import { toBerlinDateString } from '@/lib/hrp/hrpLogic';
import {
    formatGermanDate,
    formatHours,
    getSickListHint,
    loadSickList,
    parseSickListQuery,
    SICK_LIST_CERTIFICATE_LABELS,
    SICK_LIST_PERIOD_LABELS,
    SICK_LIST_PERIOD_MODES,
    toSickListSearchParams,
} from '@/lib/hrp/sickList';

const breadCrumbs = [
    { title: 'Zeiterfassung', url: '/hrp' },
    { title: 'Administration', url: '/hrp/admin' },
    { title: 'Krankheitsliste', active: true },
];

export const metadata: Metadata = {
    title: 'Krankheitsliste | B-Side Nexus',
    robots: 'noindex, nofollow',
};

const MONTH_OPTIONS = Array.from({ length: 12 }, (_, index) => ({
    value: String(index + 1),
    label: new Intl.DateTimeFormat('de-DE', { month: 'long', timeZone: 'UTC' }).format(new Date(Date.UTC(2000, index, 1))),
}));

const selectClassName = 'rounded border bg-background px-3 py-2 text-sm';
const labelClassName = 'text-xs font-medium text-muted-foreground';

const Message = ({ title, text }: { title: string; text: string }): ReactElement => (
    <div>
        <NavbarTop items={breadCrumbs} sidebar={true} />
        <div className="p-8">
            <h1 className="text-2xl font-bold underline">{title}</h1>
            <p className="mt-4">{text}</p>
            <p className="mt-4">Bitte kontaktiere eine Administrator*in, wenn du dies für einen Fehler hältst.</p>
        </div>
    </div>
);

export default async function SickListPage({
    searchParams,
}: {
    searchParams?: Promise<Record<string, string | Array<string> | undefined>>;
}): Promise<ReactElement> {
    const session = await getUserSession();
    if (session === null || !(session.roles?.includes(HRP_ADMIN_ROLE) ?? false)) {
        return (
            <Message
                title="Fehlende Berechtigungen"
                text="Du hast nicht die notwendigen Berechtigungen, um die Krankheitsliste zu sehen."
            />
        );
    }

    const params = (await searchParams) ?? {};
    const today = toBerlinDateString(new Date());
    const query = parseSickListQuery((key) => {
        const value = params[key];
        return Array.isArray(value) ? value[0] : value;
    }, today);
    const list = await loadSickList(session.id, query);

    if (list.groups.length === 0) {
        return (
            <Message
                title="Keine verwalteten Verträge"
                text="Du verwaltest aktuell keine Gruppen mit Verträgen in der Arbeitszeiterfassung."
            />
        );
    }

    const currentYear = Number(today.slice(0, 4));
    const years = [...new Set([currentYear - 2, currentYear - 1, currentYear, query.year])].sort((a, b) => b - a);
    const showGroup = query.groupId === null && list.groups.length > 1;
    const selectedGroup = list.groups.find((group) => group.id === query.groupId);
    const columnCount = showGroup ? 9 : 8;

    return (
        <div>
            <NavbarTop items={breadCrumbs} sidebar={true} />
            <div className="mx-auto max-w-6xl space-y-6 p-4 lg:p-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-2xl">Krankheitsliste</CardTitle>
                        <CardDescription>
                            Krankheitszeiten je Abrechnungszeitraum mit den Fehlstunden laut Vertrag
                            {selectedGroup === undefined ? '' : ` (${selectedGroup.name})`}.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <form method="get" className="flex flex-wrap items-end gap-3">
                            <div className="flex min-w-0 flex-col gap-1">
                                <label className={labelClassName} htmlFor="sick-list-year">
                                    Jahr
                                </label>
                                <select id="sick-list-year" name="year" defaultValue={String(query.year)} className={selectClassName}>
                                    {years.map((year) => (
                                        <option key={year} value={year}>
                                            {year}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex min-w-0 flex-col gap-1">
                                <label className={labelClassName} htmlFor="sick-list-month">
                                    Monat
                                </label>
                                <select
                                    id="sick-list-month"
                                    name="month"
                                    defaultValue={query.month === null ? 'all' : String(query.month)}
                                    className={selectClassName}
                                >
                                    <option value="all">Ganzes Jahr</option>
                                    {MONTH_OPTIONS.map((option) => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex min-w-0 flex-col gap-1">
                                <label className={labelClassName} htmlFor="sick-list-period">
                                    Zeitraum
                                </label>
                                <select id="sick-list-period" name="period" defaultValue={query.mode} className={selectClassName}>
                                    {SICK_LIST_PERIOD_MODES.map((mode) => (
                                        <option key={mode} value={mode}>
                                            {SICK_LIST_PERIOD_LABELS[mode]}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            {list.groups.length > 1 && (
                                <div className="flex min-w-0 flex-col gap-1">
                                    <label className={labelClassName} htmlFor="sick-list-group">
                                        Arbeitgeber
                                    </label>
                                    <select
                                        id="sick-list-group"
                                        name="group"
                                        defaultValue={query.groupId ?? 'all'}
                                        className={selectClassName}
                                    >
                                        <option value="all">Alle</option>
                                        {list.groups.map((group) => (
                                            <option key={group.id} value={group.id}>
                                                {group.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}
                            <Button type="submit" variant="outline">
                                Anzeigen
                            </Button>
                            <Button asChild variant="outline">
                                <a href={`/api/hrp/admin/sick-list?${toSickListSearchParams(query)}`}>CSV herunterladen</a>
                            </Button>
                        </form>

                        <p className="text-sm text-muted-foreground">
                            Die Zeiträume heißen nach dem Monat, in dem sie enden. Aufeinanderfolgende Krankheitstage gelten als eine
                            Erkrankung, auch über Wochenenden und Feiertage hinweg. Reicht eine Erkrankung über den Zeitraum hinaus, zählen
                            hier nur die Tage im Zeitraum, der Hinweis nennt Beginn oder Ende.
                        </p>
                    </CardContent>
                </Card>

                {list.sections.map(({ period, entries, totalHours }) => (
                    <Card key={`${period.year}-${period.month}`}>
                        <CardHeader>
                            <CardTitle className="text-lg">
                                {period.label}{' '}
                                <span className="font-normal text-muted-foreground">
                                    ({formatGermanDate(period.from)} – {formatGermanDate(period.to)})
                                </span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Vorname</TableHead>
                                        {showGroup && <TableHead>Arbeitgeber</TableHead>}
                                        <TableHead>Krank ab</TableHead>
                                        <TableHead>Krank bis</TableHead>
                                        <TableHead className="text-right">Arbeitstage</TableHead>
                                        <TableHead className="text-right">Fehlstunden</TableHead>
                                        <TableHead>Attest</TableHead>
                                        <TableHead>Hinweis</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {entries.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={columnCount} className="text-muted-foreground">
                                                Keine Krankheitstage in diesem Zeitraum.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        entries.map((entry) => (
                                            <TableRow key={`${entry.userId}-${entry.groupName}-${entry.from}`}>
                                                <TableCell>{entry.lastName}</TableCell>
                                                <TableCell>{entry.firstName}</TableCell>
                                                {showGroup && <TableCell>{entry.groupName}</TableCell>}
                                                <TableCell>{formatGermanDate(entry.from)}</TableCell>
                                                <TableCell>{formatGermanDate(entry.to)}</TableCell>
                                                <TableCell className="text-right">{entry.workdays}</TableCell>
                                                <TableCell className="text-right">{formatHours(entry.hours)}</TableCell>
                                                <TableCell>{SICK_LIST_CERTIFICATE_LABELS[entry.certificate]}</TableCell>
                                                <TableCell className="text-muted-foreground">{getSickListHint(entry)}</TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                                {entries.length > 0 && (
                                    <TableFooter>
                                        <TableRow>
                                            <TableCell colSpan={showGroup ? 6 : 5}>Summe</TableCell>
                                            <TableCell className="text-right">{formatHours(totalHours)}</TableCell>
                                            <TableCell colSpan={2} />
                                        </TableRow>
                                    </TableFooter>
                                )}
                            </Table>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
