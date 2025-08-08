import { useState, useEffect } from 'react';
import { VisibilityState } from '@tanstack/react-table';

export interface ColumnMetadata {
  label: string;
  description?: string;
  defaultVisible?: boolean;
}

export interface UseColumnVisibilityProps {
  storageKey: string;
  columnMetadata: Record<string, ColumnMetadata>;
  defaultVisible?: Record<string, boolean>;
}

export function useColumnVisibility({
  storageKey,
  columnMetadata,
  defaultVisible = {}
}: UseColumnVisibilityProps) {
  // Get initial state from localStorage or defaults
  const getInitialState = (): VisibilityState => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Validate that all stored columns exist in metadata
        const validatedState: VisibilityState = {};
        Object.keys(columnMetadata).forEach(columnId => {
          if (parsed.hasOwnProperty(columnId)) {
            validatedState[columnId] = parsed[columnId];
          } else {
            // Use default or metadata default
            validatedState[columnId] = defaultVisible[columnId] ?? columnMetadata[columnId]?.defaultVisible ?? true;
          }
        });
        return validatedState;
      }
    } catch (error) {
      console.warn('Failed to parse column visibility from localStorage:', error);
    }

    // Return defaults if no stored state
    const defaultState: VisibilityState = {};
    Object.keys(columnMetadata).forEach(columnId => {
      defaultState[columnId] = defaultVisible[columnId] ?? columnMetadata[columnId]?.defaultVisible ?? true;
    });
    return defaultState;
  };

  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(getInitialState);

  // Save to localStorage whenever visibility changes
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(columnVisibility));
    } catch (error) {
      console.warn('Failed to save column visibility to localStorage:', error);
    }
  }, [columnVisibility, storageKey]);

  const toggleColumn = (columnId: string) => {
    setColumnVisibility(prev => ({
      ...prev,
      [columnId]: !prev[columnId]
    }));
  };

  const showColumn = (columnId: string) => {
    setColumnVisibility(prev => ({
      ...prev,
      [columnId]: true
    }));
  };

  const hideColumn = (columnId: string) => {
    setColumnVisibility(prev => ({
      ...prev,
      [columnId]: false
    }));
  };

  const resetToDefaults = () => {
    const defaultState: VisibilityState = {};
    Object.keys(columnMetadata).forEach(columnId => {
      defaultState[columnId] = defaultVisible[columnId] ?? columnMetadata[columnId]?.defaultVisible ?? true;
    });
    setColumnVisibility(defaultState);
  };

  const getVisibleColumnCount = () => {
    return Object.values(columnVisibility).filter(Boolean).length;
  };

  const getAllColumns = () => {
    return Object.keys(columnMetadata).map(columnId => ({
      id: columnId,
      label: columnMetadata[columnId].label,
      description: columnMetadata[columnId].description,
      visible: columnVisibility[columnId] ?? true,
      canHide: true // All columns managed by this hook can be hidden
    }));
  };

  return {
    columnVisibility,
    setColumnVisibility,
    toggleColumn,
    showColumn,
    hideColumn,
    resetToDefaults,
    getVisibleColumnCount,
    getAllColumns
  };
}