import React, { useState } from 'react';
import { Check, ChevronsUpDown, Search, Building, Briefcase } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { useDebounce } from '@/hooks/useDebounce';

export interface WorkOrderProjectItem {
  id: string;
  type: 'work_order' | 'project';
  number: string;
  title: string;
  location?: string;
  organization_name?: string;
  organization_initials?: string;
  status?: string;
}

interface WorkOrderProjectComboboxProps {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  items: WorkOrderProjectItem[];
  loading?: boolean;
  disabled?: boolean;
}

export function WorkOrderProjectCombobox({
  value,
  onChange,
  placeholder = "Search work orders and projects...",
  items = [],
  loading = false,
  disabled = false,
}: WorkOrderProjectComboboxProps) {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const debouncedSearch = useDebounce(searchValue, 300);

  // Filter items based on search
  const filteredItems = React.useMemo(() => {
    if (!debouncedSearch) return items;
    
    const search = debouncedSearch.toLowerCase();
    return items.filter(item => 
      item.number.toLowerCase().includes(search) ||
      item.title.toLowerCase().includes(search) ||
      item.location?.toLowerCase().includes(search) ||
      item.organization_name?.toLowerCase().includes(search)
    );
  }, [items, debouncedSearch]);

  // Group items by type
  const groupedItems = React.useMemo(() => {
    const workOrders = filteredItems.filter(item => item.type === 'work_order');
    const projects = filteredItems.filter(item => item.type === 'project');
    
    return { workOrders, projects };
  }, [filteredItems]);

  const selectedItem = items.find(item => item.id === value);

  const formatItemDisplay = (item: WorkOrderProjectItem) => {
    const parts = [item.number];
    if (item.title) parts.push(item.title);
    if (item.location) parts.push(`at ${item.location}`);
    if (item.organization_name) parts.push(`(${item.organization_name})`);
    
    return parts.join(' — ');
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'assigned':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'received':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
      default:
        return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400';
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between h-auto min-h-[2.5rem] px-3 py-2"
          disabled={disabled || loading}
        >
          <div className="flex items-center gap-2 flex-1 text-left">
            {loading ? (
              <span className="text-muted-foreground">Loading...</span>
            ) : selectedItem ? (
              <div className="flex items-center gap-2 flex-1">
                <div className="flex items-center gap-1.5">
                  {selectedItem.type === 'work_order' ? (
                    <Building className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Briefcase className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className="font-mono text-sm">{selectedItem.number}</span>
                </div>
                <span className="truncate">{selectedItem.title}</span>
                {selectedItem.status && (
                  <Badge 
                    variant="secondary" 
                    className={cn("text-xs", getStatusColor(selectedItem.status))}
                  >
                    {selectedItem.status.replace('_', ' ')}
                  </Badge>
                )}
              </div>
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0 z-50" align="start">
        <Command shouldFilter={false}>
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <CommandInput
              placeholder="Search work orders and projects..."
              value={searchValue}
              onValueChange={setSearchValue}
              className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
          <CommandList className="max-h-64 overflow-auto">
            {loading ? (
              <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
                Loading...
              </div>
            ) : filteredItems.length === 0 ? (
              <CommandEmpty>
                {searchValue ? "No items found matching your search." : "No work orders or projects available."}
              </CommandEmpty>
            ) : (
              <>
                {groupedItems.workOrders.length > 0 && (
                  <CommandGroup heading="Work Orders">
                    {groupedItems.workOrders.map((item) => (
                      <CommandItem
                        key={item.id}
                        value={item.id}
                        onSelect={() => {
                          onChange(item.id === value ? '' : item.id);
                          setOpen(false);
                        }}
                        className="flex items-center gap-2 px-2 py-2"
                      >
                        <div className="flex items-center gap-2 flex-1">
                          <Building className="h-4 w-4 text-muted-foreground" />
                          <div className="flex items-center gap-2 flex-1">
                            <span className="font-mono text-sm font-medium">{item.number}</span>
                            <span className="truncate">{item.title}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {item.status && (
                            <Badge 
                              variant="secondary" 
                              className={cn("text-xs", getStatusColor(item.status))}
                            >
                              {item.status.replace('_', ' ')}
                            </Badge>
                          )}
                          {item.organization_initials && (
                            <Badge variant="outline" className="text-xs">
                              {item.organization_initials}
                            </Badge>
                          )}
                          <Check
                            className={cn(
                              "h-4 w-4",
                              value === item.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}

                {groupedItems.projects.length > 0 && (
                  <CommandGroup heading="Projects">
                    {groupedItems.projects.map((item) => (
                      <CommandItem
                        key={item.id}
                        value={item.id}
                        onSelect={() => {
                          onChange(item.id === value ? '' : item.id);
                          setOpen(false);
                        }}
                        className="flex items-center gap-2 px-2 py-2"
                      >
                        <div className="flex items-center gap-2 flex-1">
                          <Briefcase className="h-4 w-4 text-muted-foreground" />
                          <div className="flex items-center gap-2 flex-1">
                            <span className="font-mono text-sm font-medium">{item.number}</span>
                            <span className="truncate">{item.title}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {item.organization_initials && (
                            <Badge variant="outline" className="text-xs">
                              {item.organization_initials}
                            </Badge>
                          )}
                          <Check
                            className={cn(
                              "h-4 w-4 opacity-0",
                              value === item.id && "opacity-100"
                            )}
                          />
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}