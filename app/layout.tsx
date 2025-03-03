import '@/app/globals.css';

import { GeistSans } from 'geist/font/sans';
import type { Metadata } from 'next';
import type { ReactElement, ReactNode } from 'react';
import { LoginForm } from '@/components/auth/LoginForm';
import { BreakpointContextProvider } from '@/components/common/BreakpointContext';
import { AppSidebar } from '@/components/sidebar/AppSidebar';
import ThemeProvider from '@/components/theming/ThemeProvider';
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
                        <main>
                            <LoginForm />
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
                    <BreakpointContextProvider>
                        <SidebarProvider>
                            <AppSidebar />
                            <SidebarInset>
                                <main>{children}</main>
                            </SidebarInset>
                        </SidebarProvider>
                    </BreakpointContextProvider>
                </ThemeProvider>
            </body>
        </html>
    );
};

export default RootLayout;
