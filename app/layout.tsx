import './globals.css';

import type { Metadata } from 'next';
import { Roboto } from 'next/font/google';
import type { ReactElement, ReactNode } from 'react';

const roboto = Roboto({ weight: ['100', '300', '400', '500', '700', '900'], subsets: ['latin'] });

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
