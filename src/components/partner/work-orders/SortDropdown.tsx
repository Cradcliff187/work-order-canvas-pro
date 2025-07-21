
import { ArrowUpDown, Check } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

const sortOptions = [
  { value: 'date-desc', label: 'Newest First' },
  { value: 'date-asc', label: 'Oldest First' },
  { value: 'number-asc', label: 'Work Order # (A-Z)' },
  { value: 'number-desc', label: 'Work Order # (Z-A)' },
  { value: 'title-asc', label: 'Title (A-Z)' },
  { value: 'title-desc', label: 'Title (Z-A)' },
  { value: 'status-asc', label: 'Status (A-Z)' },
];

interface SortDropdownProps {
  value: string;
  onValueChange: (value: string) => void;
}

export function SortDropdown({ value, onValueChange }: SortDropdownProps) {
  const currentOption = sortOptions.find(option => option.value === value);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-9">
          <ArrowUpDown className="h-4 w-4 mr-2" />
          {currentOption?.label || 'Sort'}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {sortOptions.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onClick={() => onValueChange(option.value)}
            className="flex items-center justify-between"
          >
            {option.label}
            {value === option.value && <Check className="h-4 w-4" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
