import './globals.css';

import { GeistSans } from 'geist/font/sans';
import type { Metadata } from 'next';
import type { ReactElement, ReactNode } from 'react';
import Login from '@/components/Login';
import { AppSidebar } from '@/components/sidebar/sidebar';
import ThemeProvider from '@/components/theming/theme-provider';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import isUserLoggedIn from '@/lib/auth/isUserLoggedIn';

export const metadata: Metadata = {
    title: 'B-Side Intern',
};

const RootLayout = async ({ children }: Readonly<{ children: ReactNode }>): Promise<ReactElement> => {
    const isLoggedIn = await isUserLoggedIn();

    if (!isLoggedIn) {
        return (
            <html>
                <body className={GeistSans.className}>
                    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
                        <main className="">
                            <Login />
                        </main>
                    </ThemeProvider>
                </body>
            </html>
        );
    }

    return (
        <html>
            <body className={GeistSans.className}>
                <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
                    <SidebarProvider>
                        <AppSidebar />
                        <SidebarInset>
                            <main className="">{isLoggedIn ? children : <Login />}</main>
                        </SidebarInset>
                    </SidebarProvider>
                </ThemeProvider>
            </body>
        </html>
    );
};

export default RootLayout;
