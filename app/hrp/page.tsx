import type { Metadata } from 'next';
import type { ReactElement } from 'react';
import AdvancedEntry from '@/components/hrp/AdvancedEntry';
import Overview from '@/components/hrp/Overview';
import QuickEntry from '@/components/hrp/QuickEntry';
import NavbarTop from '@/components/sidebar/NavbarTop';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

const breadCrumbs = [
    {
        title: 'Zeiterfassung',
        active: true,
    },
];

export const metadata: Metadata = {
    title: 'Arbeitszeiterfassung | B-Side Nexus',
    description: 'Arbeitszeiterfassung im internen Portal der B-Side',
    robots: 'noindex, nofollow',
};

export default function Page(): ReactElement {
    return (
        <div className="">
            <NavbarTop items={breadCrumbs} sidebar={true} />
            <div className="flex flex-1 flex-col gap2 lg:gap-4 p-4">
                <div className="grid auto-rows-min gap-4 md:grid-cols-1 lg:grid-cols-3">
                    <Card>
                        <CardHeader className="text-xl underline underline-offset-4">Informationen zur Arbeitszeiterfassung</CardHeader>
                        <CardContent>
                            <p>
                                <strong>Gesetzliche Pausenregelung</strong>
                            </p>
                            <p className="mt-4">Nach § 4 Arbeitszeitgesetz (ArbZG) gilt:</p>
                            <ul className="list-disc pl-4 mt-4">
                                <li className="mb-2">
                                    Bei einer Arbeitszeit von mehr als 6 Stunden ist eine Pause von mindestens 30 Minuten vorgesehen.
                                </li>
                                <li className="mb-2">Bei mehr als 9 Stunden Arbeitszeit muss die Pause mindestens 45 Minuten betragen.</li>
                                <li className="mb-2">Pausen können in Abschnitte von jeweils min. 15 Minuten aufgeteilt werden.</li>
                                <li className="mb-2">
                                    Pausen gelten nicht als Arbeitszeit. Sie müssen tatsächlich genommen und dokumentiert werden.
                                </li>
                            </ul>
                            <p className="mt-4 hidden">
                                Bitte beachte, dass Zeitbuchungen ohne die Einhaltung dieser Regelungen nicht möglich sind.
                            </p>
                        </CardContent>
                    </Card>
                    <AdvancedEntry />
                    <QuickEntry />
                </div>

                <div className="min-h-80 flex-1 rounded-xl ">
                    <Overview />
                </div>
            </div>
        </div>
    );
}
