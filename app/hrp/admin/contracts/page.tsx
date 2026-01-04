import Link from 'next/link';
import type { ReactElement } from 'react';
import { ContractsTable } from '@/components/hrp/ContractsTable';
import NavbarTop from '@/components/sidebar/NavbarTop';
import { Button } from '@/components/ui/button';
import getUserSession from '@/lib/auth/getUserSession';
import { getManagedContracts } from '@/lib/db/hrpAdminActions';

export default async function ContractsPage(): Promise<ReactElement> {
    const session = await getUserSession();
    const contracts = await getManagedContracts(session!.id);

    const breadCrumbs = [
        { title: 'Zeiterfassung', url: '/hrp' },
        { title: 'Administration', url: '/hrp/admin' },
        { title: 'Verträge', active: true },
    ];

    return (
        <div>
            <NavbarTop items={breadCrumbs} sidebar={true} />
            <div className="p-6 space-y-6">
                <div className="flex justify-between items-center">
                    <h1 className="text-3xl font-bold">Vertragsverwaltung</h1>
                    <Link href="/hrp/admin/contracts/new">
                        <Button>Neuer Vertrag</Button>
                    </Link>
                </div>

                {contracts.length === 0 ? (
                    <div className="text-muted-foreground">Keine Verträge gefunden.</div>
                ) : (
                    <ContractsTable data={contracts} />
                )}
            </div>
        </div>
    );
}
