import React, { useState } from 'react';
import { Plus, MapPin, Building2, Search, Filter, Edit, Trash2 } from 'lucide-react';
import { usePartnerLocations } from '@/hooks/usePartnerLocations';
import { useOrganizations } from '@/hooks/useOrganizations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AddLocationModal } from '@/components/admin/partner-locations/AddLocationModal';
import { EditLocationModal } from '@/components/admin/partner-locations/EditLocationModal';
import { DeleteConfirmationDialog } from '@/components/ui/delete-confirmation-dialog';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { MobileTableCard } from '@/components/admin/shared/MobileTableCard';
import { usePartnerLocationMutations } from '@/hooks/usePartnerLocations';
import { toast } from 'sonner';

export default function AdminPartnerLocations() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrganization, setSelectedOrganization] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<any>(null);
  const [deletingLocation, setDeletingLocation] = useState<any>(null);

  // Fetch all partner locations (admin can see all)
  const { data: allLocations = [], isLoading: locationsLoading } = usePartnerLocations();
  const { data: organizations = [], isLoading: orgsLoading } = useOrganizations();
  const { deleteLocation } = usePartnerLocationMutations();

  const isLoading = locationsLoading || orgsLoading;

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

  const handleDeleteLocation = async () => {
    if (!deletingLocation) return;
    
    try {
      await deleteLocation.mutateAsync(deletingLocation.id);
      setDeletingLocation(null);
    } catch (error) {
      toast.error('Failed to delete location');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
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
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col space-y-4 md:flex-row md:space-y-0 md:space-x-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search locations, organizations, or cities..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            
            <Select value={selectedOrganization} onValueChange={setSelectedOrganization}>
              <SelectTrigger className="w-full md:w-[200px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="All Organizations" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Organizations</SelectItem>
                {organizations
                  .filter(org => org.organization_type === 'partner')
                  .map(org => (
                    <SelectItem key={org.id} value={org.id}>
                      {org.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[150px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Locations Table */}
      <Card>
        <CardHeader>
          <CardTitle>Locations ({filteredLocations.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Desktop Table */}
          <div className="hidden lg:block rounded-md border">
            <Table className="admin-table">
              <TableHeader>
                <TableRow>
                  <TableHead>Organization</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Number</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLocations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      No locations found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLocations.map((location) => {
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
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeletingLocation(location)}
                              className="text-destructive hover:text-destructive"
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
              <div className="text-center py-12 text-muted-foreground">
                No locations found.
              </div>
            ) : (
              filteredLocations.map((location) => {
                const organization = organizationMap[location.organization_id];
                const address = [location.city, location.state, location.zip_code].filter(Boolean).join(', ');
                
                return (
                  <MobileTableCard
                    key={location.id}
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
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </MobileTableCard>
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