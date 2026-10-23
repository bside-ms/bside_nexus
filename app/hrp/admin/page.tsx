import { FileCheck, FileText, SquareChartGantt } from 'lucide-react';
import type { Metadata } from 'next';
import type { ReactElement } from 'react';
import NavTile from '@/components/common/NavTile';
import NavbarTop from '@/components/sidebar/NavbarTop';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { canViewPayroll } from '@/lib/db/hrpAdminActions';

const breadCrumbs = [
    { title: 'Zeiterfassung', url: '/hrp' },
    {
        title: 'Administration',
        active: true,
    },
];

export const metadata: Metadata = {
    title: 'Arbeitszeiterfassung | B-Side Nexus',
    description: 'Arbeitszeiterfassung im internen Portal der B-Side',
    robots: 'noindex, nofollow',
};

export default async function Page(): Promise<ReactElement> {
    const navItems = [
        {
            title: 'Verträge',
            description: 'Arbeitsverträge verwalten.',
            href: '/hrp/admin/contracts',
            icon: FileText,
        },
        {
            title: 'Stundenzettel & Abrechnung',
            description: 'Einblick in die Stundenzettel von Mitarbeitenden.',
            href: '/hrp/admin/overview',
            icon: SquareChartGantt,
        },
    ];

    if (await canViewPayroll()) {
        navItems.push({
            title: 'Abgeschlossene Abrechnungen',
            description: 'Übersicht über alle bereits durchgeführten Abrechnungen.',
            href: '/hrp/admin/payroll',
            icon: FileCheck,
        });
    }

    return (
        <div className="">
            <NavbarTop items={breadCrumbs} sidebar={true} />
            <div className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 max-w-5xl mx-auto">
                <Card className="bg-muted/30">
                    <CardHeader>
                        <CardTitle className="text-xl underline underline-offset-4">Administration der Arbeitszeiterfassung</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p>
                            In diesem Bereich kannst du Arbeitsverträge verwalten und aktuelle Übersichten für die Abrechnung ausgeben
                            lassen.
                        </p>
                    </CardContent>
                </Card>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {navItems.map((item) => (
                        <NavTile key={item.href} title={item.title} description={item.description} href={item.href} icon={item.icon} />
                    ))}
                </div>
            </div>
        </div>
    );
}
