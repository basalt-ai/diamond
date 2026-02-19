"use client";

import type React from "react";
import { useCallback, useMemo, useState } from "react";

import { ColumnHeader } from "@/components/data-table/column-header";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ColumnDef<T> {
  id: string;
  header: string;
  accessorFn: (row: T) => React.ReactNode;
  sortable?: boolean;
  className?: string;
}

interface DataTableProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  onRowClick?: (row: T) => void;
  isLoading?: boolean;
  emptyState?: React.ReactNode;
}

type SortDirection = "asc" | "desc" | null;

interface SortState {
  columnId: string | null;
  direction: SortDirection;
}

const SKELETON_ROW_COUNT = 5;

function DataTable<T>({
  columns,
  data,
  onRowClick,
  isLoading,
  emptyState,
}: DataTableProps<T>) {
  const [sort, setSort] = useState<SortState>({
    columnId: null,
    direction: null,
  });

  const handleSort = useCallback((columnId: string) => {
    setSort((prev) => {
      if (prev.columnId !== columnId) {
        return { columnId, direction: "asc" };
      }
      if (prev.direction === "asc") {
        return { columnId, direction: "desc" };
      }
      return { columnId: null, direction: null };
    });
  }, []);

  const sortedData = useMemo(() => {
    if (sort.columnId === null || sort.direction === null) {
      return data;
    }

    const column = columns.find((c) => c.id === sort.columnId);
    if (!column) {
      return data;
    }

    return [...data].sort((a, b) => {
      const aVal = column.accessorFn(a);
      const bVal = column.accessorFn(b);

      const aStr = String(aVal ?? "");
      const bStr = String(bVal ?? "");

      const result = aStr.localeCompare(bStr, undefined, { numeric: true });
      return sort.direction === "asc" ? result : -result;
    });
  }, [data, columns, sort]);

  return (
    <Table>
      <TableHeader>
        <TableRow>
          {columns.map((column) => (
            <TableHead key={column.id} className={column.className}>
              <ColumnHeader
                label={column.header}
                sortable={column.sortable}
                sortDirection={
                  sort.columnId === column.id ? sort.direction : null
                }
                onSort={() => handleSort(column.id)}
              />
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading ? (
          Array.from({ length: SKELETON_ROW_COUNT }, (_, rowIndex) => (
            <TableRow key={rowIndex}>
              {columns.map((column) => (
                <TableCell key={column.id} className={column.className}>
                  <Skeleton className="h-4 w-full" />
                </TableCell>
              ))}
            </TableRow>
          ))
        ) : sortedData.length === 0 ? (
          <TableRow>
            <TableCell colSpan={columns.length} className="h-24 text-center">
              {emptyState ?? <p className="text-muted-foreground">No data</p>}
            </TableCell>
          </TableRow>
        ) : (
          sortedData.map((row, rowIndex) => (
            <TableRow
              key={rowIndex}
              className={onRowClick ? "cursor-pointer" : undefined}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
            >
              {columns.map((column) => (
                <TableCell key={column.id} className={column.className}>
                  {column.accessorFn(row)}
                </TableCell>
              ))}
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}

export { DataTable };
export type { ColumnDef, DataTableProps };
