import type { ReactElement } from 'react';

export function SectionHeader({ title, description }: { title: string; description: string }): ReactElement {
    return (
        <div className="space-y-0.5">
            <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
            <p>{description}</p>
        </div>
    );
}
