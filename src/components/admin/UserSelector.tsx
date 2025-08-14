import React, { useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { useDebounce } from '@/hooks/useDebounce';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface UserSelectorProps {
  value?: string;
  onChange: (userId: string | undefined) => void;
  placeholder?: string;
  className?: string;
  labelKey?: 'name' | 'email';
}

interface UserOption {
  id: string;
  first_name?: string;
  last_name?: string;
  email?: string;
}

export function UserSelector({
  value,
  onChange,
  placeholder = 'Select user... ',
  className,
  labelKey = 'name',
}: UserSelectorProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 300);
  const [options, setOptions] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    let isMounted = true;
    async function fetchUsers() {
      setLoading(true);
      try {
        let query = supabase.from('profiles').select('id, first_name, last_name, email').limit(50);
        if (debouncedSearch) {
          const searchTerm = `%${debouncedSearch.trim()}%`;
          query = query.or(`first_name.ilike.${searchTerm},last_name.ilike.${searchTerm},email.ilike.${searchTerm}`);
        }
        const { data, error } = await query;
        if (!isMounted) return;
        if (error) throw error;
        setOptions(data || []);
      } catch (e) {
        // no-op
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    fetchUsers();
    return () => { isMounted = false; };
  }, [debouncedSearch]);

  const selected = options.find((u) => u.id === value);
  const displayText = selected
    ? labelKey === 'email'
      ? selected.email || ''
      : `${selected.first_name || ''} ${selected.last_name || ''}`.trim() || selected.email || ''
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
          <span className={cn(!value && 'text-muted-foreground')}>{displayText}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0 z-50 bg-popover" align="start">
        <Command>
          <CommandInput
            placeholder="Search users..."
            value={searchTerm}
            onValueChange={setSearchTerm}
          />
          <CommandList>
            {loading ? (
              <CommandEmpty>Loading users...</CommandEmpty>
            ) : options.length === 0 ? (
              <CommandEmpty>
                {debouncedSearch ? 'No users found.' : 'Start typing to search users.'}
              </CommandEmpty>
            ) : (
              <CommandGroup>
                {options.map((u) => {
                  const name = `${u.first_name || ''} ${u.last_name || ''}`.trim();
                  const label = labelKey === 'email' ? (u.email || name) : (name || u.email || 'Unknown');
                  return (
                    <CommandItem
                      key={u.id}
                      value={u.id}
                      onSelect={() => {
                        onChange(u.id === value ? undefined : u.id);
                        setOpen(false);
                      }}
                      className="flex items-center justify-between"
                    >
                      <div className="flex flex-col">
                        <span>{label}</span>
                        {u.email && <span className="text-xs text-muted-foreground">{u.email}</span>}
                      </div>
                      <Check className={cn('ml-2 h-4 w-4', value === u.id ? 'opacity-100' : 'opacity-0')} />
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
