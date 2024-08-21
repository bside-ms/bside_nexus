import type { ReactElement } from 'react';
import UsersList from '@/components/keycloak/UsersList';

const Home = (): ReactElement => {
    return (
        <main className="min-h-screen p-10">
            <UsersList />
        </main>
    );
};

export default Home;
