import { useEffect, useCallback } from 'react';

interface UseTimeManagementKeyboardsProps {
  selectedEntries: string[];
  onSelectAll: () => void;
  onClearSelection: () => void;
  onApproveSelected: () => void;
  onDeleteSelected: () => void;
  onPrint: () => void;
  onExport: () => void;
  disabled?: boolean;
}

export const useTimeManagementKeyboards = ({
  selectedEntries,
  onSelectAll,
  onClearSelection,
  onApproveSelected,
  onDeleteSelected,
  onPrint,
  onExport,
  disabled = false,
}: UseTimeManagementKeyboardsProps) => {
  
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (disabled) return;

    // Prevent shortcuts when user is typing
    const target = event.target as HTMLElement;
    const isTyping = ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) ||
                    target.contentEditable === 'true';

    if (isTyping) return;

    // Handle keyboard shortcuts
    switch (true) {
      // Ctrl/Cmd + A - Select All
      case (event.ctrlKey || event.metaKey) && event.key === 'a':
        event.preventDefault();
        onSelectAll();
        break;

      // Escape - Clear Selection
      case event.key === 'Escape':
        event.preventDefault();
        onClearSelection();
        break;

      // Ctrl/Cmd + Enter - Approve Selected
      case (event.ctrlKey || event.metaKey) && event.key === 'Enter' && selectedEntries.length > 0:
        event.preventDefault();
        onApproveSelected();
        break;

      // Delete - Delete Selected
      case event.key === 'Delete' && selectedEntries.length > 0:
        event.preventDefault();
        onDeleteSelected();
        break;

      // Ctrl/Cmd + P - Print
      case (event.ctrlKey || event.metaKey) && event.key === 'p':
        event.preventDefault();
        onPrint();
        break;

      // Ctrl/Cmd + E - Export
      case (event.ctrlKey || event.metaKey) && event.key === 'e':
        event.preventDefault();
        onExport();
        break;
    }
  }, [
    disabled,
    selectedEntries.length,
    onSelectAll,
    onClearSelection,
    onApproveSelected,
    onDeleteSelected,
    onPrint,
    onExport
  ]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Return keyboard shortcut information for display
  const shortcuts = [
    { key: 'Ctrl+A', description: 'Select all entries', mac: '⌘A' },
    { key: 'Escape', description: 'Clear selection', mac: 'Escape' },
    { key: 'Ctrl+Enter', description: 'Approve selected', mac: '⌘Enter', disabled: selectedEntries.length === 0 },
    { key: 'Delete', description: 'Delete selected', mac: 'Delete', disabled: selectedEntries.length === 0 },
    { key: 'Ctrl+P', description: 'Print report', mac: '⌘P' },
    { key: 'Ctrl+E', description: 'Export to CSV', mac: '⌘E' },
  ];

  return {
    shortcuts,
    isActive: !disabled,
    selectedCount: selectedEntries.length,
  };
};