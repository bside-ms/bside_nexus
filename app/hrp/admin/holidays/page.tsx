import { inArray } from 'drizzle-orm';
import type { ReactElement } from 'react';
import { HolidayConfigForm } from '@/components/hrp/HolidayConfigForm';
import { UserSelect } from '@/components/hrp/UserSelect';
import NavbarTop from '@/components/sidebar/NavbarTop';
import { db } from '@/db';
import { usersTable } from '@/db/schema';
import getUserSession from '@/lib/auth/getUserSession';
import { getContractsForUser } from '@/lib/db/contractActions';
import { getHolidaysWithConfigs, getManagedContracts } from '@/lib/db/hrpAdminActions';

export default async function Page(props: {
    searchParams: Promise<{ user?: string; year?: string; month?: string }>;
}): Promise<ReactElement> {
    const searchParams = await props.searchParams;
    const session = await getUserSession();
    if (!session || !session.roles?.includes('arbeitszeiterfassung')) {
        return <div>Keine Berechtigung</div>;
    }

    const year = parseInt(searchParams.year || new Date().getFullYear().toString(), 10);
    const month = parseInt(searchParams.month || (new Date().getMonth() + 1).toString(), 10);

    // 1. Get managed users
    const managedContracts = await getManagedContracts(session.id);
    const managedUserIdsSet = new Set(managedContracts.map((c) => c.userId));
    const users = await db
        .select({ id: usersTable.id, label: usersTable.displayName })
        .from(usersTable)
        .where(inArray(usersTable.id, Array.from(managedUserIdsSet)));

    const userOptions = users.map((u) => ({ id: u.id, label: u.label || u.id }));
    const selectedUserId = searchParams.user || userOptions[0]?.id;

    // 2. Get contracts for selected user
    const contracts = selectedUserId ? await getContractsForUser(selectedUserId) : [];

    const holidays = selectedUserId
        ? await getHolidaysWithConfigs(
              contracts.map((c) => c.contractId),
              year,
          )
        : [];

    return (
        <div>
            <NavbarTop
                items={[
                    { title: 'Admin', url: '/hrp/admin' },
                    { title: 'Feiertage', active: true },
                ]}
                sidebar={true}
            />
            <div className="p-4 space-y-4">
                <div className="flex gap-4 items-center">
                    <UserSelect users={userOptions} year={year} monthOneBased={month} selectedUserId={selectedUserId || ''} />
                </div>
                {selectedUserId && (
                    <HolidayConfigForm
                        key={selectedUserId}
                        userId={selectedUserId}
                        contracts={contracts}
                        year={year}
                        initialHolidays={holidays}
                    />
                )}
            </div>
        </div>
    );
}
