import React from "react";
import { clsx } from "clsx";
import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";

export interface Column<T> {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (item: T) => React.ReactNode;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  onSort?: (key: string) => void;
  sortBy?: string;
  sortDir?: "asc" | "desc";
  onRowClick?: (item: T) => void;
  className?: string;
  emptyMessage?: string;
}

export function Table<T extends Record<string, unknown>>({
  columns,
  data,
  onSort,
  sortBy,
  sortDir,
  onRowClick,
  className,
  emptyMessage = "No data available",
}: TableProps<T>) {
  const getSortIcon = (key: string) => {
    if (sortBy !== key) return <ChevronsUpDown className="w-3.5 h-3.5 text-zinc-600" />;
    return sortDir === "asc" ? (
      <ChevronUp className="w-3.5 h-3.5 text-primary-400" />
    ) : (
      <ChevronDown className="w-3.5 h-3.5 text-primary-400" />
    );
  };

  return (
    <div className={clsx("overflow-x-auto", className)}>
      <table className="w-full">
        <thead>
          <tr className="border-b border-zinc-800">
            {columns.map((col) => (
              <th
                key={col.key}
                className={clsx(
                  "px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider",
                  col.sortable && "cursor-pointer hover:text-zinc-300 select-none"
                )}
                onClick={() => col.sortable && onSort?.(col.key)}
              >
                <div className="flex items-center gap-1.5">
                  {col.label}
                  {col.sortable && getSortIcon(col.key)}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800/50">
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-12 text-center text-zinc-500"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((item, i) => (
              <tr
                key={i}
                className={clsx(
                  "transition-colors duration-150",
                  onRowClick
                    ? "cursor-pointer hover:bg-zinc-800/50"
                    : "hover:bg-zinc-800/30"
                )}
                onClick={() => onRowClick?.(item)}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className="px-4 py-3 text-sm text-zinc-300"
                  >
                    {col.render
                      ? col.render(item)
                      : (item[col.key] as React.ReactNode) ?? "-"}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
