'use client';

import { useEffect, useState } from 'react';
import { ThemeProvider as NextThemesProvider } from 'next-themes';
import type * as React from 'react';
import type { ReactElement } from 'react';

const ThemeProvider = ({ children, ...props }: React.ComponentProps<typeof NextThemesProvider>): ReactElement | null => {
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        setIsLoaded(true);
    }, []);

    if (!isLoaded) {
        return null;
    }

    return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
};

export default ThemeProvider;
