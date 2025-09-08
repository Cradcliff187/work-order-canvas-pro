/**
 * Mobile card utilities for touch-friendly interactions and optimized display
 */

/**
 * Minimum touch target size for mobile accessibility (44px recommended)
 */
export const MOBILE_TOUCH_TARGET_SIZE = 44;

/**
 * Mobile-optimized spacing constants
 */
export const MOBILE_SPACING = {
  xs: '0.25rem', // 4px
  sm: '0.5rem',  // 8px
  md: '0.75rem', // 12px
  lg: '1rem',    // 16px
  xl: '1.5rem',  // 24px
} as const;

/**
 * Truncates text for mobile display with appropriate length limits
 */
export const truncateForMobile = (text: string, maxLength: number = 20): string => {
  if (text.length <= maxLength) return text;
  return `${text.substring(0, maxLength - 3)}...`;
};

/**
 * Creates mobile-friendly abbreviated labels for work item types
 */
export const getMobileTypeLabel = (type: 'work_order' | 'project'): string => {
  return type === 'work_order' ? 'WO' : 'PRJ';
};

/**
 * Creates full desktop labels for work item types
 */
export const getDesktopTypeLabel = (type: 'work_order' | 'project'): string => {
  return type === 'work_order' ? 'WORK ORDER' : 'PROJECT';
};

/**
 * Determines if a button should show text or icon based on mobile context
 */
export const getMobileButtonContent = (fullText: string, iconOnly: string) => {
  return { mobile: iconOnly, desktop: fullText };
};

/**
 * Mobile-optimized class names for cards
 */
export const getMobileCardClasses = () => ({
  container: "relative w-full border transition-all duration-200 hover:shadow-lg hover:shadow-primary/5 rounded-xl bg-card text-card-foreground shadow-sm hover:shadow-md hover:border-primary/20",
  content: "p-3",
  flexContainer: "flex items-center justify-between gap-2",
  badges: "flex items-center gap-1 shrink-0",
  workDetails: "min-w-0 flex-1",
  actions: "flex items-center shrink-0",
  touchTarget: `min-w-[${MOBILE_TOUCH_TARGET_SIZE}px] min-h-[${MOBILE_TOUCH_TARGET_SIZE}px]`
});

/**
 * Desktop-optimized class names for cards
 */
export const getDesktopCardClasses = () => ({
  container: "relative w-full border transition-all duration-200 hover:shadow-lg hover:shadow-primary/5 rounded-xl bg-card text-card-foreground shadow-sm hover:shadow-md hover:border-primary/20",
  content: "p-3",
  flexContainer: "flex items-center justify-between gap-2",
  badges: "flex items-center gap-1 shrink-0",
  workDetails: "min-w-0 flex-1",
  metrics: "flex items-center gap-2 mt-1 text-[10px] text-muted-foreground",
  actions: "flex items-center gap-1 shrink-0"
});