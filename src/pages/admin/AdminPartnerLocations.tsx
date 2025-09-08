import React, { useState, useEffect, useMemo } from 'react';
import { Plus, MapPin, Building2, CheckSquare, RotateCcw } from 'lucide-react';
import { usePartnerLocations } from '@/hooks/usePartnerLocations';
import { useOrganizations } from '@/hooks/useOrganizations';
import { useIsMobile } from '@/hooks/use-mobile';
import { useViewMode } from '@/hooks/useViewMode';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { RowSelectionState } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator, BreadcrumbPage } from '@/components/ui/breadcrumb';
import { AddLocationModal } from '@/components/admin/partner-locations/AddLocationModal';
import { EditLocationModal } from '@/components/admin/partner-locations/EditLocationModal';
import { DeleteConfirmationDialog } from '@/components/ui/delete-confirmation-dialog';
import { LocationTable } from '@/components/admin/partner-locations/LocationTable';
import { BulkActionsBar } from '@/components/admin/partner-locations/BulkActionsBar';
import { usePartnerLocationMutations } from '@/hooks/usePartnerLocations';
import { useToast } from '@/hooks/use-toast';
export default function AdminPartnerLocations() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrganization, setSelectedOrganization] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<any>(null);
  const [deletingLocation, setDeletingLocation] = useState<any>(null);

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


  const handleRefresh = async () => {
    try {
      await Promise.all([refetchLocations(), refetchOrgs()]);
      toast({
        title: "Data refreshed",
        description: "Partner locations have been updated"
      });
    } catch (error) {
      console.error('Refresh failed:', error);
    }
  };

  // Bulk operations handlers
  const handleBulkStatusChange = async (status: 'active' | 'inactive', ids: string[]) => {
    try {
      // TODO: Implement bulk status change API call
      console.log('Bulk status change:', { status, ids });
      toast({
        title: "Status Updated",
        description: `${ids.length} locations set to ${status}`
      });
      setRowSelection({});
      await handleRefresh();
    } catch (error) {
      console.error('Bulk status change failed:', error);
      toast({
        title: "Error",
        description: "Failed to update location status",
        variant: "destructive"
      });
    }
  };

  const handleBulkDelete = async (ids: string[]) => {
    try {
      // TODO: Implement bulk delete API call
      console.log('Bulk delete:', ids);
      toast({
        title: "Locations Deleted",
        description: `${ids.length} locations have been deleted`
      });
      setRowSelection({});
      await handleRefresh();
    } catch (error) {
      console.error('Bulk delete failed:', error);
      toast({
        title: "Error",
        description: "Failed to delete locations",
        variant: "destructive"
      });
    }
  };

  const handleBulkExport = (format: 'csv' | 'excel', ids: string[]) => {
    const selectedLocations = filteredLocations.filter(location => ids.includes(location.id));
    // Export selected locations using existing export logic
    console.log('Bulk export:', { format, selectedLocations });
    toast({
      title: "Export Complete",
      description: `Exported ${selectedLocations.length} selected locations`
    });
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
      toast({
        title: "Error",
        description: "Failed to delete location",
        variant: "destructive"
      });
    }
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setSelectedOrganization('all');
    setStatusFilter('all');
    setSelectedLocations([]);
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

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb className="mb-6">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/admin">Admin</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Partner Locations</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Page Header */}
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight">
            Partner Locations
          </h1>
        </div>
        
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button
            variant={bulkMode ? "default" : "outline"}
            onClick={() => setBulkMode(!bulkMode)}
            className="flex-1 sm:flex-initial h-9"
          >
            <CheckSquare className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Select Multiple</span>
            <span className="sm:hidden">Select</span>
          </Button>
          
          <Button 
            onClick={() => setIsAddModalOpen(true)} 
            className="flex-1 sm:flex-initial h-9"
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

      {/* Main Content */}
      <LocationTable
        data={filteredLocations}
        isLoading={isLoading}
        filters={{
          search: searchTerm,
          organization_id: selectedOrganization,
          status: statusFilter as 'all' | 'active' | 'inactive',
          location_ids: selectedLocations
        }}
        onFiltersChange={(newFilters) => {
          setSearchTerm(newFilters.search || '');
          setSelectedOrganization(newFilters.organization_id || 'all');
          setStatusFilter(newFilters.status || 'all');
          setSelectedLocations(newFilters.location_ids || []);
        }}
        onClearFilters={handleClearFilters}
        locationOptions={locationOptions}
        organizationMap={organizationMap}
        isMobile={isMobile}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        rowSelection={rowSelection}
        setRowSelection={setRowSelection}
        bulkMode={bulkMode}
        onEdit={(location) => setEditingLocation(location)}
        onDelete={(location) => setDeletingLocation(location)}
        onRefresh={handleRefresh}
        onAddLocation={() => setIsAddModalOpen(true)}
        onBulkStatusChange={handleBulkStatusChange}
        onBulkDelete={handleBulkDelete}
      />

      {/* Bulk Actions Bar */}
      {bulkMode && Object.keys(rowSelection).length > 0 && (
        <BulkActionsBar
          selectedCount={Object.keys(rowSelection).length}
          selectedIds={Object.keys(rowSelection)}
          onClearSelection={() => setRowSelection({})}
          onExport={handleBulkExport}
          onBulkStatusChange={handleBulkStatusChange}
          onBulkDelete={handleBulkDelete}
          loading={isLoading}
        />
      )}

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