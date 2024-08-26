import { Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import { getServerSession } from 'next-auth';
import type { ReactElement } from 'react';
import authOptions from '@/lib/auth/authOptions';
import { getAllUsers } from '@/lib/keycloak/actions';

const UsersList = async (): Promise<ReactElement> => {
    const session = await getServerSession(authOptions);
    console.log('session', session);

    const allUsers = await getAllUsers();

    return (
        <div>
            <TableContainer component={Paper}>
                <Table sx={{ minWidth: 650 }}>
                    <TableHead>
                        <TableRow>
                            <TableCell className="font-bold">E-Mail</TableCell>
                            <TableCell className="font-bold">Username</TableCell>
                            <TableCell className="font-bold">Vorname</TableCell>
                            <TableCell className="font-bold">Nachname</TableCell>
                        </TableRow>
                    </TableHead>

                    <TableBody>
                        {allUsers.map((user) => (
                            <TableRow key={user.id}>
                                <TableCell>{user.email}</TableCell>
                                <TableCell>{user.username}</TableCell>
                                <TableCell>{user.firstName}</TableCell>
                                <TableCell>{user.lastName}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </div>
    );
};

export default UsersList;
