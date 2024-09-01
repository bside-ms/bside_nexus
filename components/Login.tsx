'use client';

import { useCallback } from 'react';
import { signIn } from 'next-auth/react';
import type { ReactElement } from 'react';
import { Button } from '@/components/ui/button';

const Login = (): ReactElement => {
    const login = useCallback(() => signIn('keycloak'), []);

    return (
        <div className="my-5 space-y-5">
            <div>
                <Button variant="default" onClick={login}>
                    Login!
                </Button>
            </div>
        </div>
    );
};

export default Login;
