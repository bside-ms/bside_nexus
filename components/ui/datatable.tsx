'use client';

/* eslint-disable react/jsx-no-bind */

import { useState } from 'react';
import type { ColumnDef, GlobalFilterTableState, Row, SortingState, VisibilityState } from '@tanstack/react-table';
import { getFilteredRowModel } from '@tanstack/react-table';
import { getSortedRowModel } from '@tanstack/react-table';
import { flexRender, getCoreRowModel, getPaginationRowModel, useReactTable } from '@tanstack/react-table';
import type { ReactElement, ReactNode } from 'react';
import { DataTablePagination } from '@/components/ui/datatable-pagination';
import { DataTableViewOptions } from '@/components/ui/datatable-viewoptions';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';

interface DataTableProps<TData, TValue> {
    columns: Array<ColumnDef<TData, TValue>>;
    data: Array<TData>;
    onRowClick?: (row: Row<TData>) => void;

    // If the table itself is narrower than 48rem, rows are rendered as a list instead of a table.
    renderMobileRow?: (row: Row<TData>) => ReactNode;
}

export function DataTable<TData, TValue>({ columns, data, renderMobileRow, onRowClick }: DataTableProps<TData, TValue>): ReactElement {
    const [sorting, setSorting] = useState<SortingState>([]);
    const [globalFilter, setGlobalFilter] = useState<GlobalFilterTableState>();
    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        onSortingChange: setSorting,
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        globalFilterFn: 'includesString',
        onColumnVisibilityChange: setColumnVisibility,
        state: {
            sorting,
            globalFilter,
            columnVisibility,
        },
        onGlobalFilterChange: setGlobalFilter,
    });

    return (
        <div className="@container">
            <div className="flex items-center py-4">
                <Input placeholder="Suche..." onChange={(e) => table.setGlobalFilter(String(e.target.value))} className="max-w-sm" />
                <DataTableViewOptions table={table} />
            </div>

            {renderMobileRow && (
                <ul className="divide-y border-y @3xl:hidden">
                    {table.getRowModel().rows?.length ? (
                        table.getRowModel().rows.map((row) => <li key={row.id}>{renderMobileRow(row)}</li>)
                    ) : (
                        <li className="py-8 text-center text-sm">Keine Ergebnisse.</li>
                    )}
                </ul>
            )}

            <div className={cn('rounded-md border', renderMobileRow && 'hidden @3xl:block')}>
                <Table>
                    <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map((header) => {
                                    return (
                                        <TableHead key={header.id}>
                                            {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                                        </TableHead>
                                    );
                                })}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {table.getRowModel().rows?.length ? (
                            table.getRowModel().rows.map((row) => (
                                <TableRow
                                    key={row.id}
                                    data-state={row.getIsSelected() && 'selected'}
                                    className={cn('group/row', onRowClick && 'cursor-pointer')}
                                    onClick={onRowClick ? (): void => onRowClick(row) : undefined}
                                >
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={columns.length} className="h-24 text-center">
                                    Keine Ergebnisse.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            <DataTablePagination table={table} />
        </div>
    );
}
