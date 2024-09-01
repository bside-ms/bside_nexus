'use client';

import { useCallback, useState } from 'react';
import type { ColumnFiltersState, SortingState } from '@tanstack/react-table';
import { getFilteredRowModel } from '@tanstack/react-table';
import { flexRender, getPaginationRowModel, getSortedRowModel, useReactTable } from '@tanstack/react-table';
import type { ChangeEvent, ReactElement } from 'react';
import { FaSort, FaSortDown, FaSortUp } from 'react-icons/fa';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { AugmentedUserRepresentation } from '@/lib/keycloak/userActions';
import type { ColumnDef } from '@tanstack/table-core';
import { getCoreRowModel } from '@tanstack/table-core';
import type { SortingColumn } from '@tanstack/table-core/src/features/RowSorting';

const NameColumnHeader = ({ column }: { column: SortingColumn<AugmentedUserRepresentation> }): ReactElement => {
    const handleClick = useCallback(() => column.toggleSorting(column.getIsSorted() === 'asc'), [column]);

    return (
        <div onClick={handleClick} className="flex cursor-pointer items-center gap-1 hover:text-gray-700">
            Name {column.getIsSorted() === 'asc' ? <FaSortUp /> : column.getIsSorted() === 'desc' ? <FaSortDown /> : <FaSort />}
        </div>
    );
};

const columns = new Array<ColumnDef<AugmentedUserRepresentation>>(
    {
        accessorKey: 'firstName',
        header: NameColumnHeader,
    },
    {
        accessorKey: 'username',
        header: 'Username',
    },
);

const GroupMembersTable = ({ members }: { members: Array<AugmentedUserRepresentation> }): ReactElement => {
    const [sorting, setSorting] = useState<SortingState>([]);
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

    const table = useReactTable({
        data: members,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        onSortingChange: setSorting,
        getSortedRowModel: getSortedRowModel(),
        onColumnFiltersChange: setColumnFilters,
        getFilteredRowModel: getFilteredRowModel(),
        state: {
            sorting,
            columnFilters,
        },
    });

    const handlePreviousClick = useCallback(() => table.previousPage(), [table]);
    const handleNextClick = useCallback(() => table.nextPage(), [table]);

    const handleFilterChange = useCallback(
        (event: ChangeEvent<HTMLInputElement>) => table.getColumn('firstName')?.setFilterValue(event.currentTarget.value),
        [table],
    );

    return (
        <div className="max-w-4xl">
            <div className="py-2">
                <Input
                    placeholder="Namen suchen…"
                    value={(table.getColumn('firstName')?.getFilterValue() as string | undefined) ?? ''}
                    onChange={handleFilterChange}
                    className="max-w-xs text-sm"
                />
            </div>

            <Table>
                <TableHeader>
                    {table.getHeaderGroups().map((headerGroup) => (
                        <TableRow key={headerGroup.id}>
                            {headerGroup.headers.map((header) => (
                                <TableHead key={header.id}>
                                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                                </TableHead>
                            ))}
                        </TableRow>
                    ))}
                </TableHeader>

                <TableBody>
                    {table.getRowModel().rows.length > 0 ? (
                        table.getRowModel().rows.map((row) => (
                            <TableRow key={row.id} data-state={row.getIsSelected() && 'selected'}>
                                {row.getVisibleCells().map((cell) => (
                                    <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                                ))}
                            </TableRow>
                        ))
                    ) : (
                        <TableRow>
                            <TableCell colSpan={columns.length} className="h-24 text-center">
                                Keine Ergebnisse
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>

            <div className="mt-5 flex justify-center gap-4">
                <Button variant="outline" size="sm" onClick={handlePreviousClick} disabled={!table.getCanPreviousPage()}>
                    Vorherige Seite
                </Button>
                <Button variant="outline" size="sm" onClick={handleNextClick} disabled={!table.getCanNextPage()}>
                    Nächste Seite
                </Button>
            </div>
        </div>
    );
};

export default GroupMembersTable;
