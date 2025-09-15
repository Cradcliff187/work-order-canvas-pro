import React, { useState, useEffect } from 'react';
import { Check, ChevronsUpDown, Building, Briefcase } from 'lucide-react';
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
import { useWorkOrderProjectSearch, fetchItemById, WorkOrderProjectItem } from '@/hooks/useWorkOrderProjectSearch';

interface WorkOrderProjectComboboxProps {
  value?: string; // Format: "wo:uuid" or "proj:uuid"
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function WorkOrderProjectCombobox({
  value,
  onChange,
  placeholder = "Search work orders and projects...",
  disabled = false,
}: WorkOrderProjectComboboxProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItem, setSelectedItem] = useState<WorkOrderProjectItem | null>(null);
  const { items, loading } = useWorkOrderProjectSearch(searchTerm);

  // Parse the value to get ID and type
  const parseValue = (val?: string) => {
    if (!val) return null;
    if (val.startsWith('wo:')) return { id: val.slice(3), type: 'work_order' as const };
    if (val.startsWith('proj:')) return { id: val.slice(5), type: 'project' as const };
    return null;
  };

  const formatValue = (item: WorkOrderProjectItem) => {
    return item.type === 'work_order' ? `wo:${item.id}` : `proj:${item.id}`;
  };

  // Load selected item if not in current search results
  useEffect(() => {
    const parsedValue = parseValue(value);
    if (parsedValue && !items.find(item => item.id === parsedValue.id)) {
      fetchItemById(parsedValue.id, parsedValue.type).then(item => {
        if (item) setSelectedItem(item);
      });
    } else if (parsedValue) {
      const foundItem = items.find(item => item.id === parsedValue.id);
      setSelectedItem(foundItem || null);
    } else {
      setSelectedItem(null);
    }
  }, [value, items]);

  // Group items by type
  const groupedItems = React.useMemo(() => {
    const workOrders = items.filter(item => item.type === 'work_order');
    const projects = items.filter(item => item.type === 'project');
    
    return { workOrders, projects };
  }, [items]);

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'completed':
        return 'bg-success/10 text-success border-success/20';
      case 'in_progress':
        return 'bg-primary/10 text-primary border-primary/20';
      case 'assigned':
        return 'bg-warning/10 text-warning border-warning/20';
      case 'received':
        return 'bg-muted/50 text-muted-foreground border-border';
      default:
        return 'bg-muted/50 text-muted-foreground border-border';
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={disabled || loading}
        >
          <div className="flex items-center gap-2 flex-1 text-left">
            {selectedItem ? (
              <>
                {selectedItem.type === 'work_order' ? (
                  <Building className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Briefcase className="h-4 w-4 text-muted-foreground" />
                )}
                <span className="font-mono text-sm">{selectedItem.number}</span>
                <span className="truncate">{selectedItem.title}</span>
              </>
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-[var(--radix-popover-trigger-width)] min-w-[var(--radix-popover-trigger-width)] p-0 z-50 bg-popover pointer-events-auto" 
        align="start"
      >
        <Command shouldFilter={false}>
          <div className="sticky top-0 z-10 bg-popover border-b">
            <CommandInput
              placeholder="Search work orders and projects..."
              value={searchTerm}
              onValueChange={setSearchTerm}
              className="border-0"
            />
          </div>
          <CommandList className="max-h-72 overflow-y-auto">
            {loading ? (
              <CommandEmpty>Loading...</CommandEmpty>
            ) : items.length === 0 ? (
              <CommandEmpty>
                {searchTerm ? "No items found." : "Start typing to search..."}
              </CommandEmpty>
            ) : (
              <>
                {groupedItems.workOrders.length > 0 && (
                  <CommandGroup heading="Work Orders">
                    {groupedItems.workOrders.map((item) => (
                      <CommandItem
                        key={item.id}
                        value={formatValue(item)}
                        onSelect={() => {
                          const newValue = formatValue(item);
                          onChange(value === newValue ? '' : newValue);
                          setOpen(false);
                        }}
                        className="flex items-center justify-between p-3 hover:bg-accent/50"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <Building className="h-4 w-4 text-muted-foreground shrink-0" />
                          <div className="flex flex-col min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-sm font-medium">{item.number}</span>
                              {item.status && (
                                <Badge 
                                  variant="outline" 
                                  className={cn("text-xs shrink-0", getStatusColor(item.status))}
                                >
                                  {item.status.replace('_', ' ')}
                                </Badge>
                              )}
                            </div>
                            <span className="text-sm text-muted-foreground truncate">{item.title}</span>
                          </div>
                        </div>
                        <Check 
                          className={cn(
                            'ml-2 h-4 w-4 shrink-0', 
                            value === formatValue(item) ? 'opacity-100' : 'opacity-0'
                          )} 
                        />
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}

                {groupedItems.projects.length > 0 && (
                  <CommandGroup heading="Projects">
                    {groupedItems.projects.map((item) => (
                      <CommandItem
                        key={item.id}
                        value={formatValue(item)}
                        onSelect={() => {
                          const newValue = formatValue(item);
                          onChange(value === newValue ? '' : newValue);
                          setOpen(false);
                        }}
                        className="flex items-center justify-between p-3 hover:bg-accent/50"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <Briefcase className="h-4 w-4 text-muted-foreground shrink-0" />
                          <div className="flex flex-col min-w-0 flex-1">
                            <span className="font-mono text-sm font-medium">{item.number}</span>
                            <span className="text-sm text-muted-foreground truncate">{item.title}</span>
                          </div>
                        </div>
                        <Check 
                          className={cn(
                            'ml-2 h-4 w-4 shrink-0', 
                            value === formatValue(item) ? 'opacity-100' : 'opacity-0'
                          )} 
                        />
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