import '@/app/globals.css';

import type { Metadata } from 'next';
import type { ReactElement, ReactNode } from 'react';
import { AppSidebar } from '@/components/sidebar/AppSidebar';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import isUserLoggedIn from '@/lib/auth/isUserLoggedIn';

export const metadata: Metadata = {
    title: 'B-Side Intern',
};

const RootLayout = async ({ children }: Readonly<{ children: ReactNode }>): Promise<ReactElement> => {
    const isLoggedIn = await isUserLoggedIn();

    if (!isLoggedIn) {
        return (
            <p>
                <a href="/auth/signin">Login</a>
            </p>
        );
    }

    return (
        <SidebarProvider>
            <AppSidebar />
            <SidebarInset>
                <main>{children}</main>
            </SidebarInset>
        </SidebarProvider>
    );
};

export default RootLayout;
