import React, { useRef, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface ResponsiveTableWrapperProps {
  children: React.ReactNode;
  className?: string;
  stickyFirstColumn?: boolean;
  minWidth?: string;
}

export function ResponsiveTableWrapper({ 
  children, 
  className,
  stickyFirstColumn = false,
  minWidth = '800px'
}: ResponsiveTableWrapperProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeftShadow, setShowLeftShadow] = useState(false);
  const [showRightShadow, setShowRightShadow] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile viewport - but don't render on mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Don't render responsive table wrapper on mobile - should use cards instead
  if (isMobile) {
    return <div className="w-full">{children}</div>;
  }

  const handleScroll = () => {
    const element = scrollRef.current;
    if (!element) return;

    const { scrollLeft, scrollWidth, clientWidth } = element;
    setShowLeftShadow(scrollLeft > 0);
    setShowRightShadow(scrollLeft < scrollWidth - clientWidth - 1);
  };

  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;

    // Initial check
    handleScroll();

    element.addEventListener('scroll', handleScroll);
    return () => element.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className={cn("relative overflow-hidden rounded-lg border", className)}>
      {/* Left shadow */}
      <div
        className={cn(
          "absolute left-0 top-0 bottom-0 w-4 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none transition-opacity duration-200",
          showLeftShadow ? "opacity-100" : "opacity-0"
        )}
      />
      
      {/* Right shadow */}
      <div
        className={cn(
          "absolute right-0 top-0 bottom-0 w-4 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none transition-opacity duration-200",
          showRightShadow ? "opacity-100" : "opacity-0"
        )}
      />

      {/* Scrollable content */}
      <div
        ref={scrollRef}
        className="overflow-x-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-border"
        style={{ minWidth: isMobile ? 'auto' : minWidth }}
      >
        <div 
          className={cn(
            "min-w-full",
            stickyFirstColumn && "[&_table_thead_tr_th:first-child]:sticky [&_table_thead_tr_th:first-child]:left-0 [&_table_thead_tr_th:first-child]:bg-background [&_table_thead_tr_th:first-child]:z-20",
            stickyFirstColumn && "[&_table_tbody_tr_td:first-child]:sticky [&_table_tbody_tr_td:first-child]:left-0 [&_table_tbody_tr_td:first-child]:bg-background [&_table_tbody_tr_td:first-child]:z-10"
          )}
        >
          {children}
        </div>
      </div>
    </div>
  );
}