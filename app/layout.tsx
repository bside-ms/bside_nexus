import './globals.css';

import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import type { ReactElement, ReactNode } from 'react';
import Login from '@/components/Login';
import isUserLoggedIn from '@/lib/auth/isUserLoggedIn';

const interFont = Inter({ weight: ['400'], subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
    title: 'B-Side Nexus',
};

const RootLayout = async ({ children }: Readonly<{ children: ReactNode }>): Promise<ReactElement> => {
    const isLoggedIn = await isUserLoggedIn();

    return (
        <html>
            <body className={interFont.className}>
                <div className="flex min-h-screen bg-gray-100">
                    <main className="min-h-screen flex-1 bg-gray-100 px-9 py-6">{isLoggedIn ? children : <Login />}</main>
                </div>
            </body>
        </html>
    );
};

export default RootLayout;
