import './globals.css';

import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import type { ReactElement, ReactNode } from 'react';
import Login from '@/components/Login';
import AppSidebar from '@/components/sidebar/app-sidebar';
import ThemeProvider from '@/components/theming/theme-provider';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import isUserLoggedIn from '@/lib/auth/isUserLoggedIn';

const interFont = Inter({ weight: ['400'], subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
    title: 'B-Side Nexus',
};

const RootLayout = async ({ children }: Readonly<{ children: ReactNode }>): Promise<ReactElement> => {
    const isLoggedIn = await isUserLoggedIn();

    return (
        <html>
            <head />
            <body className={interFont.className}>
                <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
                    <SidebarProvider>
                        <AppSidebar />
                        <main className="min-h-screen flex-1 bg-gray-100 px-9 py-6 dark:bg-zinc-900">
                            <SidebarTrigger />
                            {isLoggedIn ? children : <Login />}
                        </main>
                    </SidebarProvider>
                </ThemeProvider>
            </body>
        </html>
    );
};

export default RootLayout;
