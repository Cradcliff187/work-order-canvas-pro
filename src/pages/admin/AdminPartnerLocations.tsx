import React, { useState, useEffect, useMemo } from 'react';
import { Plus, MapPin, Building2, Search, Filter, Edit, Trash2, RotateCcw, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { usePartnerLocations } from '@/hooks/usePartnerLocations';
import { useOrganizations } from '@/hooks/useOrganizations';
import { Button } from '@/components/ui/button';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AddLocationModal } from '@/components/admin/partner-locations/AddLocationModal';
import { EditLocationModal } from '@/components/admin/partner-locations/EditLocationModal';
import { DeleteConfirmationDialog } from '@/components/ui/delete-confirmation-dialog';
import { EnhancedTableSkeleton } from '@/components/EnhancedTableSkeleton';
import { MobileTableCard } from '@/components/admin/shared/MobileTableCard';
import { usePartnerLocationMutations } from '@/hooks/usePartnerLocations';
import { toast } from 'sonner';
import { ExportDropdown } from '@/components/ui/export-dropdown';
import { ColumnVisibilityDropdown } from '@/components/ui/column-visibility-dropdown';
import { useColumnVisibility } from '@/hooks/useColumnVisibility';
import { SmartSearchInput } from '@/components/ui/smart-search-input';
import { EmptyTableState } from '@/components/ui/empty-table-state';
import { exportToCSV, exportToExcel, generateFilename, ExportColumn } from '@/lib/utils/export';
import { SwipeableListItem } from '@/components/ui/swipeable-list-item';
import { PartnerLocationFilters } from '@/components/admin/partner-locations/PartnerLocationFilters';
export default function AdminPartnerLocations() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrganization, setSelectedOrganization] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<any>(null);
  const [deletingLocation, setDeletingLocation] = useState<any>(null);

  // Persist filters
  useEffect(() => {
    try {
      const raw = localStorage.getItem('admin-partner-locations-filters-v1');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (typeof parsed.searchTerm === 'string') setSearchTerm(parsed.searchTerm);
        if (typeof parsed.selectedOrganization === 'string') setSelectedOrganization(parsed.selectedOrganization);
        if (typeof parsed.statusFilter === 'string') setStatusFilter(parsed.statusFilter);
      }
    } catch (e) {
      console.warn('Failed to parse partner locations filters', e);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(
        'admin-partner-locations-filters-v1',
        JSON.stringify({ searchTerm, selectedOrganization, statusFilter })
      );
    } catch {}
  }, [searchTerm, selectedOrganization, statusFilter]);
