import React, { createContext, useContext, useState, useCallback } from 'react';

interface ClockWidgetContextType {
  openClockWidget: () => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const ClockWidgetContext = createContext<ClockWidgetContextType | undefined>(undefined);

export const useClockWidget = () => {
  const context = useContext(ClockWidgetContext);
  if (!context) {
    throw new Error('useClockWidget must be used within a ClockWidgetProvider');
  }
  return context;
};

interface ClockWidgetProviderProps {
  children: React.ReactNode;
}

export const ClockWidgetProvider: React.FC<ClockWidgetProviderProps> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);

  const openClockWidget = useCallback(() => {
    setIsOpen(true);
  }, []);

  const value: ClockWidgetContextType = {
    openClockWidget,
    isOpen,
    setIsOpen,
  };

  return (
    <ClockWidgetContext.Provider value={value}>
      {children}
    </ClockWidgetContext.Provider>
  );
};