import React from 'react';
import { Table } from '@tanstack/react-table';
import { Filter, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { User } from '@/pages/admin/AdminUsers';
import { useOrganizations } from '@/hooks/useOrganizations';

interface UserFiltersProps {
  table: Table<User>;
}

export function UserFilters({ table }: UserFiltersProps) {
  const { data: organizationsData } = useOrganizations();

  const userTypeFilter = table.getColumn('user_type')?.getFilterValue() as string[] || [];
  const statusFilter = table.getColumn('is_active')?.getFilterValue() as boolean | undefined;
  const organizationFilter = table.getColumn('organizations')?.getFilterValue() as string || '';

  const setUserTypeFilter = (types: string[]) => {
    table.getColumn('user_type')?.setFilterValue(types.length > 0 ? types : undefined);
  };

  const setStatusFilter = (status: boolean | undefined) => {
    table.getColumn('is_active')?.setFilterValue(status);
  };

  const setOrganizationFilter = (orgId: string) => {
    table.getColumn('organizations')?.setFilterValue(orgId === 'all' ? '' : orgId);
  };

  const clearFilters = () => {
    table.resetColumnFilters();
  };

  const hasActiveFilters = userTypeFilter.length > 0 || statusFilter !== undefined || organizationFilter !== '';

  const handleUserTypeChange = (type: string, checked: boolean) => {
    let newTypes = [...userTypeFilter];
    if (checked) {
      newTypes.push(type);
    } else {
      newTypes = newTypes.filter(t => t !== type);
    }
    setUserTypeFilter(newTypes);
  };

  return (
    <div className="flex items-center gap-2">
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="border-dashed">
            <Filter className="mr-2 h-4 w-4" />
            Filters
            {hasActiveFilters && (
              <Separator orientation="vertical" className="mx-2 h-4" />
            )}
            {userTypeFilter.length > 0 && (
              <Badge variant="secondary" className="rounded-sm px-1 font-normal">
                {userTypeFilter.length} type{userTypeFilter.length > 1 ? 's' : ''}
              </Badge>
            )}
            {statusFilter !== undefined && (
              <Badge variant="secondary" className="rounded-sm px-1 font-normal lg:hidden">
                Status
              </Badge>
            )}
            {organizationFilter && (
              <Badge variant="secondary" className="rounded-sm px-1 font-normal lg:hidden">
                Org
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80" align="start">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium leading-none">Filters</h4>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="mr-2 h-4 w-4" />
                  Clear
                </Button>
              )}
            </div>
            
            <Separator />
            
            {/* User Type Filter */}
            <div className="space-y-2">
              <h5 className="text-sm font-medium">User Type</h5>
              <div className="space-y-2">
                {['admin', 'employee', 'partner', 'subcontractor'].map((type) => (
                  <div key={type} className="flex items-center space-x-2">
                    <Checkbox
                      id={`type-${type}`}
                      checked={userTypeFilter.includes(type)}
                      onCheckedChange={(checked) => handleUserTypeChange(type, !!checked)}
                    />
                    <label
                      htmlFor={`type-${type}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 capitalize"
                    >
                      {type}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Status Filter */}
            <div className="space-y-2">
              <h5 className="text-sm font-medium">Status</h5>
              <Select
                value={statusFilter === undefined ? 'all' : statusFilter ? 'active' : 'inactive'}
                onValueChange={(value) => {
                  if (value === 'all') {
                    setStatusFilter(undefined);
                  } else {
                    setStatusFilter(value === 'active');
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="active">Active only</SelectItem>
                  <SelectItem value="inactive">Inactive only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* Organization Filter */}
            <div className="space-y-2">
              <h5 className="text-sm font-medium">Organization</h5>
              <Select
                value={organizationFilter || 'all'}
                onValueChange={setOrganizationFilter}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All organizations" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All organizations</SelectItem>
                  {organizationsData?.organizations?.map((org) => (
                    <SelectItem key={org.id} value={org.id}>
                      {org.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters}>
          Reset
          <X className="ml-2 h-4 w-4" />
        </Button>
      )}
    </div>
  );
}