'use client';

import { useCallback } from 'react';
import { signIn } from 'next-auth/react';
import type { ReactElement } from 'react';

const Login = (): ReactElement => {
    const login = useCallback(() => signIn('keycloak'), []);

    return <button onClick={login}>Login!</button>;
};

export default Login;
