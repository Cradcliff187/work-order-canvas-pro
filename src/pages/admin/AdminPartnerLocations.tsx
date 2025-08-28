import React, { useState, useEffect, useMemo } from 'react';
import { Plus, MapPin, Building2, Search, Filter, Edit, Trash2, RotateCcw, ArrowUpDown, ArrowUp, ArrowDown, CheckSquare } from 'lucide-react';
import { usePartnerLocations } from '@/hooks/usePartnerLocations';
import { useOrganizations } from '@/hooks/useOrganizations';
import { useIsMobile } from '@/hooks/use-mobile';
import { useViewMode } from '@/hooks/useViewMode';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { RowSelectionState } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MultiSelectFilter } from '@/components/ui/multi-select-filter';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AddLocationModal } from '@/components/admin/partner-locations/AddLocationModal';
import { EditLocationModal } from '@/components/admin/partner-locations/EditLocationModal';
import { DeleteConfirmationDialog } from '@/components/ui/delete-confirmation-dialog';
import { LocationTable } from '@/components/admin/partner-locations/LocationTable';
import { usePartnerLocationMutations } from '@/hooks/usePartnerLocations';
import { toast } from 'sonner';
export default function AdminPartnerLocations() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrganization, setSelectedOrganization] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<any>(null);
  const [deletingLocation, setDeletingLocation] = useState<any>(null);
  const [isDesktopFilterOpen, setIsDesktopFilterOpen] = useState(false);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  // New state for bulk operations and view mode
  const isMobile = useIsMobile();
  const [bulkMode, setBulkMode] = useState(false);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  const { viewMode, setViewMode, allowedModes } = useViewMode({
    componentKey: 'admin-partner-locations',
    config: {
      mobile: ['card'],
      desktop: ['table', 'card']
    },
    defaultMode: 'table'
  });

  // Pull-to-refresh hook
  usePullToRefresh({
    queryKey: 'partner-locations',
    onRefresh: async () => {
      await refetchLocations();
      await refetchOrgs();
    }
  });

  // Persist filters
  useEffect(() => {
    try {
      const raw = localStorage.getItem('admin-partner-locations-filters-v1');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (typeof parsed.searchTerm === 'string') setSearchTerm(parsed.searchTerm);
        if (typeof parsed.selectedOrganization === 'string') setSelectedOrganization(parsed.selectedOrganization);
        if (typeof parsed.statusFilter === 'string') setStatusFilter(parsed.statusFilter);
        if (Array.isArray(parsed.selectedLocations)) setSelectedLocations(parsed.selectedLocations);
      }
    } catch (e) {
      console.warn('Failed to parse partner locations filters', e);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(
        'admin-partner-locations-filters-v1',
        JSON.stringify({ searchTerm, selectedOrganization, statusFilter, selectedLocations })
      );
    } catch {}
  }, [searchTerm, selectedOrganization, statusFilter, selectedLocations]);
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

  // Filter partner organizations
  const partnerOrganizations = organizations.filter(org => org.organization_type === 'partner');

  // Create location options for filter
  const locationOptions = useMemo(() => {
    const options = [{ value: 'all', label: 'All Locations' }];
    const sortedLocations = [...allLocations].sort((a, b) => {
      const orgA = organizationMap[a.organization_id]?.name || '';
      const orgB = organizationMap[b.organization_id]?.name || '';
      if (orgA !== orgB) return orgA.localeCompare(orgB);
      return a.location_name.localeCompare(b.location_name);
    });
    
    sortedLocations.forEach(location => {
      const org = organizationMap[location.organization_id];
      options.push({
        value: location.id,
        label: `${location.location_name} (${location.location_number}) - ${org?.name || 'Unknown Org'}`
      });
    });
    
    return options;
  }, [allLocations, organizationMap]);

  // Calculate active filter count
  const filterCount = useMemo(() => [
    searchTerm,
    selectedOrganization !== 'all' ? selectedOrganization : null,
    statusFilter !== 'all' ? statusFilter : null,
    selectedLocations.length > 0 ? selectedLocations : null
  ].filter(Boolean).length, [searchTerm, selectedOrganization, statusFilter, selectedLocations]);

  // Filter locations based on search term, organization, status, and selected locations
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

    const matchesSelectedLocations = selectedLocations.length === 0 || 
      selectedLocations.includes(location.id);

    return matchesSearch && matchesOrganization && matchesStatus && matchesSelectedLocations;
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

  // Convert filters to LocationTable format
  const locationFilters = {
    search: searchTerm,
    organization_id: selectedOrganization,
    status: statusFilter as 'all' | 'active' | 'inactive',
    location_ids: selectedLocations,
  };

  const handleFiltersChange = (newFilters: any) => {
    setSearchTerm(newFilters.search || '');
    setSelectedOrganization(newFilters.organization_id || 'all');
    setStatusFilter(newFilters.status || 'all');
    setSelectedLocations(newFilters.location_ids || []);
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

  const handleRefresh = async () => {
    await refetchLocations();
    await refetchOrgs();
  };
  if (loadError) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center space-y-4">
              <p className="text-destructive">We couldn't load partner locations. Please try again.</p>
              <Button onClick={handleRefresh} variant="outline">
                <RotateCcw className="w-4 h-4 mr-2" />
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setSelectedOrganization('all');
    setStatusFilter('all');
    setSelectedLocations([]);
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight">
            Partner Locations
          </h1>
          <p className="text-muted-foreground">
            {filteredLocations.length} of {allLocations.length} locations
          </p>
        </div>
        
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Bulk select button */}
          <Button
            variant={bulkMode ? "default" : "outline"}
            onClick={() => setBulkMode(!bulkMode)}
            className="flex-1 sm:flex-initial"
          >
            <CheckSquare className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Select Multiple</span>
            <span className="sm:hidden">Select</span>
          </Button>
          
          {/* Add location button */}
          <Button 
            onClick={() => setIsAddModalOpen(true)} 
            className="flex-1 sm:flex-initial"
          >
            <Plus className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Add Location</span>
            <span className="sm:hidden">Add</span>
          </Button>
        </div>
      </header>

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
            <div className="text-2xl font-bold">{partnerOrganizations.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Location Table */}
      <LocationTable
        data={sortedLocations}
        isLoading={isLoading}
        filters={locationFilters}
        onFiltersChange={handleFiltersChange}
        onClearFilters={handleClearFilters}
        locationOptions={locationOptions}
        organizationMap={organizationMap}
        isMobile={isMobile}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        rowSelection={rowSelection}
        setRowSelection={setRowSelection}
        bulkMode={bulkMode}
        onEdit={setEditingLocation}
        onDelete={setDeletingLocation}
        onRefresh={handleRefresh}
        onAddLocation={() => setIsAddModalOpen(true)}
      />
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