// Fetch all partner locations (admin can see all)
  const { data: allLocations = [], isLoading: locationsLoading, error: locationsError, refetch: refetchLocations } = usePartnerLocations();
  const { data: organizations = [], isLoading: orgsLoading, error: orgsError, refetch: refetchOrgs } = useOrganizations();
  const { deleteLocation } = usePartnerLocationMutations();

  const isLoading = locationsLoading || orgsLoading;
  const loadError = locationsError || orgsError;

  // Create a map of organization IDs to organization data
  const organizationMap = organizations.reduce((acc, org) => {
    acc[org.id] = org;
    return acc;
  }, {} as Record<string, any>);

  // Filter locations based on search term, organization, and status
  const filteredLocations = allLocations.filter(location => {
    const org = organizationMap[location.organization_id];
    const matchesSearch = searchTerm === '' || 
      location.location_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      location.location_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (org?.name && org.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (location.city && location.city.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (location.state && location.state.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesOrganization = selectedOrganization === 'all' || 
      location.organization_id === selectedOrganization;

    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && location.is_active) ||
      (statusFilter === 'inactive' && !location.is_active);

    return matchesSearch && matchesOrganization && matchesStatus;
  });

  // Sorting state and helpers
  type SortKey = 'organization' | 'location_name' | 'location_number' | 'address' | 'status';
  const [sortKey, setSortKey] = useState<SortKey>('organization');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDir('asc');
    }
  };
  const sortedLocations = useMemo(() => {
    const rows = [...filteredLocations];
    rows.sort((a, b) => {
      let av: any = '';
      let bv: any = '';
      switch (sortKey) {
        case 'organization':
          av = organizationMap[a.organization_id]?.name || '';
          bv = organizationMap[b.organization_id]?.name || '';
          break;
        case 'location_name':
          av = a.location_name || '';
          bv = b.location_name || '';
          break;
        case 'location_number':
          av = a.location_number || '';
          bv = b.location_number || '';
          break;
        case 'address':
          av = [a.city, a.state, a.zip_code].filter(Boolean).join(', ');
          bv = [b.city, b.state, b.zip_code].filter(Boolean).join(', ');
          break;
        case 'status':
          av = a.is_active ? 1 : 0;
          bv = b.is_active ? 1 : 0;
          break;
      }
      if (typeof av === 'string' && typeof bv === 'string') {
        av = av.toLowerCase();
        bv = bv.toLowerCase();
      }
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return rows;
  }, [filteredLocations, sortKey, sortDir, organizationMap]);

  // Get statistics
  const stats = {
    total: allLocations.length,
    active: allLocations.filter(loc => loc.is_active).length,
    inactive: allLocations.filter(loc => !loc.is_active).length,
    byOrganization: organizations.map(org => ({
      name: org.name,
      count: allLocations.filter(loc => loc.organization_id === org.id).length
    })).filter(item => item.count > 0)
  };

  // Column visibility setup
  const columnMetadata = {
    organization: { label: 'Organization', defaultVisible: true },
    location_name: { label: 'Location', defaultVisible: true },
    location_number: { label: 'Number', defaultVisible: true },
    address: { label: 'Address', defaultVisible: true },
    contact: { label: 'Contact', defaultVisible: true },
    status: { label: 'Status', defaultVisible: true },
    actions: { label: 'Actions', defaultVisible: true },
  } as const;

const { columnVisibility, toggleColumn, resetToDefaults, getAllColumns, getVisibleColumnCount } = useColumnVisibility({
  storageKey: 'admin-partner-locations-columns-v1',
  legacyKeys: ['admin-partner-locations-columns'],
  columnMetadata: columnMetadata as any,
});

  const columnOptions = getAllColumns().map((c) => ({
    ...c,
    canHide: c.id !== 'actions',
  }));

  // Export
  const exportColumns: ExportColumn[] = [
    { key: 'organization_name', label: 'Organization', type: 'string' },
    { key: 'location_name', label: 'Location', type: 'string' },
    { key: 'location_number', label: 'Number', type: 'string' },
    { key: 'street_address', label: 'Street', type: 'string' },
    { key: 'city', label: 'City', type: 'string' },
    { key: 'state', label: 'State', type: 'string' },
    { key: 'zip_code', label: 'ZIP', type: 'string' },
    { key: 'contact_name', label: 'Contact Name', type: 'string' },
    { key: 'contact_email', label: 'Contact Email', type: 'string' },
    { key: 'is_active', label: 'Active', type: 'boolean' },
  ];

  const handleExport = (format: 'csv' | 'excel') => {
    const rows = filteredLocations.map((loc) => ({
      ...loc,
      organization_name: organizationMap[loc.organization_id]?.name || '',
    }));
    if (rows.length === 0) return;
    const filename = generateFilename('partner-locations', format === 'excel' ? 'xlsx' : 'csv');
    if (format === 'excel') {
      exportToExcel(rows, exportColumns, filename);
    } else {
      exportToCSV(rows, exportColumns, filename);
    }
  };

  const handleDeleteLocation = async () => {
    if (!deletingLocation) return;
    
    try {
      await deleteLocation.mutateAsync(deletingLocation.id);
      setDeletingLocation(null);
    } catch (error) {
      toast.error('Failed to delete location');
    }
  };
  if (loadError) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center space-y-4">
              <p className="text-destructive">We couldn't load partner locations. Please try again.</p>
              <Button onClick={() => { refetchLocations(); refetchOrgs(); }} variant="outline">
                <RotateCcw className="w-4 h-4 mr-2" />
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  } else if (isLoading) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6">
            <EnhancedTableSkeleton rows={5} columns={7} />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-3xl font-bold tracking-tight">Partner Locations</h1>
          <p className="text-muted-foreground">
            Manage all partner locations across organizations
          </p>
        </div>
        <Button onClick={() => setIsAddModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Location
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Locations</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Locations</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inactive Locations</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.inactive}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Organizations</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.byOrganization.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <PartnerLocationFilters
        searchTerm={searchTerm}
        selectedOrganization={selectedOrganization}
        statusFilter={statusFilter}
        onSearchChange={setSearchTerm}
        onOrganizationChange={setSelectedOrganization}
        onStatusChange={setStatusFilter}
        onClearFilters={() => {
          setSearchTerm('');
          setSelectedOrganization('all');
          setStatusFilter('all');
          try {
            localStorage.removeItem('admin-partner-locations-filters-v1');
            localStorage.removeItem('admin-partner-locations-search');
          } catch {}
        }}
      />

      {/* Locations Table */}
      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Locations ({filteredLocations.length})</CardTitle>
          <div className="flex items-center gap-2">
            <ExportDropdown onExport={handleExport} variant="outline" size="sm" disabled={isLoading || filteredLocations.length === 0} />
            <ColumnVisibilityDropdown
              columns={columnOptions}
              onToggleColumn={(id) => { if (id !== 'actions') toggleColumn(id); }}
              onResetToDefaults={resetToDefaults}
              variant="outline"
              size="sm"
              visibleCount={columnOptions.filter(c => c.canHide && c.visible).length}
              totalCount={columnOptions.filter(c => c.canHide).length}
            />
          </div>
        </CardHeader>
        <CardContent>
          {/* Desktop Table */}
          <div className="hidden lg:block rounded-md border">
            <Table className="admin-table">
              <TableHeader>
                <TableRow>
                  {columnVisibility['organization'] && (
                    <TableHead>
                      <button type="button" onClick={() => handleSort('organization')} className="inline-flex items-center gap-1" aria-label={`Sort by Organization${sortKey==='organization'?` (${sortDir})`:''}`}>
                        <span>Organization</span>
                        {sortKey==='organization' ? (sortDir==='asc'? <ArrowUp className="h-4 w-4 text-muted-foreground"/> : <ArrowDown className="h-4 w-4 text-muted-foreground"/>) : <ArrowUpDown className="h-4 w-4 text-muted-foreground"/>}
                      </button>
                    </TableHead>
                  )}
                  {columnVisibility['location_name'] && (
                    <TableHead>
                      <button type="button" onClick={() => handleSort('location_name')} className="inline-flex items-center gap-1" aria-label={`Sort by Location${sortKey==='location_name'?` (${sortDir})`:''}`}>
                        <span>Location</span>
                        {sortKey==='location_name' ? (sortDir==='asc'? <ArrowUp className="h-4 w-4 text-muted-foreground"/> : <ArrowDown className="h-4 w-4 text-muted-foreground"/>) : <ArrowUpDown className="h-4 w-4 text-muted-foreground"/>}
                      </button>
                    </TableHead>
                  )}
                  {columnVisibility['location_number'] && (
                    <TableHead>
                      <button type="button" onClick={() => handleSort('location_number')} className="inline-flex items-center gap-1" aria-label={`Sort by Number${sortKey==='location_number'?` (${sortDir})`:''}`}>
                        <span>Number</span>
                        {sortKey==='location_number' ? (sortDir==='asc'? <ArrowUp className="h-4 w-4 text-muted-foreground"/> : <ArrowDown className="h-4 w-4 text-muted-foreground"/>) : <ArrowUpDown className="h-4 w-4 text-muted-foreground"/>}
                      </button>
                    </TableHead>
                  )}
                  {columnVisibility['address'] && (
                    <TableHead>
                      <button type="button" onClick={() => handleSort('address')} className="inline-flex items-center gap-1" aria-label={`Sort by Address${sortKey==='address'?` (${sortDir})`:''}`}>
                        <span>Address</span>
                        {sortKey==='address' ? (sortDir==='asc'? <ArrowUp className="h-4 w-4 text-muted-foreground"/> : <ArrowDown className="h-4 w-4 text-muted-foreground"/>) : <ArrowUpDown className="h-4 w-4 text-muted-foreground"/>}
                      </button>
                    </TableHead>
                  )}
                  {columnVisibility['contact'] && (
                    <TableHead>Contact</TableHead>
                  )}
                  {columnVisibility['status'] && (
                    <TableHead>
                      <button type="button" onClick={() => handleSort('status')} className="inline-flex items-center gap-1" aria-label={`Sort by Status${sortKey==='status'?` (${sortDir})`:''}`}>
                        <span>Status</span>
                        {sortKey==='status' ? (sortDir==='asc'? <ArrowUp className="h-4 w-4 text-muted-foreground"/> : <ArrowDown className="h-4 w-4 text-muted-foreground"/>) : <ArrowUpDown className="h-4 w-4 text-muted-foreground"/>}
                      </button>
                    </TableHead>
                  )}
                  {columnVisibility['actions'] && (
                    <TableHead className="text-right">Actions</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLocations.length === 0 ? (
                  <EmptyTableState
                    icon={MapPin}
                    title="No locations found"
                    description={(searchTerm || selectedOrganization !== 'all' || statusFilter !== 'all') ? "Try adjusting your search or filters" : "Get started by adding your first partner location"}
                    action={{
                      label: "Add Location",
                      onClick: () => setIsAddModalOpen(true)
                    }}
                    colSpan={7}
                  />
                ) : (
                  sortedLocations.map((location) => {
                    const organization = organizationMap[location.organization_id];
                    return (
                      <TableRow key={location.id}>
                        <TableCell className="font-medium">
                          {organization?.name || 'Unknown Organization'}
                        </TableCell>
                        <TableCell>{location.location_name}</TableCell>
                        <TableCell>{location.location_number}</TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {location.street_address && (
                              <div>{location.street_address}</div>
                            )}
                            {(location.city || location.state || location.zip_code) && (
                              <div className="text-muted-foreground">
                                {[location.city, location.state, location.zip_code].filter(Boolean).join(', ')}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {location.contact_name && (
                            <div className="text-sm">
                              <div>{location.contact_name}</div>
                              {location.contact_email && (
                                <div className="text-muted-foreground">{location.contact_email}</div>
                              )}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={location.is_active ? "default" : "secondary"} className="h-5 text-[10px] px-1.5">
                            {location.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingLocation(location)}
                              aria-label={`Edit location ${location.location_name}`}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeletingLocation(location)}
                              className="text-destructive hover:text-destructive"
                              aria-label={`Delete location ${location.location_name}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Cards */}
          <div className="block lg:hidden space-y-3">
            {filteredLocations.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-3">{(searchTerm || selectedOrganization !== 'all' || statusFilter !== 'all') ? "No locations match your current filters" : "No partner locations yet"}</p>
                <Button onClick={() => setIsAddModalOpen(true)} variant="outline" size="sm" aria-label="Add first location">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Location
                </Button>
              </div>
            ) : (
              sortedLocations.map((location) => {
                const organization = organizationMap[location.organization_id];
                const address = [location.city, location.state, location.zip_code].filter(Boolean).join(', ');
                
                return (
                  <SwipeableListItem
                    key={location.id}
                    itemName={location.location_name}
                    itemType="location"
                    rightAction={{ icon: Edit, label: 'Edit', color: 'default' }}
                    leftAction={{ icon: Trash2, label: 'Delete', color: 'destructive', confirmMessage: `Delete location "${location.location_name}"?` }}
                    onSwipeRight={() => setEditingLocation(location)}
                    onSwipeLeft={() => setDeletingLocation(location)}
                  >
                    <MobileTableCard
                      title={location.location_name}
                      subtitle={`${organization?.name || 'Unknown Organization'} • #${location.location_number}${address ? ` • ${address}` : ''}`}
                      status={
                        <Badge variant={location.is_active ? "default" : "secondary"} className="h-5 text-[10px] px-1.5">
                          {location.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      }
                      onClick={() => setEditingLocation(location)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="text-xs text-muted-foreground">
                          {location.contact_name && (
                            <div>{location.contact_name}</div>
                          )}
                          {location.contact_email && (
                            <div>{location.contact_email}</div>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingLocation(location);
                            }}
                            aria-label={`Edit location ${location.location_name}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeletingLocation(location);
                            }}
                            className="text-destructive hover:text-destructive"
                            aria-label={`Delete location ${location.location_name}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </MobileTableCard>
                  </SwipeableListItem>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* Modals */}
      <AddLocationModal
        open={isAddModalOpen}
        onOpenChange={setIsAddModalOpen}
        organizationId={undefined}
      />

      <EditLocationModal
        open={!!editingLocation}
        onOpenChange={(open) => !open && setEditingLocation(null)}
        location={editingLocation}
      />

      <DeleteConfirmationDialog
        open={!!deletingLocation}
        onOpenChange={(open) => !open && setDeletingLocation(null)}
        onConfirm={handleDeleteLocation}
        itemName={deletingLocation?.location_name || ''}
        itemType="location"
        isLoading={deleteLocation.isPending}
      />
    </div>
  );
}