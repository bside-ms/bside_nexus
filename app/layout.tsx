import './globals.css';

import type { Metadata } from 'next';
import { Poiret_One } from 'next/font/google';
import type { ReactElement, ReactNode } from 'react';

const amaticSC = Poiret_One({ weight: ['400'], subsets: ['latin'] });

export const metadata: Metadata = {
    title: 'B-Side Nexus',
    description: '',
};

const RootLayout = ({ children }: Readonly<{ children: ReactNode }>): ReactElement => (
    <html>
        <body className={amaticSC.className}>{children}</body>
    </html>
);

export default RootLayout;
