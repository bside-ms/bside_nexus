'use client';

import { createContext, useCallback, useContext, useState } from 'react';
import type { PropsWithChildren, ReactElement } from 'react';
import useAsyncEffectOnMount from '@/hooks/use-async-effect-on-mount';

type Breakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

// TODO: https://tailwindcss.com/docs/screens
const breakpoints: Record<Breakpoint, number> = {
    xs: 0,
    sm: 640,
    md: 768,
    lg: 1024,
    xl: 1280,
    '2xl': 1536,
};

interface BreakpointContextData {
    isXs: boolean;
    isSm: boolean;
    isMd: boolean;
    isLg: boolean;
    isXl: boolean;
    is2xl: boolean;
}

const BreakpointContext = createContext<BreakpointContextData | null>(null);

type Props = PropsWithChildren;

const BreakpointContextProvider = ({ children }: Props): ReactElement => {
    const [breakpoint, setBreakpoint] = useState<Breakpoint>('xs');

    const isXs = ['xs', 'sm', 'md', 'lg', 'xl', '2xl'].includes(breakpoint);
    const isSm = ['sm', 'md', 'lg', 'xl', '2xl'].includes(breakpoint);
    const isMd = ['md', 'lg', 'xl', '2xl'].includes(breakpoint);
    const isLg = ['lg', 'xl', '2xl'].includes(breakpoint);
    const isXl = ['xl', '2xl'].includes(breakpoint);
    const is2xl = ['2xl'].includes(breakpoint);

    const handleBodyWidthUpdate = useCallback(
        (bodyWidth: DOMRectReadOnly['width']) => {
            if (bodyWidth >= breakpoints['2xl']) {
                if (breakpoint !== '2xl') {
                    setBreakpoint('2xl');
                }
            } else if (bodyWidth >= breakpoints.xl) {
                if (breakpoint !== 'xl') {
                    setBreakpoint('xl');
                }
            } else if (bodyWidth >= breakpoints.lg) {
                if (breakpoint !== 'lg') {
                    setBreakpoint('lg');
                }
            } else if (bodyWidth >= breakpoints.md) {
                if (breakpoint !== 'md') {
                    setBreakpoint('md');
                }
            } else if (bodyWidth >= breakpoints.sm) {
                if (breakpoint !== 'sm') {
                    setBreakpoint('sm');
                }
            } else {
                setBreakpoint('xs');
            }
        },
        [breakpoint],
    );

    useAsyncEffectOnMount(async () => {
        if (!('ResizeObserver' in window)) {
            // eslint-disable-next-line @next/next/no-assign-module-variable
            const module = await import('@juggle/resize-observer');
            // @ts-expect-error for polyfill required
            window.ResizeObserver = module.ResizeObserver;
        }

        const observer = new ResizeObserver(([resizeObserverEntry]) => {
            handleBodyWidthUpdate(resizeObserverEntry?.contentRect.width ?? 0);
        });

        observer.observe(document.body);
    });

    return (
        <BreakpointContext.Provider
            value={{
                isXs,
                isSm,
                isMd,
                isLg,
                isXl,
                is2xl,
            }}
        >
            {children}
        </BreakpointContext.Provider>
    );
};

const useBreakpointContext = (): BreakpointContextData => {
    const breakpointContext = useContext(BreakpointContext);

    if (breakpointContext === null) {
        throw new Error("useBreakpointContext hook wasn't used within BreakpointContextProvider");
    }

    return breakpointContext;
};

export { BreakpointContextProvider, useBreakpointContext };
