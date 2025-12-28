import { ReactNode } from "react";

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T, index: number) => ReactNode;
  headerClassName?: string;
  cellClassName?: string;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (row: T, index: number) => void;
  emptyMessage?: string;
  loading?: boolean;
  keyExtractor: (row: T, index: number) => string;
}

export function DataTable<T>({
  columns,
  data,
  onRowClick,
  emptyMessage = "데이터가 없습니다.",
  loading = false,
  keyExtractor,
}: DataTableProps<T>) {
  return (
    <div
      className={`bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden transition-opacity ${
        loading ? "opacity-60" : ""
      }`}
    >
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-gray-100">
            {columns.map((col) => (
              <th
                key={col.key}
                className={`px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider ${
                  col.headerClassName || ""
                }`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, index) => (
            <tr
              key={keyExtractor(row, index)}
              className={`hover:bg-gray-50 transition-colors ${
                onRowClick ? "cursor-pointer" : ""
              } ${index !== data.length - 1 ? "border-b border-gray-100" : ""}`}
              onClick={() => onRowClick?.(row, index)}
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={`px-4 py-4 ${col.cellClassName || ""}`}
                >
                  {col.render(row, index)}
                </td>
              ))}
            </tr>
          ))}
          {data.length === 0 && (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-12 text-center text-gray-400"
              >
                {emptyMessage}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
