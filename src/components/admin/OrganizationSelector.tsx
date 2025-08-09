import React, { useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';
import { useOrganizations } from '@/hooks/useOrganizations';
import { useDebounce } from '@/hooks/useDebounce';
import { cn } from '@/lib/utils';

interface OrganizationSelectorProps {
  value?: string;
  onChange: (organizationId: string | undefined) => void;
  organizationType?: 'partner' | 'subcontractor' | 'internal';
  placeholder?: string;
  className?: string;
}

export function OrganizationSelector({
  value,
  onChange,
  organizationType,
  placeholder = "Select organization...",
  className
}: OrganizationSelectorProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 300);

  const { data: organizations, isLoading, error } = useOrganizations();

  // Filter organizations by type and search term
  const filteredOrganizations = React.useMemo(() => {
    if (!organizations) return [];

    let filtered = organizations;

    // Filter by organization type if specified
    if (organizationType) {
      filtered = filtered.filter(org => org.organization_type === organizationType);
    }

    // Filter by search term
    if (debouncedSearch) {
      filtered = filtered.filter(org => 
        org.name.toLowerCase().includes(debouncedSearch.toLowerCase())
      );
    }

    // Sort alphabetically by name
    return filtered.sort((a, b) => a.name.localeCompare(b.name));
  }, [organizations, organizationType, debouncedSearch]);

  const selectedOrganization = organizations?.find(org => org.id === value);

  const handleSelect = (organizationId: string) => {
    if (organizationId === value) {
      onChange(undefined);
    } else {
      onChange(organizationId);
    }
    setOpen(false);
  };

  const getOrganizationTypeDisplay = (type: string) => {
    switch (type) {
      case 'partner':
        return 'Partner';
      case 'subcontractor':
        return 'Subcontractor';
      case 'internal':
        return 'Internal';
      default:
        return type;
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("justify-between", className)}
        >
          {selectedOrganization ? (
            <div className="flex items-center gap-2">
              <span>{selectedOrganization.name}</span>
              <Badge variant="secondary" className="text-xs">
                {getOrganizationTypeDisplay(selectedOrganization.organization_type)}
              </Badge>
            </div>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput 
            placeholder="Search organizations..." 
            value={searchTerm}
            onValueChange={setSearchTerm}
          />
          <CommandList>
            {isLoading ? (
              <CommandEmpty>Loading organizations...</CommandEmpty>
            ) : error ? (
              <CommandEmpty>We couldn't load organizations. Please try again.</CommandEmpty>
            ) : filteredOrganizations.length === 0 ? (
              <CommandEmpty>
                {debouncedSearch ? "No organizations found." : "No organizations available."}
              </CommandEmpty>
            ) : (
              <CommandGroup>
                {filteredOrganizations.map((organization) => (
                  <CommandItem
                    key={organization.id}
                    value={organization.id}
                    onSelect={() => handleSelect(organization.id)}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <span>{organization.name}</span>
                      <Badge variant="secondary" className="text-xs">
                        {getOrganizationTypeDisplay(organization.organization_type)}
                      </Badge>
                    </div>
                    <Check
                      className={cn(
                        "ml-auto h-4 w-4",
                        value === organization.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}