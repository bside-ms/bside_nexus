import '@/app/globals.css';

import type { Metadata } from 'next';
import type { ReactElement, ReactNode } from 'react';
import { AppSidebar } from '@/components/sidebar/AppSidebar';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import getUserSession from '@/lib/auth/getUserSession';

export const metadata: Metadata = {
    title: 'B-Side Intern',
};

const KeyLayout = async ({ children }: Readonly<{ children: ReactNode }>): Promise<ReactElement> => {
    const session = await getUserSession();

    const isAllowed = session?.roles?.includes('schluesselverwaltung') ?? false;
    if (!isAllowed) {
        return (
            <SidebarProvider>
                <AppSidebar />
                <SidebarInset>
                    <main>
                        <div className="p-8">
                            <h1 className="text-2xl font-bold underline">Fehlende Berechtigungen</h1>
                            <p className="mt-4">
                                Du hast nicht die notwendigen Berechtigungen, um auf die Arbeitszeiterfassung zuzugreifen.
                            </p>
                            <p className="mt-4">Bitte kontaktiere eine Administrator*in, wenn du dies für einen Fehler hälst.</p>
                        </div>
                    </main>
                </SidebarInset>
            </SidebarProvider>
        );
    }

    return (
        <SidebarProvider>
            <AppSidebar />
            <SidebarInset>
                <main>
                    <div className="p-4 md:p-6">
                        <nav className="mb-4 flex flex-wrap gap-2 text-sm text-muted-foreground">
                            <a className="hover:text-foreground" href="/key">
                                Übersicht
                            </a>
                            <span>·</span>
                            <a className="hover:text-foreground" href="/key/profiles">
                                Profile
                            </a>
                            <span>·</span>
                            <a className="hover:text-foreground" href="/key/types">
                                Schließungen
                            </a>
                            <span>·</span>
                            <a className="hover:text-foreground" href="/key/items">
                                Schlüssel
                            </a>
                            <span>·</span>
                            <a className="hover:text-foreground" href="/key/issuance">
                                Ausgabe
                            </a>
                            <span>·</span>
                            <a className="hover:text-foreground" href="/key/return">
                                Rückgabe
                            </a>
                        </nav>
                        {children}
                    </div>
                </main>
            </SidebarInset>
        </SidebarProvider>
    );
};

export default KeyLayout;
