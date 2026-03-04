'use client';

import type { ReactElement } from 'react';

interface PrintButtonProps {
    filename?: string;
}

export function PrintButton({ filename }: PrintButtonProps): ReactElement {
    const handlePrint = () => {
        const originalTitle = document.title;
        if (filename) {
            document.title = filename;
        }
        window.print();
        if (filename) {
            document.title = originalTitle;
        }
    };

    return (
        <button
            type="button"
            onClick={handlePrint}
            className="ml-auto rounded border bg-primary px-3 py-2 text-sm text-primary-foreground hover:opacity-90 print:hidden"
        >
            Als PDF exportieren
        </button>
    );
}
