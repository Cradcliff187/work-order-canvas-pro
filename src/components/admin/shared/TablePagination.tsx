
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table as ReactTable } from '@tanstack/react-table';

interface TablePaginationProps<T> {
  table: ReactTable<T>;
  totalCount?: number;
  isMobile?: boolean;
  itemName?: string;
}

export function TablePagination<T>({ 
  table, 
  totalCount,
  isMobile = false,
  itemName = 'items'
}: TablePaginationProps<T>) {
  const currentRows = table.getRowModel().rows.length;
  const totalItems = totalCount || table.getFilteredRowModel().rows.length;

  return (
    <div className={`flex items-center py-4 mt-4 ${isMobile ? 'flex-col space-y-4' : 'justify-between space-x-2'}`}>
      <div className="flex items-center gap-4">
        <div className="text-sm text-muted-foreground">
          Showing {currentRows} of {totalItems} {isMobile ? 'items' : itemName}
        </div>
        {!isMobile && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Rows per page:</span>
            <Select
              value={table.getState().pagination.pageSize.toString()}
              onValueChange={(value) => table.setPageSize(Number(value))}
            >
              <SelectTrigger className="w-16 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
      <div className="flex items-center space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          Previous
        </Button>
        <div className="flex items-center gap-1">
          <span className="text-sm text-muted-foreground">
            Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
          </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
