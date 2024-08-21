import { Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import type { ReactElement } from 'react';
import { getAllUsers } from '@/lib/keycloak/actions';

const UsersList = async (): Promise<ReactElement> => {
    const allUsers = await getAllUsers();

    console.log('allUsers', allUsers);

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
