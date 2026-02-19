"use client";

import { ArrowDownIcon, ArrowUpDownIcon, ArrowUpIcon } from "lucide-react";

interface ColumnHeaderProps {
  label: string;
  sortable?: boolean;
  sortDirection?: "asc" | "desc" | null;
  onSort?: () => void;
}

function ColumnHeader({
  label,
  sortable,
  sortDirection,
  onSort,
}: ColumnHeaderProps) {
  if (!sortable) {
    return <span>{label}</span>;
  }

  return (
    <button
      type="button"
      className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
      onClick={onSort}
    >
      {label}
      {sortDirection === "asc" ? (
        <ArrowUpIcon className="size-3.5" />
      ) : sortDirection === "desc" ? (
        <ArrowDownIcon className="size-3.5" />
      ) : (
        <ArrowUpDownIcon className="size-3.5 text-muted-foreground" />
      )}
    </button>
  );
}

export { ColumnHeader };
export type { ColumnHeaderProps };
