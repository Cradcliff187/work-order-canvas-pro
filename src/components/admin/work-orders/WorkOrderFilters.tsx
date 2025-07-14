
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Search, Filter, Calendar as CalendarIcon, X } from 'lucide-react';
import { format } from 'date-fns';
import { useOrganizationsForWorkOrders, useTrades } from '@/hooks/useWorkOrders';
import { useAutoOrganization } from '@/hooks/useAutoOrganization';
import { cn } from '@/lib/utils';

interface WorkOrderFiltersProps {
  filters: {
    status?: string[];
    trade_id?: string;
    organization_id?: string;
    search?: string;
    date_from?: string;
    date_to?: string;
  };
  onFiltersChange: (filters: any) => void;
  onClearFilters: () => void;
}

const statusOptions = [
  { value: 'received', label: 'Received' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

export function WorkOrderFilters({ filters, onFiltersChange, onClearFilters }: WorkOrderFiltersProps) {
  const { data: organizations } = useOrganizationsForWorkOrders();
  const { data: trades } = useTrades();
  const { shouldShowSelector } = useAutoOrganization();
  const [dateFrom, setDateFrom] = useState<Date | undefined>(
    filters.date_from ? new Date(filters.date_from) : undefined
  );
  const [dateTo, setDateTo] = useState<Date | undefined>(
    filters.date_to ? new Date(filters.date_to) : undefined
  );

  const hasActiveFilters = Object.values(filters).some(value => 
    Array.isArray(value) ? value.length > 0 : Boolean(value)
  );

  const handleStatusToggle = (status: string) => {
    const currentStatuses = filters.status || [];
    const newStatuses = currentStatuses.includes(status)
      ? currentStatuses.filter(s => s !== status)
      : [...currentStatuses, status];
    
    onFiltersChange({ ...filters, status: newStatuses });
  };

  const handleDateFromChange = (date: Date | undefined) => {
    setDateFrom(date);
    onFiltersChange({ 
      ...filters, 
      date_from: date ? format(date, 'yyyy-MM-dd') : undefined 
    });
  };

  const handleDateToChange = (date: Date | undefined) => {
    setDateTo(date);
    onFiltersChange({ 
      ...filters, 
      date_to: date ? format(date, 'yyyy-MM-dd') : undefined 
    });
  };

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-card">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium flex items-center gap-2">
          <Filter className="h-5 w-5" />
          Filters
        </h3>
        {hasActiveFilters && (
          <Button variant="outline" size="sm" onClick={onClearFilters}>
            <X className="h-4 w-4 mr-2" />
            Clear All
          </Button>
        )}
      </div>

      <div className={`grid gap-4 ${shouldShowSelector ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
        {/* Search */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Search</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="WO#, title, or location..."
              value={filters.search || ''}
              onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
              className="pl-10"
            />
          </div>
        </div>

        {/* Organization - Only show for admin users */}
        {shouldShowSelector && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Organization</label>
            <Select
              value={filters.organization_id || 'all-organizations'}
              onValueChange={(value) => onFiltersChange({ 
                ...filters, 
                organization_id: value === 'all-organizations' ? undefined : value 
              })}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Organizations" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all-organizations">All Organizations</SelectItem>
                {Array.isArray(organizations) && organizations.map((org) => (
                  <SelectItem key={org.id} value={org.id || `org-${org.name}`}>
                    {org.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Trade */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Trade</label>
          <Select
            value={filters.trade_id || 'all-trades'}
            onValueChange={(value) => onFiltersChange({ 
              ...filters, 
              trade_id: value === 'all-trades' ? undefined : value 
            })}
          >
            <SelectTrigger>
              <SelectValue placeholder="All Trades" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all-trades">All Trades</SelectItem>
              {Array.isArray(trades) && trades.map((trade) => (
                <SelectItem key={trade.id} value={trade.id || `trade-${trade.name}`}>
                  {trade.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Date Range */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Date Range</label>
          <div className="flex gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "flex-1 justify-start text-left font-normal",
                    !dateFrom && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateFrom ? format(dateFrom, "MMM dd") : "From"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dateFrom}
                  onSelect={handleDateFromChange}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "flex-1 justify-start text-left font-normal",
                    !dateTo && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateTo ? format(dateTo, "MMM dd") : "To"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dateTo}
                  onSelect={handleDateToChange}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>

      {/* Status Filter */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Status</label>
        <div className="flex flex-wrap gap-2">
          {statusOptions.map((status) => {
            const isSelected = filters.status?.includes(status.value);
            return (
              <Badge
                key={status.value}
                variant={isSelected ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => handleStatusToggle(status.value)}
              >
                {status.label}
              </Badge>
            );
          })}
        </div>
      </div>
    </div>
  );
}
