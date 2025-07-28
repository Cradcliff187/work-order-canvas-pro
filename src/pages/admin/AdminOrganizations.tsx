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
import { MobileTableCard } from '@/components/admin/shared/MobileTableCard';
import { TableSkeleton } from '@/components/admin/shared/TableSkeleton';
import { useIsMobile } from '@/hooks/use-mobile';
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

  const isMobile = useIsMobile();

  const handleClearFilters = () => {
    setSearch('');
    setFilters({});
  };

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
            <TableSkeleton rows={5} columns={5} />
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
            <>
              {/* Desktop Table */}
              <div className="hidden lg:block rounded-md border">
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
                        onClick={(e) => {
                          // Don't navigate if clicking interactive elements
                          const target = e.target as HTMLElement;
                          if (target instanceof HTMLButtonElement || 
                              target instanceof HTMLInputElement ||
                              target.closest('[role="checkbox"]') ||
                              target.closest('[data-radix-collection-item]') ||
                              target.closest('.dropdown-trigger')) {
                            return;
                          }
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

              {/* Mobile Cards */}
              <div className="block lg:hidden space-y-3">
                {organizations?.map((organization) => (
                  <MobileTableCard
                    key={organization.id}
                    title={organization.name}
                    subtitle={`${organization.initials} • ${organization.contact_email}`}
                    status={
                      <Badge 
                        variant={organization.organization_type === 'partner' ? 'default' : 'secondary'}
                        className="h-5 text-[10px] px-1.5"
                      >
                        {organization.organization_type}
                      </Badge>
                    }
                    onClick={() => {
                      setSelectedOrganization(organization);
                      setShowEditModal(true);
                    }}
                  />
                ))}
              </div>
            </>
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
