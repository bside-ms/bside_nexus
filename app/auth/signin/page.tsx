import { redirect } from 'next/navigation';
import type { ReactElement } from 'react';
import { auth } from '@/auth';
import { LoginForm } from '@/components/auth/LoginForm';

export default async function Page(): Promise<ReactElement> {
    const session = await auth();

    // If the user is already logged in, you can use a client redirect or render alternate content.
    if (session) {
        redirect('/portal');
    }

    return <LoginForm />;
}
