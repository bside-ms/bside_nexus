import type { ReactElement } from 'react';
import { getAllUsers } from '@/lib/keycloak/actions';

const UsersList = async (): Promise<ReactElement> => {
    const allUsers = await getAllUsers();

    return <div>There are {allUsers.length} users</div>;
};

export default UsersList;
