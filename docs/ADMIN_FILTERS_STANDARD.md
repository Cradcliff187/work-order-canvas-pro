# Admin Filter Standardization

## Overview
All admin pages now use the enhanced `AdminFilterBar` component for consistent filter UX across desktop and mobile experiences.

## Standard Implementation

### Enhanced AdminFilterBar Features
- **Mobile-optimized**: Sheet component with configurable side position
- **Search persistence**: Search always visible on mobile, integrated on desktop
- **Section grouping**: Essential vs Advanced filter organization
- **Filter counting**: Automatic active filter count display
- **Consistent clearing**: Unified clear all functionality

### Usage Pattern

```tsx
import { AdminFilterBar } from '@/components/admin/shared/AdminFilterBar';
import { SmartSearchInput } from '@/components/ui/smart-search-input';
import { MultiSelectFilter } from '@/components/ui/multi-select-filter';

const searchSlot = (
  <SmartSearchInput
    placeholder="Search..."
    value={searchTerm}
    onChange={(e) => onSearchChange(e.target.value)}
    onSearchSubmit={onSearchChange}
    storageKey="admin-[page]-search"
    aria-label="Search [items]"
    className="w-full"
  />
);

<AdminFilterBar
  title="Filters"
  filterCount={activeFilterCount}
  onClear={onClearFilters}
  searchSlot={searchSlot}
  sheetSide="bottom" // or "right" 
  collapsible={true} // optional
  sections={{ // optional
    essential: <EssentialFilters />,
    advanced: <AdvancedFilters />
  }}
>
  {/* Simple filter children when not using sections */}
</AdminFilterBar>
```

## Page Implementation Status

### ✅ Standardized Pages
- **Partner Locations**: Full AdminFilterBar with search persistence and mobile sheet
- **Organizations**: Enhanced filters with type and status selection
- **Work Orders**: Advanced implementation with section grouping and date ranges
- **Invoices**: Basic AdminFilterBar implementation
- **Users**: Basic AdminFilterBar implementation
- **Pipeline Dashboard**: Basic AdminFilterBar implementation

### Key Benefits Achieved
1. **Consistent UX**: Same filter pattern across all admin pages
2. **Mobile Optimization**: Bottom sheet for better mobile experience
3. **Search Persistence**: Search always accessible, properly persisted
4. **Maintainable Code**: Single component for all filter implementations
5. **Accessibility**: Proper ARIA labels and keyboard navigation
6. **Performance**: Memoized filter counting and stable callbacks

## Filter Component Guidelines

### Required Props
- `searchTerm`, `onSearchChange`: Search functionality
- `filterCount`: Calculate from active filters
- `onClearFilters`: Reset all filters and localStorage

### Recommended Features
- Use `MultiSelectFilter` for dropdown selections
- Include proper labels for accessibility
- Persist filters with consistent localStorage keys: `admin-[page]-filters-v2`
- Persist search with keys: `admin-[page]-search`

### Mobile Considerations
- Use `sheetSide="bottom"` for better mobile UX
- Search always visible on mobile via `searchSlot`
- Optimize filter layouts for touch interaction

Last updated: 2025-08-18