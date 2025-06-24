import '@/app/globals.css';

import { GeistSans } from 'geist/font/sans';
import type { Metadata } from 'next';
import type { ReactElement, ReactNode } from 'react';
import { BreakpointContextProvider } from '@/components/common/BreakpointContext';
import ThemeProvider from '@/components/theming/ThemeProvider';

export const metadata: Metadata = {
    title: 'B-Side Intern',
};

const RootLayout = async ({ children }: Readonly<{ children: ReactNode }>): Promise<ReactElement> => {
    return (
        <html lang="de">
            <body className={GeistSans.className}>
                <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
                    <BreakpointContextProvider>{children}</BreakpointContextProvider>
                </ThemeProvider>
            </body>
        </html>
    );
};

export default RootLayout;
