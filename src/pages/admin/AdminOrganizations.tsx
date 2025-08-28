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
import { Plus, Edit, RotateCcw, ClipboardList, Power, ArrowUpDown, ArrowUp, ArrowDown, CheckSquare } from 'lucide-react';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
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
import { CompactOrganizationFilters } from '@/components/admin/organizations/CompactOrganizationFilters';
import { useIsMobile } from '@/hooks/use-mobile';

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
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(search, 500);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [bulkMode, setBulkMode] = useState(false);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const isMobile = useIsMobile();

  const { data: organizations, isLoading, error, refetch } = useOrganizations();

  useEffect(() => {
    setFilters({ search: debouncedSearch });
  }, [debouncedSearch]);

  // Sync searchTerm with search state
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setSearch(value);
  };

  const [typeFilter, setTypeFilter] = useState<'all' | 'internal' | 'partner' | 'subcontractor'>('all');

  // Calculate active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (typeFilter !== 'all') count++;
    if (statusFilter !== 'all') count++;
    return count;
  }, [typeFilter, statusFilter]);
  const [sort, setSort] = useState<{ key: 'name' | 'initials' | 'contact_email' | 'organization_type'; desc: boolean}>(() => {
    try {
      const raw = localStorage.getItem('admin-organizations-sort-v1');
      if (raw) return JSON.parse(raw);
    } catch {}
    return { key: 'name', desc: false };
  });

  // Persist filters in localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem('admin-organizations-filters-v1');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.type) setTypeFilter(parsed.type);
        if (parsed?.status) setStatusFilter(parsed.status);
      }
    } catch (e) {
      console.warn('Failed to parse org filters from localStorage', e);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('admin-organizations-filters-v1', JSON.stringify({ 
        type: typeFilter, 
        status: statusFilter 
      }));
    } catch {}
  }, [typeFilter, statusFilter]);

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
    if (statusFilter === 'active') {
      data = data.filter(o => o.is_active);
    } else if (statusFilter === 'inactive') {
      data = data.filter(o => !o.is_active);
    }
    const sorted = [...data].sort((a, b) => {
      const aVal = String((a as any)[sort.key] ?? '').toLowerCase();
      const bVal = String((b as any)[sort.key] ?? '').toLowerCase();
      const cmp = aVal.localeCompare(bVal);
      return sort.desc ? -cmp : cmp;
    });
    return sorted;
  }, [organizations, filters.search, typeFilter, statusFilter, sort]);

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
    setSearchTerm('');
    setFilters({});
    setTypeFilter('all');
    setStatusFilter('all');
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
    <div className="space-y-6">
      {/* Add breadcrumb */}
      <Breadcrumb className="mb-6">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/admin">Admin</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Organizations</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Page header */}
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight">
            Organizations
          </h1>
          <p className="text-muted-foreground">
            {filteredOrganizations.length !== organizations?.length
              ? `${filteredOrganizations.length} matching of ${organizations?.length || 0} organizations`
              : `${organizations?.length || 0} total organizations`
            }
          </p>
        </div>
        
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Bulk select */}
          <Button
            variant={bulkMode ? "default" : "outline"}
            onClick={() => setBulkMode(!bulkMode)}
            className="flex-1 sm:flex-initial"
          >
            <CheckSquare className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Select Multiple</span>
            <span className="sm:hidden">Select</span>
          </Button>
          
          {/* Create button */}
          <Button 
            onClick={() => setShowCreateModal(true)} 
            className="flex-1 sm:flex-initial"
          >
            <Plus className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Create Organization</span>
            <span className="sm:hidden">New</span>
          </Button>
        </div>
      </header>

      <Card className="overflow-hidden">
        {/* Desktop toolbar */}
        <div className="border-b">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6">
            <div className="flex items-center gap-4">
              <h2 className="text-lg font-semibold">Organizations</h2>
              <ViewModeSwitcher
                value={viewMode}
                onValueChange={setViewMode}
                allowedModes={allowedModes}
              />
            </div>
            
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <SmartSearchInput
                placeholder="Search name, email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                storageKey="admin-organizations-search"
                className="max-w-xs"
              />
              
              <CompactOrganizationFilters
                value={{
                  organizationType: typeFilter,
                  status: statusFilter
                }}
                onChange={(filters) => {
                  setTypeFilter(filters.organizationType || 'all');
                  setStatusFilter(filters.status || 'all');
                }}
                onClear={() => {
                  setTypeFilter('all');
                  setStatusFilter('all');
                }}
              />
              
              {!isMobile && (
                <>
                  <ColumnVisibilityDropdown
                    columns={columnOptions}
                    onToggleColumn={(id) => { if (id !== 'actions') toggleColumn(id); }}
                    onResetToDefaults={resetToDefaults}
                    visibleCount={columnOptions.filter(c => c.canHide && c.visible).length}
                    totalCount={columnOptions.filter(c => c.canHide).length}
                  />
                  <ExportDropdown 
                    onExport={handleExport} 
                    disabled={isLoading || filteredOrganizations.length === 0} 
                  />
                </>
              )}
            </div>
          </div>
        </div>

        {/* Mobile toolbar */}
        {isMobile && (
          <div className="bg-muted/30 border rounded-lg p-3 space-y-3 m-4">
            <SmartSearchInput
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full"
            />
            <div className="flex items-center gap-2">
              <CompactOrganizationFilters
                value={{
                  organizationType: typeFilter,
                  status: statusFilter
                }}
                onChange={(filters) => {
                  setTypeFilter(filters.organizationType || 'all');
                  setStatusFilter(filters.status || 'all');
                }}
                onClear={() => {
                  setTypeFilter('all');
                  setStatusFilter('all');
                }}
              />
              {bulkMode && Object.keys(rowSelection).length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setRowSelection({})}
                  className="shrink-0"
                >
                  Clear ({Object.keys(rowSelection).length})
                </Button>
              )}
            </div>
          </div>
        )}
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
                    description={(filters.search || typeFilter !== 'all' || statusFilter !== 'all') ? "Try adjusting your search or filters" : "Get started by creating your first organization"}
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
                          <TableHead className="w-[120px]">
                            <button
                              className="flex items-center gap-1"
                              onClick={() => setSort((s) => ({ key: 'initials', desc: s.key === 'initials' ? !s.desc : false }))}
                              aria-label={`Sort by initials ${sort.key === 'initials' ? (sort.desc ? '(desc)' : '(asc)') : ''}`}
                            >
                              <span>Initials</span>
                              {sort.key === 'initials' ? (
                                sort.desc ? <ArrowDown className="h-4 w-4 text-muted-foreground" /> : <ArrowUp className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                              )}
                            </button>
                          </TableHead>
                        )}
                        {columnVisibility['name'] && (
                          <TableHead>
                            <button
                              className="flex items-center gap-1"
                              onClick={() => setSort((s) => ({ key: 'name', desc: s.key === 'name' ? !s.desc : false }))}
                              aria-label={`Sort by name ${sort.key === 'name' ? (sort.desc ? '(desc)' : '(asc)') : ''}`}
                            >
                              <span>Name</span>
                              {sort.key === 'name' ? (
                                sort.desc ? <ArrowDown className="h-4 w-4 text-muted-foreground" /> : <ArrowUp className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                              )}
                            </button>
                          </TableHead>
                        )}
                        {columnVisibility['contact_email'] && (
                          <TableHead>
                            <button
                              className="flex items-center gap-1"
                              onClick={() => setSort((s) => ({ key: 'contact_email', desc: s.key === 'contact_email' ? !s.desc : false }))}
                              aria-label={`Sort by contact email ${sort.key === 'contact_email' ? (sort.desc ? '(desc)' : '(asc)') : ''}`}
                            >
                              <span>Contact Email</span>
                              {sort.key === 'contact_email' ? (
                                sort.desc ? <ArrowDown className="h-4 w-4 text-muted-foreground" /> : <ArrowUp className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                              )}
                            </button>
                          </TableHead>
                        )}
                        {columnVisibility['organization_type'] && (
                          <TableHead>
                            <button
                              className="flex items-center gap-1"
                              onClick={() => setSort((s) => ({ key: 'organization_type', desc: s.key === 'organization_type' ? !s.desc : false }))}
                              aria-label={`Sort by type ${sort.key === 'organization_type' ? (sort.desc ? '(desc)' : '(asc)') : ''}`}
                            >
                              <span>Type</span>
                              {sort.key === 'organization_type' ? (
                                sort.desc ? <ArrowDown className="h-4 w-4 text-muted-foreground" /> : <ArrowUp className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                              )}
                            </button>
                          </TableHead>
                        )}
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
