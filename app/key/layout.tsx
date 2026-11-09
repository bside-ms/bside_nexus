import '@/app/globals.css';

import type { Metadata } from 'next';
import type { ReactElement, ReactNode } from 'react';
import { AppSidebar } from '@/components/sidebar/AppSidebar';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import getUserSession from '@/lib/auth/getUserSession';
import { KEY_ROLE } from '@/lib/key/constants';

export const metadata: Metadata = {
    title: 'Schlüsselverwaltung | B-Side Nexus',
    robots: 'noindex, nofollow',
};

const KeyLayout = async ({ children }: Readonly<{ children: ReactNode }>): Promise<ReactElement> => {
    const session = await getUserSession();
    const isAllowed = session?.roles?.includes(KEY_ROLE) ?? false;

    return (
        <SidebarProvider>
            <AppSidebar />
            <SidebarInset>
                <main>
                    {isAllowed ? (
                        children
                    ) : (
                        <div className="p-8">
                            <h1 className="text-2xl font-bold underline">Fehlende Berechtigungen</h1>
                            <p className="mt-4">
                                Du hast nicht die notwendigen Berechtigungen, um auf die Schlüsselverwaltung zuzugreifen.
                            </p>
                            <p className="mt-4">Bitte kontaktiere eine Administrator*in, wenn du dies für einen Fehler hältst.</p>
                        </div>
                    )}
                </main>
            </SidebarInset>
        </SidebarProvider>
    );
};

export default KeyLayout;
