import { useEffect } from 'react';

interface UseGlobalKeyboardShortcutsProps {
  onSearchFocus?: () => void;
  onEscape?: () => void;
  disabled?: boolean;
}

export const useGlobalKeyboardShortcuts = ({
  onSearchFocus,
  onEscape,
  disabled = false,
}: UseGlobalKeyboardShortcutsProps) => {
  useEffect(() => {
    if (disabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Prevent shortcuts when user is typing in inputs
      const target = event.target as HTMLElement;
      const isTyping = ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) ||
                      target.contentEditable === 'true';

      // Handle Cmd/Ctrl + K for search focus
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        if (!isTyping && onSearchFocus) {
          event.preventDefault();
          event.stopPropagation();
          onSearchFocus();
        }
        return;
      }

      // Handle Escape key
      if (event.key === 'Escape') {
        if (onEscape) {
          onEscape();
        }
        return;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onSearchFocus, onEscape, disabled]);
};