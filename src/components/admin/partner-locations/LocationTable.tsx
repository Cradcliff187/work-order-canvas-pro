import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ViewModeSwitcher } from '@/components/ui/view-mode-switcher';
import { SmartSearchInput } from '@/components/ui/smart-search-input';
import { ColumnVisibilityDropdown } from '@/components/ui/column-visibility-dropdown';
import { ExportDropdown } from '@/components/ui/export-dropdown';
import { EnhancedTableSkeleton } from '@/components/EnhancedTableSkeleton';
import { CompactLocationFilters } from './CompactLocationFilters';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MobileTableCard } from '@/components/admin/shared/MobileTableCard';
import { Badge } from '@/components/ui/badge';
import { MapPin, Building2, Phone, Mail, Edit, Trash2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { type ViewMode } from '@/hooks/useViewMode';
import { type RowSelectionState } from '@tanstack/react-table';

interface LocationFilters {
  search?: string;
  organization_id?: string;
  status?: 'all' | 'active' | 'inactive';
  location_ids?: string[];
}

interface PartnerLocation {
  id: string;
  location_name: string;
  location_number: string;
  organization_id: string;
  street_address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  is_active: boolean;
  created_at: string;
}

interface LocationTableProps {
  data: PartnerLocation[];
  organizationMap: Record<string, any>;
  isLoading: boolean;
  filters: LocationFilters;
  onFiltersChange: (filters: LocationFilters) => void;
  onClearFilters: () => void;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  allowedModes: ViewMode[];
  isMobile: boolean;
  bulkMode: boolean;
  rowSelection?: RowSelectionState;
  setRowSelection?: (selection: RowSelectionState | ((prev: RowSelectionState) => RowSelectionState)) => void;
  columnOptions: Array<{ id: string; label: string; visible: boolean; canHide: boolean }>;
  toggleColumn: (columnId: string) => void;
  resetToDefaults: () => void;
  onEdit: (location: PartnerLocation) => void;
  onDelete: (location: PartnerLocation) => void;
  onExport: (format: 'csv' | 'excel') => void;
}

export function LocationTable({
  data,
  organizationMap,
  isLoading,
  filters,
  onFiltersChange,
  onClearFilters,
  viewMode,
  setViewMode,
  allowedModes,
  isMobile,
  bulkMode,
  rowSelection = {},
  setRowSelection,
  columnOptions,
  toggleColumn,
  resetToDefaults,
  onEdit,
  onDelete,
  onExport
}: LocationTableProps) {
  
  // Generate location options for filters
  const locationOptions = useMemo(() => {
    const options = [{ value: 'all', label: 'All Locations' }];
    const sortedLocations = [...data].sort((a, b) => {
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
  }, [data, organizationMap]);

  const handleExport = (format: 'csv' | 'excel') => {
    onExport(format);
  };

  // Render table content
  const renderTableContent = () => {
    if (data.length === 0) {
      return (
        <div className="text-center py-12">
          <MapPin className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-2 text-sm font-semibold text-gray-900">No locations</h3>
          <p className="mt-1 text-sm text-gray-500">
            No partner locations found matching your criteria.
          </p>
        </div>
      );
    }

    if (viewMode === 'card') {
      return (
        <div className="grid gap-4 p-4 md:grid-cols-2 lg:grid-cols-3">
          {data.map((location) => {
            const org = organizationMap[location.organization_id];
            const address = [location.street_address, location.city, location.state, location.zip_code]
              .filter(Boolean)
              .join(', ') || 'No address';
            
            return (
              <div key={location.id} className="relative">
                {bulkMode && (
                  <div className="absolute top-2 left-2 z-10">
                    <Checkbox
                      checked={!!rowSelection[location.id]}
                      onCheckedChange={(checked) => {
                        if (!setRowSelection) return;
                        setRowSelection(prev => ({
                          ...prev,
                          [location.id]: !!checked
                        }));
                      }}
                    />
                  </div>
                )}
                <MobileTableCard
                  title={location.location_name}
                  subtitle={`#${location.location_number} • ${org?.name || 'Unknown Org'}`}
                  badge={
                    <Badge variant={location.is_active ? 'success' : 'secondary'}>
                      {location.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  }
                  actions={[
                    {
                      label: 'Edit',
                      icon: Edit,
                      onClick: () => onEdit(location)
                    },
                    {
                      label: 'Delete',
                      icon: Trash2,
                      onClick: () => onDelete(location)
                    }
                  ]}
                >
                  <div className="space-y-2 text-sm">
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <span className="text-muted-foreground">{address}</span>
                    </div>
                    {location.contact_name && (
                      <div className="flex items-start gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <div>
                          <div className="font-medium">{location.contact_name}</div>
                          {location.contact_email && (
                            <div className="text-xs text-muted-foreground">{location.contact_email}</div>
                          )}
                          {location.contact_phone && (
                            <div className="text-xs text-muted-foreground">{location.contact_phone}</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </MobileTableCard>
              </div>
            );
          })}
        </div>
      );
    }

    // Table view
    return (
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {bulkMode && (
                <TableHead className="w-12">
                  <Checkbox
                    checked={data.length > 0 && data.every(item => rowSelection[item.id])}
                    onCheckedChange={(checked) => {
                      if (!setRowSelection) return;
                      if (checked) {
                        const newSelection: RowSelectionState = {};
                        data.forEach(item => {
                          newSelection[item.id] = true;
                        });
                        setRowSelection(newSelection);
                      } else {
                        setRowSelection({});
                      }
                    }}
                  />
                </TableHead>
              )}
              {columnOptions.filter(col => col.visible).map(col => (
                <TableHead key={col.id}>{col.label}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((location) => {
              const org = organizationMap[location.organization_id];
              return (
                <TableRow key={location.id}>
                  {bulkMode && (
                    <TableCell>
                      <Checkbox
                        checked={!!rowSelection[location.id]}
                        onCheckedChange={(checked) => {
                          if (!setRowSelection) return;
                          setRowSelection(prev => ({
                            ...prev,
                            [location.id]: !!checked
                          }));
                        }}
                      />
                    </TableCell>
                  )}
                  {columnOptions.find(col => col.id === 'location_number')?.visible && (
                    <TableCell className="font-mono text-sm">
                      #{location.location_number}
                    </TableCell>
                  )}
                  {columnOptions.find(col => col.id === 'location_name')?.visible && (
                    <TableCell className="font-medium">
                      {location.location_name}
                    </TableCell>
                  )}
                  {columnOptions.find(col => col.id === 'organization')?.visible && (
                    <TableCell>
                      {org?.name || 'Unknown'}
                    </TableCell>
                  )}
                  {columnOptions.find(col => col.id === 'address')?.visible && (
                    <TableCell>
                      {[location.street_address, location.city, location.state, location.zip_code]
                        .filter(Boolean)
                        .join(', ') || 'No address'}
                    </TableCell>
                  )}
                  {columnOptions.find(col => col.id === 'contact')?.visible && (
                    <TableCell>
                      {location.contact_name && (
                        <div className="space-y-1">
                          <div className="text-sm font-medium">{location.contact_name}</div>
                          {location.contact_email && (
                            <div className="text-xs text-muted-foreground">{location.contact_email}</div>
                          )}
                          {location.contact_phone && (
                            <div className="text-xs text-muted-foreground">{location.contact_phone}</div>
                          )}
                        </div>
                      )}
                    </TableCell>
                  )}
                  {columnOptions.find(col => col.id === 'status')?.visible && (
                    <TableCell>
                      <Badge variant={location.is_active ? 'success' : 'secondary'}>
                        {location.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                  )}
                  {columnOptions.find(col => col.id === 'actions')?.visible && (
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            ⋮
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onEdit(location)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onDelete(location)}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    );
  };

  return (
    <Card className="overflow-hidden">
      {/* Desktop Toolbar */}
      <div className="border-b">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold">Locations</h2>
            <ViewModeSwitcher
              value={viewMode}
              onValueChange={setViewMode}
              allowedModes={allowedModes}
            />
          </div>
          
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Search */}
            <SmartSearchInput
              placeholder="Search locations, addresses..."
              value={filters.search || ''}
              onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
              storageKey="admin-partner-locations-search"
              className="max-w-xs"
            />
            
            {/* Compact Filters */}
            <CompactLocationFilters
              value={filters}
              onChange={onFiltersChange}
              onClear={onClearFilters}
              locationOptions={locationOptions}
            />
            
            {/* Desktop only */}
            {!isMobile && (
              <>
                <ColumnVisibilityDropdown
                  columns={columnOptions}
                  onToggleColumn={toggleColumn}
                  onResetToDefaults={resetToDefaults}
                />
                <ExportDropdown onExport={handleExport} />
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Toolbar */}
      {isMobile && (
        <div className="bg-muted/30 border rounded-lg p-3 space-y-3 m-4">
          <SmartSearchInput
            placeholder="Search..."
            value={filters.search || ''}
            onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
            className="w-full"
          />
          <div className="flex items-center gap-2">
            <CompactLocationFilters
              value={filters}
              onChange={onFiltersChange}
              onClear={onClearFilters}
              locationOptions={locationOptions}
            />
            {bulkMode && rowSelection && Object.keys(rowSelection).length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRowSelection && setRowSelection({})}
                className="shrink-0"
              >
                Clear ({Object.keys(rowSelection).length})
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Table/Card Content */}
      {isLoading ? (
        <EnhancedTableSkeleton rows={10} columns={8} />
      ) : (
        renderTableContent()
      )}
    </Card>
  );
}