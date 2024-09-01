import type { ReactElement } from 'react';
import UsersList from '@/components/keycloak/UsersList';

const Users = async (): Promise<ReactElement> => {
    return (
        <div>
            <UsersList />
        </div>
    );
};

export default Users;
