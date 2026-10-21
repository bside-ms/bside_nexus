import type { ReactElement, ReactNode } from 'react';
import getUserSession from '@/lib/auth/getUserSession';
import { isGlobalAdmin } from '@/lib/db/groupActions';

const NewContractLayout = async ({ children }: Readonly<{ children: ReactNode }>): Promise<ReactElement> => {
    const session = await getUserSession();

    if (!isGlobalAdmin(session?.id ?? '')) {
        return (
            <div className="p-8">
                <h1 className="text-2xl font-bold underline">Fehlende Berechtigungen</h1>
                <p className="mt-4">Nur Systemadministrator*innen dürfen Verträge anlegen.</p>
                <p className="mt-4">Bitte kontaktiere eine Administrator*in, wenn du dies für einen Fehler hälst.</p>
            </div>
        );
    }

    return <div>{children}</div>;
};

export default NewContractLayout;
