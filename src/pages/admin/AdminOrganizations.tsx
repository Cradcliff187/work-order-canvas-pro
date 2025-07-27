import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  ColumnDef,
  flexRender,
  PaginationState,
  SortingState,
  RowSelectionState,
} from '@tanstack/react-table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from "@/components/ui/input"
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Edit, Trash2, RotateCcw, ClipboardList } from 'lucide-react';
import { EmptyTableState } from '@/components/ui/empty-table-state';
import { CreateOrganizationModal } from '@/components/admin/organizations/CreateOrganizationModal';
import { EditOrganizationModal } from '@/components/admin/organizations/EditOrganizationModal';
import { useDebounce } from '@/hooks/useDebounce';
import { useOrganizations, useCreateOrganization, useUpdateOrganization, type Organization } from '@/hooks/useOrganizations';
import { useToast } from '@/hooks/use-toast';

interface OrganizationFilters {
  search?: string;
}

export default function AdminOrganizations() {
  const { toast } = useToast();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedOrganization, setSelectedOrganization] = useState<Organization | null>(null);
  const [filters, setFilters] = useState<OrganizationFilters>({});
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 500);

  const { data: organizations, isLoading, error, refetch } = useOrganizations();

  useEffect(() => {
    setFilters({ search: debouncedSearch });
  }, [debouncedSearch]);

  const handleClearFilters = () => {
    setSearch('');
    setFilters({});
  };

  const renderTableSkeleton = () => (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex space-x-4">
          <Skeleton className="h-4 w-8" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </div>
  );

  if (error) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center space-y-4">
              <p className="text-destructive">Error loading organizations: {error.message}</p>
              <Button onClick={() => refetch()} variant="outline">
                <RotateCcw className="w-4 h-4 mr-2" />
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Organizations Management</h1>
          <p className="text-muted-foreground">
            {organizations?.length ? `${organizations.length} total organizations` : 'Manage all organizations'}
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Organization
        </Button>
      </div>

      {/* Search */}
      <div className="flex items-center space-x-2">
        <Input
          type="search"
          placeholder="Search organizations..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && (
          <Button variant="ghost" size="sm" onClick={handleClearFilters}>
            Clear
          </Button>
        )}
      </div>

      {/* Data Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Organizations</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            renderTableSkeleton()
          ) : organizations?.length === 0 ? (
            <EmptyTableState
              icon={ClipboardList}
              title="No organizations found"
              description={filters.search ? "Try adjusting your search criteria" : "Get started by creating your first organization"}
              action={{
                label: "Create Organization",
                onClick: () => setShowCreateModal(true),
                icon: Plus
              }}
              colSpan={5}
            />
          ) : (
            <div className="rounded-md border">
              <Table className="admin-table">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">Initials</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Contact Email</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {organizations?.map((organization) => (
                    <TableRow 
                      key={organization.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => {
                        setSelectedOrganization(organization);
                        setShowEditModal(true);
                      }}
                    >
                      <TableCell className="font-medium">{organization.initials}</TableCell>
                      <TableCell>{organization.name}</TableCell>
                      <TableCell>{organization.contact_email}</TableCell>
                      <TableCell>
                        <Badge 
                          variant={organization.organization_type === 'partner' ? 'default' : 'secondary'}
                          className="h-5 text-[10px] px-1.5"
                        >
                          {organization.organization_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedOrganization(organization);
                            setShowEditModal(true);
                          }}
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Modal */}
      <CreateOrganizationModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
      />

      {/* Edit Modal */}
      <EditOrganizationModal
        organization={selectedOrganization}
        open={showEditModal}
        onOpenChange={setShowEditModal}
      />
    </div>
  );
}
