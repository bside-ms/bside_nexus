'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ReactElement } from 'react';
import { Button } from '@/components/ui/button';
import { recalculatePayrollFixedForUserAtDate } from '@/lib/db/hrpAdminActions';

export function RecalculatePayrollButton({
    selectedUserId,
    year,
    month,
}: {
    selectedUserId: string;
    year: number;
    month: number;
}): ReactElement {
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    async function handleClick() {
        setIsLoading(true);
        try {
            await recalculatePayrollFixedForUserAtDate(selectedUserId, year, month);
            router.refresh();
        } catch (error) {
            alert(error instanceof Error ? error.message : 'Ein unbekannter Fehler ist aufgetreten');
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <Button type="button" variant="outline" className="w-full text-xs h-8" onClick={handleClick} disabled={isLoading}>
            {isLoading ? 'Berechne...' : 'Abrechnung neu berechnen'}
        </Button>
    );
}
