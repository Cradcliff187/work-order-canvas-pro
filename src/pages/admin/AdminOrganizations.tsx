import { useState, useEffect, useMemo } from 'react';
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

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Edit, RotateCcw, ClipboardList, Power } from 'lucide-react';
import { EmptyTableState } from '@/components/ui/empty-table-state';
import { MobileTableCard } from '@/components/admin/shared/MobileTableCard';
import { EnhancedTableSkeleton } from '@/components/EnhancedTableSkeleton';
import { useViewMode } from '@/hooks/useViewMode';
import { ViewModeSwitcher } from '@/components/ui/view-mode-switcher';
import { CreateOrganizationModal } from '@/components/admin/organizations/CreateOrganizationModal';
import { EditOrganizationModal } from '@/components/admin/organizations/EditOrganizationModal';
import { useDebounce } from '@/hooks/useDebounce';
import { useOrganizations, useCreateOrganization, useUpdateOrganization, type Organization } from '@/hooks/useOrganizations';
import { useToast } from '@/hooks/use-toast';
import { ExportDropdown } from '@/components/ui/export-dropdown';
import { ColumnVisibilityDropdown } from '@/components/ui/column-visibility-dropdown';
import { useColumnVisibility } from '@/hooks/useColumnVisibility';
import { SmartSearchInput } from '@/components/ui/smart-search-input';
import { exportToCSV, exportToExcel, generateFilename, ExportColumn } from '@/lib/utils/export';
import { SwipeableListItem } from '@/components/ui/swipeable-list-item';

interface OrganizationFilters {
  search?: string;
}

export default function AdminOrganizations() {
  const { toast } = useToast();
  
  // View mode configuration
  const { viewMode, setViewMode, allowedModes } = useViewMode({
    componentKey: 'admin-organizations',
    config: {
      mobile: ['card'],
      desktop: ['table', 'card']
    },
    defaultMode: 'table'
  });
  
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

  const [typeFilter, setTypeFilter] = useState<'all' | 'internal' | 'partner' | 'subcontractor'>('all');

  // Persist type filter in localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem('admin-organizations-filters-v1');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.type) setTypeFilter(parsed.type);
      }
    } catch (e) {
      console.warn('Failed to parse org filters from localStorage', e);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('admin-organizations-filters-v1', JSON.stringify({ type: typeFilter }));
    } catch {}
  }, [typeFilter]);

  const { mutate: updateOrg } = useUpdateOrganization();
  const handleToggleActive = (org: Organization) => {
    updateOrg({ id: org.id as string, is_active: !org.is_active });
  };

  const columnMetadata = {
    initials: { label: 'Initials', defaultVisible: true },
    name: { label: 'Name', defaultVisible: true },
    contact_email: { label: 'Contact Email', defaultVisible: true },
    organization_type: { label: 'Type', defaultVisible: true },
    actions: { label: 'Actions', defaultVisible: true },
  } as const;

