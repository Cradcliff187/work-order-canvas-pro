import React, { useState } from 'react';
import { Check, ChevronsUpDown, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { useDebounce } from '@/hooks/useDebounce';
import { cn } from '@/lib/utils';

interface Employee {
  id: string;
  first_name?: string;
  last_name?: string;
  email?: string;
}

interface EmployeeComboboxProps {
  value?: string;
  onChange: (employeeId: string | undefined) => void;
  placeholder?: string;
  className?: string;
  employees: Employee[];
  loading?: boolean;
}

export function EmployeeCombobox({
  value,
  onChange,
  placeholder = 'Select employee...',
  className,
  employees,
  loading = false,
}: EmployeeComboboxProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 300);

  // Filter employees based on search term
  const filteredEmployees = React.useMemo(() => {
    if (!debouncedSearch) return employees;
    
    const searchLower = debouncedSearch.toLowerCase();
    return employees.filter(employee => {
      const fullName = `${employee.first_name || ''} ${employee.last_name || ''}`.trim().toLowerCase();
      const email = (employee.email || '').toLowerCase();
      return fullName.includes(searchLower) || email.includes(searchLower);
    });
  }, [employees, debouncedSearch]);

  const selected = employees.find((emp) => emp.id === value);
  const displayText = selected
    ? `${selected.first_name || ''} ${selected.last_name || ''}`.trim() || selected.email || 'Unknown'
    : placeholder;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn('justify-between', className)}
        >
          <span className={cn('flex items-center', !value && 'text-muted-foreground')}>
            <User className="h-4 w-4 mr-2" />
            {displayText}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0 z-50 bg-popover" align="start">
        <Command>
          <CommandInput
            placeholder="Search employees..."
            value={searchTerm}
            onValueChange={setSearchTerm}
          />
          <CommandList className="max-h-64">
            {loading ? (
              <CommandEmpty>Loading employees...</CommandEmpty>
            ) : (
              <>
                <CommandGroup>
                  <CommandItem
                    value="__none__"
                    onSelect={() => {
                      onChange(undefined);
                      setOpen(false);
                    }}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center">
                      <User className="h-4 w-4 mr-2 opacity-50" />
                      <span className="text-muted-foreground">No specific employee</span>
                    </div>
                    <Check className={cn('ml-2 h-4 w-4', !value ? 'opacity-100' : 'opacity-0')} />
                  </CommandItem>
                </CommandGroup>
                
                {filteredEmployees.length === 0 && debouncedSearch ? (
                  <CommandEmpty>No employees found.</CommandEmpty>
                ) : (
                  <CommandGroup>
                    {filteredEmployees.map((employee) => {
                      const name = `${employee.first_name || ''} ${employee.last_name || ''}`.trim();
                      const displayName = name || employee.email || 'Unknown';
                      return (
                        <CommandItem
                          key={employee.id}
                          value={employee.id}
                          onSelect={() => {
                            onChange(employee.id === value ? undefined : employee.id);
                            setOpen(false);
                          }}
                          className="flex items-center justify-between"
                        >
                          <div className="flex flex-col">
                            <span>{displayName}</span>
                            {employee.email && name && (
                              <span className="text-xs text-muted-foreground">{employee.email}</span>
                            )}
                          </div>
                          <Check className={cn('ml-2 h-4 w-4', value === employee.id ? 'opacity-100' : 'opacity-0')} />
                        </CommandItem>
                      );
                    })}
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