import { cn } from '@/lib/utils';

// Responsive column visibility utilities
export const responsiveColumnClasses = {
  // Hide on mobile (< 640px)
  hideMobile: 'hidden sm:table-cell',
  // Hide on tablet and below (< 768px) 
  hideTablet: 'hidden md:table-cell',
  // Hide on desktop and below (< 1024px)
  hideDesktop: 'hidden lg:table-cell',
  // Show only on mobile
  mobileOnly: 'table-cell sm:hidden',
  // Show only on tablet and up
  tabletUp: 'hidden sm:table-cell',
  // Show only on desktop and up
  desktopUp: 'hidden lg:table-cell',
};

// Text truncation utilities for table cells
export const tableCellClasses = {
  // Standard truncation with ellipsis
  truncate: 'truncate max-w-0',
  // Truncate with specific max width
  truncateShort: 'truncate max-w-[150px]',
  truncateMedium: 'truncate max-w-[200px]',
  truncateLong: 'truncate max-w-[300px]',
  // Wrap text for longer content
  wrap: 'whitespace-normal break-words',
  // No wrap for short content
  nowrap: 'whitespace-nowrap',
};

// Helper function to create responsive column classes
export function createResponsiveColumn(options: {
  hideOn?: 'mobile' | 'tablet' | 'desktop';
  showOn?: 'mobile' | 'tablet' | 'desktop';
  truncate?: 'short' | 'medium' | 'long' | boolean;
  className?: string;
}) {
  const { hideOn, showOn, truncate, className } = options;
  
  let classes = '';
  
  // Visibility classes
  if (hideOn === 'mobile') classes += responsiveColumnClasses.hideMobile + ' ';
  if (hideOn === 'tablet') classes += responsiveColumnClasses.hideTablet + ' ';
  if (hideOn === 'desktop') classes += responsiveColumnClasses.hideDesktop + ' ';
  
  if (showOn === 'mobile') classes += responsiveColumnClasses.mobileOnly + ' ';
  if (showOn === 'tablet') classes += responsiveColumnClasses.tabletUp + ' ';
  if (showOn === 'desktop') classes += responsiveColumnClasses.desktopUp + ' ';
  
  // Truncation classes
  if (truncate === 'short') classes += tableCellClasses.truncateShort + ' ';
  if (truncate === 'medium') classes += tableCellClasses.truncateMedium + ' ';
  if (truncate === 'long') classes += tableCellClasses.truncateLong + ' ';
  if (truncate === true) classes += tableCellClasses.truncate + ' ';
  
  return cn(classes.trim(), className);
}

// Predefined responsive column configurations
export const responsiveColumns = {
  // Primary columns - always visible with truncation
  primary: createResponsiveColumn({ truncate: 'medium' }),
  // Secondary columns - hide on mobile
  secondary: createResponsiveColumn({ hideOn: 'mobile', truncate: 'short' }),
  // Tertiary columns - hide on tablet and below
  tertiary: createResponsiveColumn({ hideOn: 'tablet', truncate: 'short' }),
  // Optional columns - hide on desktop and below
  optional: createResponsiveColumn({ hideOn: 'desktop' }),
  // Actions column - always visible, no truncation
  actions: 'whitespace-nowrap',
};