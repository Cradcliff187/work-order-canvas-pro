# Troubleshooting Guide

## Horizontal Overflow Issues

### Problem
Horizontal scrollbar appears on the page body, usually caused by table content or wide components escaping their containers.

### Debug Script
Run this in browser DevTools console to identify overflow sources:

```javascript
document.querySelectorAll('*').forEach(el => {
  if (el.scrollWidth > el.clientWidth) {
    console.log('Overflow element:', el, el.scrollWidth - el.clientWidth);
  }
});
```

### Common Fixes Applied

#### 1. Container Hierarchy
- **AdminLayout**: Added `overflow-x-hidden` to main content area
- **Page containers**: Wrapped with proper flex containers and `overflow-x-hidden`
- **MasterDetailLayout**: Updated ResizablePanel to use `overflow-x-hidden overflow-y-auto`

#### 2. Table Constraints
- **Table containers**: Added `min-w-0` class to allow proper text truncation
- **Table element**: Changed from `min-w-full` to `w-full` to prevent forced expansion
- **Table cells**: Added `min-w-0` to critical columns for text truncation

#### 3. Global Safeguards
- **Body element**: `overflow-x: hidden !important`
- **Root containers**: `max-width: 100vw` on html, body, #root
- **Mobile containers**: All containers max-width constrained on mobile

#### 4. Column Width Management
- Set appropriate `maxSize` on table columns
- Used `truncate` classes for text overflow
- Applied `min-w-0` to allow flex shrinking

### Prevention Guidelines

1. **Always use container constraints**:
   ```jsx
   <div className="w-full min-w-0 overflow-hidden">
     <div className="overflow-x-auto min-w-0">
       {/* content */}
     </div>
   </div>
   ```

2. **Table best practices**:
   - Use `w-full` instead of `min-w-full` on Table components
   - Add `min-w-0` to table containers
   - Set `maxSize` on columns that can grow large
   - Use `truncate` for text content

3. **Layout components**:
   - Add `overflow-x-hidden` to main content areas
   - Use `min-w-0` on flex children that contain text
   - Constrain ResizablePanel content with proper overflow

4. **Global CSS**:
   - Maintain `overflow-x: hidden` on body
   - Use `max-width: 100vw` on root containers
   - Apply mobile-specific constraints

### Testing Checklist

- [ ] No horizontal scrollbar on body element
- [ ] Table scrolls within its own container
- [ ] MasterDetailLayout constrains content properly
- [ ] Responsive behavior works across screen sizes
- [ ] Text truncates properly in narrow columns
- [ ] No content escapes viewport boundaries

### Files Modified for Overflow Fix

1. `src/components/admin/layout/AdminLayout.tsx` - Added overflow constraints
2. `src/pages/admin/AdminWorkOrders.tsx` - Fixed container structure
3. `src/components/work-orders/MasterDetailLayout.tsx` - Updated panel overflow
4. `src/components/admin/work-orders/WorkOrderTable.tsx` - Table container fixes
5. `src/components/admin/work-orders/WorkOrderColumns.tsx` - Column width constraints
6. `src/index.css` - Global overflow safeguards