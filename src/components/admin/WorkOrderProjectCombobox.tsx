import React, { useState } from 'react';
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
import { useWorkOrderProjectSearch } from '@/hooks/useWorkOrderProjectSearch';

interface WorkOrderProjectComboboxProps {
  value?: string;
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
  const { items, loading } = useWorkOrderProjectSearch(searchTerm);

  // Group items by type
  const groupedItems = React.useMemo(() => {
    const workOrders = items.filter(item => item.type === 'work_order');
    const projects = items.filter(item => item.type === 'project');
    
    return { workOrders, projects };
  }, [items]);

  const selectedItem = items.find(item => item.id === value);

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
      <PopoverContent className="w-full p-0 z-50" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search work orders and projects..."
            value={searchTerm}
            onValueChange={setSearchTerm}
          />
          <CommandList className="max-h-64 overflow-auto">
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
                        value={item.id}
                        onSelect={() => {
                          onChange(item.id === value ? '' : item.id);
                          setOpen(false);
                        }}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2 flex-1">
                          <Building className="h-4 w-4 text-muted-foreground" />
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-sm font-medium">{item.number}</span>
                              {item.status && (
                                <Badge 
                                  variant="outline" 
                                  className={cn("text-xs", getStatusColor(item.status))}
                                >
                                  {item.status.replace('_', ' ')}
                                </Badge>
                              )}
                            </div>
                            <span className="text-sm text-muted-foreground truncate">{item.title}</span>
                          </div>
                        </div>
                        <Check className={cn('ml-2 h-4 w-4', value === item.id ? 'opacity-100' : 'opacity-0')} />
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
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2 flex-1">
                          <Briefcase className="h-4 w-4 text-muted-foreground" />
                          <div className="flex flex-col">
                            <span className="font-mono text-sm font-medium">{item.number}</span>
                            <span className="text-sm text-muted-foreground truncate">{item.title}</span>
                          </div>
                        </div>
                        <Check className={cn('ml-2 h-4 w-4', value === item.id ? 'opacity-100' : 'opacity-0')} />
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