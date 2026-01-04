import { FileText, SquareChartGantt } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactElement } from 'react';
import NavbarTop from '@/components/sidebar/NavbarTop';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

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

export default function Page(): ReactElement {
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
                        <Link key={item.href} href={item.href} className="group">
                            <Card className="h-full transition-all hover:bg-muted/50 hover:border-primary/50 border-2">
                                <CardHeader className="flex flex-row items-center gap-4 space-y-0 p-4 md:p-6">
                                    <div className="p-2 bg-primary/10 rounded-lg text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors shrink-0">
                                        <item.icon className="h-6 w-6" />
                                    </div>
                                    <div className="flex flex-col">
                                        <CardTitle className="text-lg group-hover:text-primary transition-colors">{item.title}</CardTitle>
                                        <CardDescription className="mt-1 line-clamp-2">{item.description}</CardDescription>
                                    </div>
                                </CardHeader>
                            </Card>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}
