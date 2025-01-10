'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';
import type { ReactElement } from 'react';
import type * as React from 'react';

const ThemeProvider = ({ children, ...props }: React.ComponentProps<typeof NextThemesProvider>): ReactElement => {
    return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
};

export default ThemeProvider;