const { columnVisibility, toggleColumn, resetToDefaults, getAllColumns, getVisibleColumnCount } = useColumnVisibility({
  storageKey: 'admin-organizations-columns-v1',
  legacyKeys: ['admin-organizations-columns'],
  columnMetadata,
});

  const columnOptions = getAllColumns().map(col => ({
    ...col,
    canHide: col.id !== 'actions',
  }));

  const filteredOrganizations = useMemo(() => {
    let data = organizations ?? [];
    const q = (filters.search ?? '').toLowerCase().trim();
    if (q) {
      data = data.filter(o => {
        const hay = [o.name, o.initials, o.contact_email, o.contact_phone, o.address]
          .filter(Boolean)
          .map(s => String(s).toLowerCase());
        return hay.some(s => s.includes(q));
      });
    }
    if (typeFilter !== 'all') {
      data = data.filter(o => o.organization_type === typeFilter);
    }
    return data;
  }, [organizations, filters.search, typeFilter]);

  const exportColumns: ExportColumn[] = [
    { key: 'name', label: 'Organization Name', type: 'string' },
    { key: 'initials', label: 'Initials', type: 'string' },
    { key: 'organization_type', label: 'Type', type: 'string' },
    { key: 'contact_email', label: 'Contact Email', type: 'string' },
  ];

  const handleExport = (format: 'csv' | 'excel') => {
    try {
      if (format === 'excel') {
        exportToExcel(filteredOrganizations, exportColumns, generateFilename('organizations', 'xlsx'));
      } else {
        exportToCSV(filteredOrganizations, exportColumns, generateFilename('organizations'));
      }
    } catch (e: any) {
      toast({
        variant: 'destructive',
        title: 'Export failed',
        description: e?.message ?? 'Unable to export organizations',
      });
    }
  };

  const handleClearFilters = () => {
    setSearch('');
    setFilters({});
    setTypeFilter('all');
    try {
      localStorage.removeItem('admin-organizations-filters-v1');
      localStorage.removeItem('admin-organizations-search');
    } catch {}
  };
  if (error) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center space-y-4">
              <p className="text-destructive">We couldn't load organizations. Please try again.</p>
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
            {filteredOrganizations?.length ? `${filteredOrganizations.length} matching organizations` : (organizations?.length ? `${organizations.length} total organizations` : 'Manage all organizations')}
          </p>
        </div>
        <div className="flex items-center gap-2" role="toolbar" aria-label="Organization actions">
          <ViewModeSwitcher
            value={viewMode}
            onValueChange={setViewMode}
            allowedModes={allowedModes}
            className="h-9"
          />
          <Button onClick={() => setShowCreateModal(true)} className="h-9">
            <Plus className="w-4 h-4 mr-2" />
            New Organization
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex-1 min-w-[220px]">
          <SmartSearchInput
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onSearchSubmit={(q) => setSearch(q)}
            onSelectSuggestion={(item) => setSearch(item.label)}
            workOrders={[]}
            assignees={[]}
            locations={[]}
            storageKey="admin-organizations-search"
            aria-label="Search organizations"
          />
        </div>
        <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as any)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="internal">Internal</SelectItem>
            <SelectItem value="partner">Partner</SelectItem>
            <SelectItem value="subcontractor">Subcontractor</SelectItem>
          </SelectContent>
        </Select>
        {(search || typeFilter !== 'all') && (
          <Button variant="ghost" size="sm" onClick={handleClearFilters}>
            Clear
          </Button>
        )}
      </div>

      {/* Data Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Organizations</CardTitle>
          <div className="flex items-center gap-2">
            <ExportDropdown onExport={handleExport} disabled={isLoading || filteredOrganizations.length === 0} />
            <ColumnVisibilityDropdown
              columns={columnOptions}
              onToggleColumn={(id) => { if (id !== 'actions') toggleColumn(id); }}
              onResetToDefaults={resetToDefaults}
              visibleCount={columnOptions.filter(c => c.canHide && c.visible).length}
              totalCount={columnOptions.filter(c => c.canHide).length}
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <EnhancedTableSkeleton rows={5} columns={5} />
          ) : filteredOrganizations.length === 0 ? (
            <div className="rounded-md border">
              <Table className="admin-table">
                <TableBody>
                  <EmptyTableState
                    icon={ClipboardList}
                    title="No organizations found"
                    description={(filters.search || typeFilter !== 'all') ? "Try adjusting your search or filters" : "Get started by creating your first organization"}
                    action={{
                      label: "Create Organization",
                      onClick: () => setShowCreateModal(true),
                      icon: Plus
                    }}
                    colSpan={5}
                  />
                </TableBody>
              </Table>
            </div>
          ) : (
            <>
              {/* Table View */}
              {viewMode === 'table' && (
                <div className="hidden lg:block rounded-md border">
                <Table className="admin-table">
                    <TableHeader>
                      <TableRow>
                        {columnVisibility['initials'] && (
                          <TableHead className="w-[100px]">Initials</TableHead>
                        )}
                        {columnVisibility['name'] && <TableHead>Name</TableHead>}
                        {columnVisibility['contact_email'] && <TableHead>Contact Email</TableHead>}
                        {columnVisibility['organization_type'] && <TableHead>Type</TableHead>}
                        {columnVisibility['actions'] && (
                          <TableHead className="text-right">Actions</TableHead>
                        )}
                      </TableRow>
                    </TableHeader>
                  <TableBody>
                    {filteredOrganizations.map((organization) => (
                      <TableRow 
                        key={organization.id}
                        className="cursor-pointer hover:bg-muted/50"
                        role="button"
                        tabIndex={0}
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
                        onKeyDown={(e) => {
                          const target = e.target as HTMLElement;
                          if (target instanceof HTMLButtonElement || 
                              target instanceof HTMLInputElement ||
                              target.closest('[role=\"checkbox\"]') ||
                              target.closest('[data-radix-collection-item]') ||
                              target.closest('.dropdown-trigger')) {
                            return;
                          }
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setSelectedOrganization(organization);
                            setShowEditModal(true);
                          }
                        }}
                      >
                        {columnVisibility['initials'] && (
                          <TableCell className="font-medium">{organization.initials}</TableCell>
                        )}
                        {columnVisibility['name'] && (
                          <TableCell>{organization.name}</TableCell>
                        )}
                        {columnVisibility['contact_email'] && (
                          <TableCell>{organization.contact_email}</TableCell>
                        )}
                        {columnVisibility['organization_type'] && (
                          <TableCell>
                            <Badge 
                              variant={organization.organization_type === 'partner' ? 'default' : 'secondary'}
                              className="h-5 text-[10px] px-1.5"
                            >
                              {organization.organization_type}
                            </Badge>
                          </TableCell>
                        )}
                        {columnVisibility['actions'] && (
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
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </div>
              )}

              {/* Card View */}
              {viewMode === 'card' && (
                <div className="space-y-3">
                  {filteredOrganizations.map((organization) => (
                    <SwipeableListItem
                      key={organization.id}
                      itemName={organization.name}
                      itemType="organization"
                      onSwipeRight={() => {
                        setSelectedOrganization(organization);
                        setShowEditModal(true);
                      }}
                      onSwipeLeft={() => handleToggleActive(organization)}
                      rightAction={{ icon: Edit, label: 'Edit', color: 'default' }}
                      leftAction={{ icon: Power, label: organization.is_active ? 'Deactivate' : 'Activate', color: organization.is_active ? 'destructive' : 'success' }}
                    >
                      <MobileTableCard
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
                    </SwipeableListItem>
                  ))}
                </div>
              )}
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
