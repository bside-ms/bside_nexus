import type { ReactElement } from 'react';
import UsersList from '@/components/keycloak/UsersList';
import Login from '@/components/Login';

const Home = (): ReactElement => {
    return (
        <main className="min-h-screen p-10">
            <Login />

            <UsersList />
        </main>
    );
};

export default Home;
