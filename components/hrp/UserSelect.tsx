'use client';

import { useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { ReactElement } from 'react';

export const UserSelect = ({
    users,
    year,
    monthOneBased,
    selectedUserId,
}: {
    users: Array<{ id: string; label: string }>;
    year: number;
    monthOneBased: number;
    selectedUserId: string;
}): ReactElement => {
    const router = useRouter();
    const searchParams = useSearchParams();

    const options = useMemo(() => users, [users]);

    function onChange(e: React.ChangeEvent<HTMLSelectElement>): void {
        const user = e.target.value;
        const params = new URLSearchParams(searchParams?.toString() ?? '');
        params.set('year', String(year));
        params.set('month', String(monthOneBased));
        params.set('user', user);
        router.replace(`?${params.toString()}`);
    }

    return (
        <select value={selectedUserId} onChange={onChange} className="min-w-[16rem] rounded border bg-background px-3 py-2 text-sm">
            {options.map((u) => (
                <option key={u.id} value={u.id}>
                    {u.label}
                </option>
            ))}
        </select>
    );
};
