import type { ReactElement } from 'react';
import Images from '@/components/Images';
import MainContent from '@/components/MainContent';
import PasswordInput from '@/components/PasswordInput';
import { getLoggedInGuestData } from '@/lib/actions';

const Home = async (): Promise<ReactElement> => {

    return (
        <main className="mx-auto min-h-screen max-w-3xl">
            B-Side Nexus
        </main>
    );
};

export default Home;
