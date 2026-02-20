import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ImportError {
  rowNumber: number;
  column?: string;
  error: string;
  value?: unknown;
}

interface ErrorLogTableProps {
  errors: ImportError[];
}

const INITIAL_SHOW = 20;
const MAX_LOG_SIZE = 1000;

function truncateValue(value: unknown, max = 40): string {
  if (value === undefined || value === null) return "\u2014";
  const str = String(value);
  return str.length > max ? str.slice(0, max) + "\u2026" : str;
}

function ErrorLogTable({ errors }: ErrorLogTableProps) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? errors : errors.slice(0, INITIAL_SHOW);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Error Log</CardTitle>
        <CardDescription>
          {errors.length >= MAX_LOG_SIZE
            ? `Showing first ${MAX_LOG_SIZE} errors`
            : `${errors.length} error${errors.length !== 1 ? "s" : ""}`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Row #</TableHead>
              <TableHead>Error</TableHead>
              <TableHead>Column</TableHead>
              <TableHead>Value</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.map((err, i) => (
              <TableRow key={i}>
                <TableCell className="font-mono text-xs">
                  {err.rowNumber >= 0 ? err.rowNumber : "\u2014"}
                </TableCell>
                <TableCell className="max-w-64 text-xs text-destructive">
                  {err.error}
                </TableCell>
                <TableCell className="font-mono text-xs">
                  {err.column ?? "\u2014"}
                </TableCell>
                <TableCell className="max-w-32 font-mono text-xs">
                  {truncateValue(err.value)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {!showAll && errors.length > INITIAL_SHOW && (
          <div className="mt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAll(true)}
            >
              Show all {errors.length} errors
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export { ErrorLogTable };
