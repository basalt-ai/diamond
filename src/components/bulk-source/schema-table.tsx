import { CheckIcon, XIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface DiscoveredColumn {
  name: string;
  type: string;
  nullable: boolean;
  sampleValues: unknown[];
}

interface SchemaTableProps {
  columns: DiscoveredColumn[];
}

function truncateSample(value: unknown, max = 30): string {
  const str = value === null ? "null" : String(value);
  return str.length > max ? str.slice(0, max) + "\u2026" : str;
}

function SchemaTable({ columns }: SchemaTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Column</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Nullable</TableHead>
          <TableHead>Samples</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {columns.map((col) => (
          <TableRow key={col.name}>
            <TableCell className="font-mono text-xs">{col.name}</TableCell>
            <TableCell>
              <Badge variant="secondary" className="text-[10px]">
                {col.type}
              </Badge>
            </TableCell>
            <TableCell>
              {col.nullable ? (
                <CheckIcon className="size-3.5 text-muted-foreground" />
              ) : (
                <XIcon className="size-3.5 text-muted-foreground" />
              )}
            </TableCell>
            <TableCell className="max-w-64">
              <div className="flex flex-wrap gap-1">
                {col.sampleValues.slice(0, 3).map((val, i) => (
                  <span
                    key={i}
                    className="bg-muted rounded-none px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground"
                  >
                    {truncateSample(val)}
                  </span>
                ))}
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export { SchemaTable };
export type { DiscoveredColumn };
