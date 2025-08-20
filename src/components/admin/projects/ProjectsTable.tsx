import React, { useState } from 'react';
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  ColumnFiltersState,
  getFilteredRowModel,
} from '@tanstack/react-table';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ExportDropdown } from '@/components/ui/export-dropdown';
import { EmptyTableState } from '@/components/ui/empty-table-state';
import { FolderKanban, Search, Plus } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Project } from '@/hooks/useProjects';
import { createProjectColumns } from './ProjectColumns';

interface ProjectsTableProps {
  data: Project[];
  totalCount: number;
  isLoading?: boolean;
  onEdit: (project: Project) => void;
  onDelete: (project: Project) => void;
  onCreateProject: () => void;
}

export function ProjectsTable({
  data,
  totalCount,
  isLoading,
  onEdit,
  onDelete,
  onCreateProject,
}: ProjectsTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const isMobile = useIsMobile();

  const columns = createProjectColumns({ onEdit, onDelete });

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
  });

  const handleExport = (format: 'csv' | 'excel') => {
    console.log(`Exporting ${format} format...`);
    // Export functionality to be implemented
  };

  if (isMobile) {
    return (
      <div className="space-y-4">
        {/* Mobile Header */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Projects ({totalCount})</h2>
            <Button size="sm" onClick={onCreateProject}>
              <Plus className="h-4 w-4 mr-2" />
              Add Project
            </Button>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search projects..."
              value={globalFilter ?? ''}
              onChange={(event) => setGlobalFilter(String(event.target.value))}
              className="pl-9"
            />
          </div>
        </div>

        {/* Mobile Cards */}
        {data.length === 0 ? (
          <EmptyTableState
            icon={FolderKanban}
            title="No projects found"
            description="Create your first project to get started"
            action={{
              label: 'Add Project',
              onClick: onCreateProject,
            }}
            colSpan={1}
          />
        ) : (
          <div className="space-y-3">
            {data.map((project) => (
              <Card key={project.id} className="p-4">
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-medium">{project.name}</h3>
                      {project.project_number && (
                        <p className="text-sm text-muted-foreground font-mono">
                          {project.project_number}
                        </p>
                      )}
                    </div>
                    <Badge 
                      variant={
                        project.status === 'active' ? 'default' :
                        project.status === 'on_hold' ? 'secondary' : 'outline'
                      }
                      className="text-xs"
                    >
                      {project.status === 'active' ? 'Active' :
                       project.status === 'on_hold' ? 'On Hold' : 
                       project.status === 'completed' ? 'Completed' : 'Unknown'}
                    </Badge>
                  </div>
                  
                  {project.location_address && (
                    <p className="text-sm text-muted-foreground">
                      📍 {project.location_address}
                    </p>
                  )}
                  
                  {project.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {project.description}
                    </p>
                  )}
                  
                  <div className="flex gap-2 pt-2">
                    <Button size="sm" variant="outline" onClick={() => onEdit(project)}>
                      Edit
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => onDelete(project)}>
                      Delete
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Desktop Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Projects</h2>
          <p className="text-muted-foreground">
            Manage and track your construction projects
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ExportDropdown onExport={handleExport} />
          <Button onClick={onCreateProject}>
            <Plus className="h-4 w-4 mr-2" />
            Add Project
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search projects..."
            value={globalFilter ?? ''}
            onChange={(event) => setGlobalFilter(String(event.target.value))}
            className="pl-9"
          />
        </div>
        <div className="text-sm text-muted-foreground">
          {totalCount} total projects
        </div>
      </div>

      {/* Desktop Table */}
      <Card>
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  <EmptyTableState
                    icon={FolderKanban}
                    title="No projects found"
                    description="Create your first project to get started"
                    action={{
                      label: 'Add Project',
                      onClick: onCreateProject,
                    }}
                    colSpan={columns.length}
                  />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Pagination */}
      {data.length > 0 && (
        <div className="flex items-center justify-between space-x-2 py-4">
          <div className="text-sm text-muted-foreground">
            Showing {table.getFilteredRowModel().rows.length} of {totalCount} projects
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
      )}
    </div>
  );
}