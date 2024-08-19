import './globals.css';

import type { Metadata } from 'next';
import { Roboto } from 'next/font/google';
import type { ReactElement, ReactNode } from 'react';

const roboto = Roboto({ weight: ['400', '700'], subsets: ['latin'] });

export const metadata: Metadata = {
    title: 'B-Side Nexus',
    description: '',
};

const RootLayout = ({ children }: Readonly<{ children: ReactNode }>): ReactElement => (
    <html>
        <body className={roboto.className}>{children}</body>
    </html>
);

export default RootLayout;
