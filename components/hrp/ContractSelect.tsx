'use client';

import { useEffect } from 'react';
import type { ReactElement } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Contract {
    contractId: string;
    type: string;
    groupName: string | null;
}

interface Props {
    contracts: Array<Contract>;
    selectedId: string | null;
    onChange: (id: string) => void;
}

export function ContractSelect({ contracts, selectedId, onChange }: Props): ReactElement {
    // Wenn es nur einen Vertrag gibt, wähle ihn automatisch aus
    useEffect(() => {
        if (contracts.length === 1 && !selectedId && contracts[0] !== undefined) {
            onChange(contracts[0].contractId);
        }
    }, [contracts, selectedId, onChange]);

    if (contracts.length === 0) {
        return <div className="text-amber-600 text-sm mb-4">Es ist aktuell kein aktueller Arbeitsvertrag für dich hinterlegt.</div>;
    }

    return (
        <div className="space-y-1.5 mb-4">
            <label htmlFor="contract-select" className="text-sm font-medium text-muted-foreground">
                Bereich / Vertrag
            </label>
            <Select value={selectedId || ''} onValueChange={onChange}>
                <SelectTrigger id="contract-select" className="w-full">
                    <SelectValue placeholder="Wähle deinen Bereich..." />
                </SelectTrigger>
                <SelectContent>
                    {contracts.map((c) => (
                        <SelectItem key={c.contractId} value={c.contractId}>
                            {c.groupName}{' '}
                            <span className="text-xs text-muted-foreground">({c.type === 'hourly' ? 'Stunden' : 'Fest'})</span>
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}
