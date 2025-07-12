import { useEffect } from 'react';

interface UseKeyboardNavigationProps {
  isOpen: boolean;
  onEscape?: () => void;
  onEnter?: () => void;
  onArrowUp?: () => void;
  onArrowDown?: () => void;
  onArrowLeft?: () => void;
  onArrowRight?: () => void;
  disabled?: boolean;
}

export const useKeyboardNavigation = ({
  isOpen,
  onEscape,
  onEnter,
  onArrowUp,
  onArrowDown,
  onArrowLeft,
  onArrowRight,
  disabled = false,
}: UseKeyboardNavigationProps) => {
  useEffect(() => {
    if (!isOpen || disabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.key) {
        case 'Escape':
          event.preventDefault();
          onEscape?.();
          break;
        case 'Enter':
          if (onEnter && event.target instanceof HTMLElement && 
              !['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName)) {
            event.preventDefault();
            onEnter();
          }
          break;
        case 'ArrowUp':
          if (onArrowUp) {
            event.preventDefault();
            onArrowUp();
          }
          break;
        case 'ArrowDown':
          if (onArrowDown) {
            event.preventDefault();
            onArrowDown();
          }
          break;
        case 'ArrowLeft':
          if (onArrowLeft) {
            event.preventDefault();
            onArrowLeft();
          }
          break;
        case 'ArrowRight':
          if (onArrowRight) {
            event.preventDefault();
            onArrowRight();
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, disabled, onEscape, onEnter, onArrowUp, onArrowDown, onArrowLeft, onArrowRight]);
};