import { Archive } from 'lucide-react';
import { useMemo, useCallback } from 'react';
import { SearchBar } from '../clock/SearchBar';
import { WorkSelector } from '../clock/WorkSelector';
import { useWorkItemSearch, WorkItemSearchOptions } from '@/hooks/useWorkItemSearch';
import type { ClockOption } from '../clock/types';

interface WorkItemListProps {
  /** Filtering options for work items */
  searchOptions?: WorkItemSearchOptions;
  /** Selected work item */
  selectedOption?: ClockOption | null;
  /** Handler for when a work item is selected */
  onOptionSelect?: (option: ClockOption | null) => void;
  /** Show search bar */
  showSearch?: boolean;
  /** Custom placeholder for search */
  searchPlaceholder?: string;
  /** Show empty state when no results */
  showEmptyState?: boolean;
  /** Custom empty state message */
  emptyStateMessage?: string;
  /** Loading state */
  isLoading?: boolean;
  /** External search query control */
  externalSearchQuery?: string;
  /** External search change handler */
  onExternalSearchChange?: (query: string) => void;
}

/**
 * Reusable WorkItemList component with integrated search and filtering
 * Uses useWorkItemSearch hook for centralized search logic
 */
export function WorkItemList({
  searchOptions = {},
  selectedOption: externalSelectedOption,
  onOptionSelect,
  showSearch = true,
  searchPlaceholder = "Search by number, title, or assignee...",
  showEmptyState = true,
  emptyStateMessage = "No work items found matching your search.",
  isLoading = false,
  externalSearchQuery,
  onExternalSearchChange,
}: WorkItemListProps) {
  const {
    searchQuery,
    setSearchQuery,
    selectedOption: internalSelectedOption,
    setSelectedOption: setInternalSelectedOption,
    filteredOptions,
    hasResults,
    isSearching,
  } = useWorkItemSearch(searchOptions);

  // Memoize derived state to prevent unnecessary re-renders
  const currentSelectedOption = useMemo(() => 
    externalSelectedOption !== undefined ? externalSelectedOption : internalSelectedOption,
    [externalSelectedOption, internalSelectedOption]
  );
  
  const currentSearchQuery = useMemo(() => 
    externalSearchQuery !== undefined ? externalSearchQuery : searchQuery,
    [externalSearchQuery, searchQuery]
  );
  
  // Memoize handlers to prevent child re-renders
  const handleOptionSelect = useCallback((option: ClockOption) => {
    if (onOptionSelect) {
      onOptionSelect(option);
    } else if (externalSelectedOption === undefined) {
      // Only use internal state if no external state is provided
      setInternalSelectedOption(option);
    }
  }, [onOptionSelect, externalSelectedOption, setInternalSelectedOption]);

  const handleSearchChange = useCallback((query: string) => {
    if (onExternalSearchChange) {
      onExternalSearchChange(query);
    } else {
      setSearchQuery(query);
    }
  }, [onExternalSearchChange, setSearchQuery]);

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-4">
        {showSearch && (
          <div className="relative mb-4">
            <div className="w-full h-10 bg-muted/50 rounded-lg animate-pulse" />
          </div>
        )}
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 bg-muted/50 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      {showSearch && (
        <SearchBar 
          searchQuery={currentSearchQuery}
          onSearchChange={handleSearchChange}
        />
      )}
      
      <div className="flex-1 overflow-y-auto">
        {!hasResults && showEmptyState && currentSearchQuery.trim() ? (
          <div className="text-center py-8 text-muted-foreground">
            <Archive className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>{emptyStateMessage}</p>
          </div>
        ) : (
          <WorkSelector
            options={filteredOptions}
            selectedOption={currentSelectedOption}
            onOptionSelect={handleOptionSelect}
          />
        )}
      </div>
      
      {/* Show searching indicator */}
      {isSearching && showSearch && (
        <div className="text-xs text-muted-foreground text-center py-2">
          Searching...
        </div>
      )}
    </div>
  );
}