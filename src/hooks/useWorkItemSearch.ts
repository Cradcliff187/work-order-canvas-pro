import { useState, useMemo } from 'react';
import { useDebounce } from './useDebounce';
import { useClockOptions } from './useClockOptions';
import type { ClockOption } from '@/components/employee/clock/types';

export interface WorkItemSearchOptions {
  section?: 'today' | 'assigned' | 'recent' | 'available';
  type?: 'work_order' | 'project';
  assignedToMe?: boolean;
}

export interface WorkItemSearchResult {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedOption: ClockOption | null;
  setSelectedOption: (option: ClockOption | null) => void;
  filteredOptions: ClockOption[];
  originalOptions: ClockOption[];
  clearSearch: () => void;
  resetSelection: () => void;
  hasResults: boolean;
  isSearching: boolean;
}

/**
 * Custom hook for managing work item search and filtering
 * Provides centralized search logic with debouncing and smart filtering
 */
export const useWorkItemSearch = (
  options: WorkItemSearchOptions = {},
  debounceMs: number = 300
): WorkItemSearchResult => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOption, setSelectedOption] = useState<ClockOption | null>(null);
  
  // Get all work items from useClockOptions
  const allOptions = useClockOptions();
  
  // Debounce search query for performance
  const debouncedSearchQuery = useDebounce(searchQuery, debounceMs);
  
  // Apply initial filtering based on options
  const baseFilteredOptions = useMemo(() => {
    let filtered = allOptions;
    
    // Filter by section
    if (options.section) {
      filtered = filtered.filter(option => option.section === options.section);
    }
    
    // Filter by type
    if (options.type) {
      filtered = filtered.filter(option => option.type === options.type);
    }
    
    // Filter by assignment
    if (options.assignedToMe !== undefined) {
      if (options.assignedToMe) {
        filtered = filtered.filter(option => option.section === 'assigned' || option.section === 'today');
      } else {
        filtered = filtered.filter(option => option.section !== 'assigned');
      }
    }
    
    return filtered;
  }, [allOptions, options.section, options.type, options.assignedToMe]);
  
  // Apply search filtering
  const filteredOptions = useMemo(() => {
    if (!debouncedSearchQuery.trim()) {
      return baseFilteredOptions;
    }
    
    const query = debouncedSearchQuery.toLowerCase();
    return baseFilteredOptions.filter(option => 
      option.number.toLowerCase().includes(query) ||
      option.title.toLowerCase().includes(query) ||
      option.assigneeName?.toLowerCase().includes(query)
    );
  }, [baseFilteredOptions, debouncedSearchQuery]);
  
  // Helper functions
  const clearSearch = () => {
    setSearchQuery('');
  };
  
  const resetSelection = () => {
    setSelectedOption(null);
  };
  
  // Computed properties
  const hasResults = filteredOptions.length > 0;
  const isSearching = searchQuery !== debouncedSearchQuery;
  
  return {
    searchQuery,
    setSearchQuery,
    selectedOption,
    setSelectedOption,
    filteredOptions,
    originalOptions: allOptions,
    clearSearch,
    resetSelection,
    hasResults,
    isSearching,
  };
};