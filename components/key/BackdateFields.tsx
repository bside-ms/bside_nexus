'use client';

import type { ReactElement } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export interface BackdateValue {
    enabled: boolean;
    date: string;
    withoutReceipt: boolean;
}

export const EMPTY_BACKDATE: BackdateValue = { enabled: false, date: '', withoutReceipt: false };

// Fields for the API: without a backdate the server uses today. An empty date means "unknown".
export const backdateToRequest = (value: BackdateValue): { protocolDate?: string | null; withoutReceipt?: boolean } =>
    value.enabled ? { protocolDate: value.date === '' ? null : value.date, withoutReceipt: value.withoutReceipt } : {};

const todayIso = (): string => new Date().toISOString().slice(0, 10);

// Records a past issuance or return, e.g. one that was clarified later.
const BackdateFields = ({ value, onChange }: { value: BackdateValue; onChange: (value: BackdateValue) => void }): ReactElement => (
    <div className="space-y-3 rounded-lg border border-dashed p-3">
        <div className="flex items-center gap-2">
            <Checkbox
                id="backdate-enabled"
                checked={value.enabled}
                onCheckedChange={(checked) => onChange({ ...value, enabled: checked === true })}
            />
            <Label htmlFor="backdate-enabled" className="font-normal">
                Nachtrag: Der Vorgang liegt in der Vergangenheit
            </Label>
        </div>
        {value.enabled && (
            <div className="grid gap-3 pl-6 sm:grid-cols-[12rem_1fr] sm:items-start">
                <div className="grid gap-1.5">
                    <Label htmlFor="backdate-date">Datum</Label>
                    <Input
                        id="backdate-date"
                        type="date"
                        max={todayIso()}
                        value={value.date}
                        onChange={(event) => onChange({ ...value, date: event.target.value })}
                    />
                    <p className="text-xs text-muted-foreground">Leer lassen, wenn das Datum unbekannt ist.</p>
                </div>
                <div className="flex items-start gap-2 pt-7">
                    <Checkbox
                        id="backdate-without-receipt"
                        checked={value.withoutReceipt}
                        onCheckedChange={(checked) => onChange({ ...value, withoutReceipt: checked === true })}
                    />
                    <Label htmlFor="backdate-without-receipt" className="font-normal">
                        Ohne Quittung. Das Protokoll wird als unsicher markiert.
                    </Label>
                </div>
            </div>
        )}
    </div>
);

export default BackdateFields;
