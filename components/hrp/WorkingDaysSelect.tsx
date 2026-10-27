'use client';

import type { ReactElement } from 'react';
import { Button } from '@/components/ui/button';

// ISO-Wochentage wie in hrp_contracts.working_days.
const WEEKDAYS = [
    { value: 1, label: 'Mo' },
    { value: 2, label: 'Di' },
    { value: 3, label: 'Mi' },
    { value: 4, label: 'Do' },
    { value: 5, label: 'Fr' },
    { value: 6, label: 'Sa' },
    { value: 7, label: 'So' },
];

export const formatWorkingDays = (workingDays: Array<number> | null): string =>
    WEEKDAYS.filter((day) => (workingDays ?? [1, 2, 3, 4, 5]).includes(day.value))
        .map((day) => day.label)
        .join(', ');

interface Props {
    id?: string;
    value: Array<number>;
    onChange: (workingDays: Array<number>) => void;
}

const WorkingDaysSelect = ({ id, value, onChange }: Props): ReactElement => {
    const toggle = (day: number): void => {
        const next = value.includes(day) ? value.filter((d) => d !== day) : [...value, day];
        onChange(next.sort((a, b) => a - b));
    };

    return (
        <div id={id} role="group" aria-label="Arbeitstage" className="flex flex-wrap gap-1">
            {WEEKDAYS.map((day) => {
                const isSelected = value.includes(day.value);
                return (
                    <Button
                        key={day.value}
                        type="button"
                        size="sm"
                        variant={isSelected ? 'default' : 'outline'}
                        aria-pressed={isSelected}
                        className="w-10"
                        onClick={() => toggle(day.value)}
                    >
                        {day.label}
                    </Button>
                );
            })}
        </div>
    );
};

export default WorkingDaysSelect;
