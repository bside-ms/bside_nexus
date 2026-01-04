import '@/app/globals.css';

import type { Metadata } from 'next';
import type { ReactElement, ReactNode } from 'react';
import getUserSession from '@/lib/auth/getUserSession';

export const metadata: Metadata = {
    title: 'B-Side Intern',
};

const RootLayout = async ({ children }: Readonly<{ children: ReactNode }>): Promise<ReactElement> => {
    const session = await getUserSession();

    const isAllowed = session?.roles?.includes('arbeitszeiterfassung-admin') ?? false;

    if (!isAllowed) {
        return (
            <div className="p-8">
                <h1 className="text-2xl font-bold underline">Fehlende Berechtigungen</h1>
                <p className="mt-4">
                    Du hast nicht die notwendigen Berechtigungen, um auf die Administration der Arbeitszeiterfassung zuzugreifen.
                </p>
                <p className="mt-4">Bitte kontaktiere eine Administrator*in, wenn du dies für einen Fehler hälst.</p>
            </div>
        );
    }

    return <div>{children}</div>;
};

export default RootLayout;
