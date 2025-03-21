'use client';

import { useCallback } from 'react';
import { signIn } from 'next-auth/react';
import type { ReactElement } from 'react';
import { GrLogin } from 'react-icons/gr';
import { ThemeToggle } from '@/components/theming/ThemeToggle';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function LoginForm(): ReactElement {
    const login = useCallback(() => signIn('keycloak'), []);

    return (
        <div className="grid min-h-svh lg:grid-cols-2">
            <div className="flex flex-col gap-4 p-6">
                <div className="flex justify-center gap-2 md:justify-start">
                    <span className="flex items-center gap-2 font-medium">
                        B-Side
                        <small className="px-4">Interner Bereich</small>
                    </span>
                    <div className="ml-auto">
                        <ThemeToggle />
                    </div>
                </div>
                <div className="" />
                <div className="flex flex-1 items-center justify-center">
                    <div className="w-full max-w-xs">
                        <div className={cn('flex flex-col gap-6')}>
                            <div className="flex flex-col items-center gap-2 text-center">
                                <h1 className="text-2xl font-bold">Willkommen zurück!</h1>
                                <p className="text-muted-foreground text-balance text-sm">
                                    Hier kannst du dich mit deinem B-Side Account einloggen.
                                </p>
                            </div>
                            <div className="grid gap-6">
                                <Button variant="secondary" className="w-full" onClick={login}>
                                    <GrLogin />
                                    Login with B-Side
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div className="relative hidden lg:block">
                <img src="/login.jpeg" alt="" className="absolute inset-0 size-full object-cover dark:brightness-[0.75]" />
            </div>
        </div>
    );
}
