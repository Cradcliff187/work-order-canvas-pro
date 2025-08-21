import { Search } from 'lucide-react';
import { SearchBarProps } from './types';

export function SearchBar({ searchQuery, onSearchChange }: SearchBarProps) {
  return (
    <div className="relative mb-4">
      <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
      <input
        type="text"
        placeholder="Search by number, title, or assignee..."
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        className="w-full pl-10 pr-4 py-2 border border-input rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
      />
    </div>
  );
}