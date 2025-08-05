# WorkOrderPro UI Design System

This document defines the complete UI design system for WorkOrderPro, a construction management SaaS application. It serves as the single source of truth for all UI/UX decisions and ensures consistency across the application.

## Table of Contents

1. [Brand & Color System](#brand--color-system)
2. [Typography System](#typography-system)
3. [Component Standards](#component-standards)
4. [Status Badge System](#status-badge-system)
5. [Layout & Grid System](#layout--grid-system)
6. [Icon Usage Guidelines](#icon-usage-guidelines)
7. [Interactive States & Animations](#interactive-states--animations)
8. [Mobile Design Patterns](#mobile-design-patterns)
9. [Accessibility Standards](#accessibility-standards)
10. [Implementation Guidelines](#implementation-guidelines)

## Brand & Color System

### Primary Brand Colors

**Primary Blue**: Professional enterprise blue with depth
- `--primary: 211 96% 45%` (#0969DA)
- `--primary-dark: 211 96% 35%` (#0650A7)
- `--primary-foreground: 0 0% 100%` (White text on primary)
- `--primary-glow: 211 96% 55%` (Lighter variant for gradients)

### Color Palette

**Background & Surface Colors**
```css
--background: 0 0% 98%;             /* Clean white background #FAFAFA */
--foreground: 222 47% 11%;          /* Rich dark text #1A202C */
--card: 0 0% 100%;                  /* Pure white cards */
--card-foreground: 222 47% 11%;     /* Dark card text */
--popover: 0 0% 100%;               /* White popovers */
--popover-foreground: 222 47% 11%;  /* Dark popover text */
```

**Neutral Colors**
```css
--secondary: 215 20% 25%;           /* Sophisticated dark gray #334155 */
--secondary-foreground: 0 0% 100%;  /* White text on secondary */
--muted: 214 32% 91%;               /* Light gray backgrounds #E2E8F0 */
--muted-foreground: 215 25% 27%;    /* Dark muted text #3A4358 */
--accent: 158 64% 92%;              /* Light green tint #D1FAE5 */
--accent-foreground: 158 84% 25%;   /* Dark green text #0F5132 */
```

**Status Colors** (Clear & Professional)
```css
--success: 158 64% 42%;             /* Efficiency green #27A971 */
--success-foreground: 0 0% 100%;    
--warning: 45 93% 47%;              /* Attention amber #F59E0B */
--warning-foreground: 0 0% 100%;    
--destructive: 0 72% 51%;           /* Issue red #E11D48 */
--destructive-foreground: 0 0% 100%;
--info: 206 100% 50%;               /* Information blue #0EA5E9 */
--info-foreground: 0 0% 100%;
```

**Form & Interactive Colors**
```css
--border: 214 32% 85%;              /* Visible borders #D4DBE5 */
--input: 214 32% 96%;               /* Input backgrounds #F1F5F9 */
--ring: 211 96% 45%;                /* Blue focus rings */
```

**Professional Gradients**
```css
--gradient-primary: linear-gradient(135deg, hsl(211 96% 45%), hsl(211 96% 55%));
--gradient-surface: linear-gradient(180deg, hsl(var(--background)), hsl(var(--muted)));
--gradient-header: linear-gradient(135deg, hsl(211 96% 45%), hsl(211 96% 35%));
```

**Enterprise Shadows**
```css
--shadow-sm: 0 1px 2px 0 hsl(222 47% 11% / 0.05);
--shadow: 0 2px 4px -1px hsl(222 47% 11% / 0.06), 0 1px 2px -1px hsl(222 47% 11% / 0.03);
--shadow-md: 0 4px 6px -1px hsl(222 47% 11% / 0.07), 0 2px 4px -1px hsl(222 47% 11% / 0.04);
--shadow-lg: 0 10px 15px -3px hsl(222 47% 11% / 0.08), 0 4px 6px -2px hsl(222 47% 11% / 0.04);
--shadow-xl: 0 20px 25px -5px hsl(222 47% 11% / 0.08), 0 10px 10px -5px hsl(222 47% 11% / 0.04);
```

### Design Philosophy

The enhanced color system reflects AKC's position as a professional B2B maintenance management platform:

- **Deeper Blue Primary**: Conveys trust, stability, and enterprise credibility
- **Sophisticated Grays**: Creates visual hierarchy without distraction
- **Green Accents**: Signals efficiency and successful completion
- **Improved Contrast**: Ensures accessibility and reduces eye strain
- **Subtle Gradients**: Adds depth without overwhelming partner branding

This palette maintains familiarity while elevating the overall professional appearance.

## Typography System

### Heading Hierarchy

- **H1**: Page titles, main headers (`text-2xl font-semibold`)
- **H2**: Section headers (`text-xl font-semibold`)
- **H3**: Card titles, subsection headers (`text-lg font-semibold`)
- **H4-H6**: Minor headings, form sections (`text-base font-medium`)

### Text Sizes

- **Large Text**: `text-lg` - Important descriptions, highlighted content
- **Base Text**: `text-base` - Body text, form labels
- **Small Text**: `text-sm` - Captions, metadata, muted information
- **Extra Small**: `text-xs` - Badges, timestamps, fine print

### Font Weights

- **Semibold** (`font-semibold`): Headlines, important text
- **Medium** (`font-medium`): Subheadings, emphasis
- **Normal** (`font-normal`): Body text, general content

### Text Colors

- **Primary Text**: `text-foreground` - Main content
- **Muted Text**: `text-muted-foreground` - Secondary information
- **Colored Text**: `text-primary`, `text-success`, `text-warning`, `text-destructive`

## Component Standards

### Button Variants

**Primary** (`variant="default"`)
- Main actions, form submissions
- `bg-primary text-primary-foreground hover:bg-primary/90`

**Secondary** (`variant="secondary"`)  
- Secondary actions, alternative options
- `bg-secondary text-secondary-foreground hover:bg-secondary/80`

**Outline** (`variant="outline"`)
- Less prominent actions, cancel buttons
- `border border-input bg-background hover:bg-accent`

**Ghost** (`variant="ghost"`)
- Table actions, minimal prominence
- `hover:bg-accent hover:text-accent-foreground`

**Destructive** (`variant="destructive"`)
- Delete, remove, dangerous actions
- `bg-destructive text-destructive-foreground hover:bg-destructive/90`

**Success/Warning** (`variant="success"|"warning"`)
- Status-specific actions
- Construction-appropriate colors

### Button Sizes

- **Default**: `h-10 px-4 py-2` - Standard buttons
- **Small**: `h-9 px-3` - Compact spaces, table actions
- **Large**: `h-11 px-8` - Prominent actions, forms
- **Icon**: `h-10 w-10` - Icon-only buttons

### Card Components

**Basic Card Structure**
```tsx
<Card className="rounded-lg border bg-card text-card-foreground shadow-sm">
  <CardHeader className="flex flex-col space-y-1.5 p-6">
    <CardTitle className="text-2xl font-semibold">Title</CardTitle>
    <CardDescription className="text-sm text-muted-foreground">Description</CardDescription>
  </CardHeader>
  <CardContent className="p-6 pt-0">Content</CardContent>
  <CardFooter className="flex items-center p-6 pt-0">Footer</CardFooter>
</Card>
```

### Badge Variants

**Default** (`variant="default"`)
- Status indicators, primary tags
- `bg-primary text-primary-foreground`

**Secondary** (`variant="secondary"`)
- Secondary status, metadata
- `bg-secondary text-secondary-foreground`

**Destructive** (`variant="destructive"`)
- Error states, warnings
- `bg-destructive text-destructive-foreground`

**Outline** (`variant="outline"`)
- Subtle indicators, categories
- `border text-foreground`

### Form Component Standards

**Input Fields**
- Use semantic form components with proper labeling
- Include error states with `aria-invalid` and `aria-describedby`
- Consistent padding and border radius (`--radius: 0.5rem`)

**Form Validation**
- Error messages linked to fields via `aria-describedby`
- Success states with checkmark icons
- Loading states with `aria-busy`

## Status Badge System

### Design Philosophy

Status badges provide **instant visual communication** across the platform. Each color has specific meaning that remains consistent in every context:

- **Blue** - New, pending, or informational states
- **Amber** - Assigned, attention needed, or warning states  
- **Orange** - Active, in-progress states
- **Green** - Completed, approved, or success states
- **Red** - Cancelled, rejected, or error states
- **Purple** - Special requests or unique states
- **Gray** - Inactive, pending, or neutral states

### Badge Implementation

All status badges use the `StatusBadge` component to ensure consistency:

```tsx
// Basic usage
<StatusBadge type="workOrder" status="assigned" />

// With options
<StatusBadge 
  type="workOrder" 
  status="in_progress" 
  showIcon 
  size="lg" 
/>

// Convenience components
<WorkOrderStatusBadge status="completed" />
<FinancialStatusBadge status="paid" showIcon />
```

### Status Color Mappings

**Work Order Statuses**
- `received` - Blue (New work order)
- `assigned` - Amber (Awaiting action)
- `estimate_needed` - Purple (Special requirement)
- `estimate_approved` - Teal (Ready to proceed)
- `in_progress` - Orange (Active work)
- `completed` - Green (Work done)
- `cancelled` - Red (Stopped)

**Financial Statuses**
- `pending` - Gray (No invoice yet)
- `partially_invoiced` - Yellow (Partial billing)
- `fully_invoiced` - Blue (Complete billing)
- `approved_for_payment` - Teal (Ready to pay)
- `paid` - Green (Transaction complete)
- `dispute` - Red (Issue to resolve)

**Priority Levels**
- `low` - Gray
- `medium` - Blue
- `high` - Orange
- `urgent` - Red

### Badge Anatomy

```
┌─────────────────────────┐
│ [Icon] Status Label     │ <- Font: medium, size varies
└─────────────────────────┘
   └─ Background color with matching border
   └─ Hover state darkens background
   └─ Consistent padding and height
```

### Usage Guidelines

1. **Always use the StatusBadge component** - Never create custom badge styles
2. **Icon usage** - Include icons for better scannability in data tables
3. **Size variants**:
   - `sm` - Compact tables, mobile views
   - `default` - Standard tables, forms
   - `lg` - Featured status, detail pages
4. **Maintain meaning** - Never repurpose colors for different meanings

### 🎯 What This Achieves

1. **100% Consistency** - Same badge everywhere = instant recognition
2. **Better Visibility** - Stronger colors that work with your enhanced blue theme
3. **Single Source of Truth** - One configuration controls all badges
4. **Easy Maintenance** - Change once, updates everywhere
5. **TypeScript Safety** - Can't use wrong status values

The badges will now be a **unified visual language** that partners can learn once and recognize instantly across all screens.

## Layout & Grid System

### Responsive Breakpoints

**Mobile First Approach**
- **Mobile**: `<768px` - Single column, touch-optimized
- **Desktop**: `≥768px` - Multi-column, mouse-optimized

**Breakpoint Hook**
```tsx
const MOBILE_BREAKPOINT = 768;
const isMobile = useIsMobile(); // Returns boolean
```

### Container System

**Page Layout**
```tsx
<div className="min-h-screen flex w-full">
  <Sidebar /> 
  <main className="flex-1 overflow-hidden">
    <div className="container mx-auto p-4 md:p-6">
      {/* Page content */}
    </div>
  </main>
</div>
```

**Card Grid Patterns**
```tsx
// Dashboard cards
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
  <Card>...</Card>
</div>

// Content grid
<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
  <div className="lg:col-span-2">{/* Main content */}</div>
  <div>{/* Sidebar content */}</div>
</div>
```

### Spacing System

**Consistent Spacing Scale**
- **xs**: `gap-2` (8px) - Tight spacing, form elements
- **sm**: `gap-4` (16px) - Component spacing
- **md**: `gap-6` (24px) - Section spacing  
- **lg**: `gap-8` (32px) - Major section spacing
- **xl**: `gap-12` (48px) - Page section spacing

## Icon Usage Guidelines

### Icon Library

**Lucide React** - Primary icon library
- Consistent stroke width and style
- Tree-shakable imports
- Full TypeScript support

### Icon Sizing Conventions

```tsx
// Standard sizes with consistent classes
<IconName className="h-4 w-4" />    // 16px - Inline text, buttons
<IconName className="h-5 w-5" />    // 20px - Form labels, small actions  
<IconName className="h-6 w-6" />    // 24px - Navigation, prominent actions
<IconName className="h-8 w-8" />    // 32px - Large actions, features
```

### Contextual Icon Usage

**Navigation Icons**
- Consistent sizing (`h-5 w-5`)
- Semantic meaning (Home, Settings, Users)
- Proper ARIA labels

**Status Icons** 
- Color-coded (success, warning, error)
- Paired with text for clarity
- Accessible alternatives provided

**Action Icons**
- Clear purpose (Edit, Delete, Add)
- Hover states and focus indicators
- Descriptive `aria-label` attributes

### Construction-Specific Navigation Icons

**OPERATIONS**
- Admin Dashboard → Building2 or Gauge (construction overview)
- Employee Dashboard → HardHat (worker-focused)
- Work Orders → ClipboardList (task management)
- Approval Center → ShieldCheck (authority/verification)
- Reports → FileBarChart (data visualization)
- Time Reports → Timer (time tracking)

**FINANCIAL**
- Receipts → ReceiptText (construction receipts)
- Invoices → FileText with DollarSign (billing)

**MANAGEMENT**
- Users → Users (multiple people)
- Organizations → Building2 (company structures)
- Partner Locations → MapPin (location management)
- Employees → HardHat (worker management)

**INSIGHTS**
- Email Templates → Mail (communications)
- Analytics → TrendingUp or BarChart3 (data analysis)

**SYSTEM**
- Settings → Settings (configuration)
- System Health → Activity (monitoring)
- Email Testing → MailCheck (testing)

**Icon Color Coding**
- Operations: Blue (#2563EB)
- Financial: Green (#059669)
- Management: Purple (#7C3AED)
- Insights: Orange (#EA580C)
- System: Gray (#6B7280)

### Icon Import Pattern

```tsx
// ✅ CORRECT: Tree-shakable imports
import { Home, Settings, User } from 'lucide-react';

// ❌ WRONG: Importing entire library
import * as Icons from 'lucide-react';
```

## Interactive States & Animations

### Hover Effects

**Button Hover**
```css
/* Opacity reduction for backgrounds */
hover:bg-primary/90          /* Primary buttons */
hover:bg-secondary/80        /* Secondary buttons */

/* Background changes for subtle elements */
hover:bg-accent             /* Ghost buttons */
hover:bg-muted/50          /* Subtle interactions */
```

**Link Hover**
```css
/* Underline animation */
.story-link {
  @apply relative inline-block after:content-[''] after:absolute 
         after:w-full after:scale-x-0 after:h-0.5 after:bottom-0 
         after:left-0 after:bg-primary after:origin-bottom-right 
         after:transition-transform after:duration-300 
         hover:after:scale-x-100 hover:after:origin-bottom-left;
}
```

### Animation System

**Keyframe Animations**
```css
/* Accordion animations */
@keyframes accordion-down {
  from { height: 0; opacity: 0; }
  to { height: var(--radix-accordion-content-height); opacity: 1; }
}

/* Fade animations */
@keyframes fade-in {
  0% { opacity: 0; transform: translateY(10px); }
  100% { opacity: 1; transform: translateY(0); }
}

/* Scale animations */
@keyframes scale-in {
  0% { transform: scale(0.95); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
}
```

**Animation Classes**
```css
.animate-fade-in          /* Smooth entrance */
.animate-scale-in         /* Emphasis appearance */
.animate-accordion-down   /* Expanding content */
.hover-scale             /* Interactive scaling */
```

### Loading States

**Button Loading Pattern**
```tsx
<Button disabled={isLoading} aria-busy={isLoading}>
  {isLoading ? (
    <>
      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      Loading...
    </>
  ) : (
    'Submit'
  )}
</Button>
```

**Skeleton Loading**
```tsx
// Table loading state
<div className="animate-pulse">
  <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
  <div className="h-4 bg-muted rounded w-1/2"></div>
</div>
```

### Transition System

**Smooth Transitions**
```css
--transition-smooth: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

/* Applied to interactive elements */
.transition-smooth { transition: var(--transition-smooth); }
```

## Mobile Design Patterns

### Mobile-Specific Components

**Bottom Navigation**
```tsx
<MobileBottomNav className="fixed bottom-0 left-0 right-0 z-50" />
```

**Pull to Refresh**
```tsx
<MobilePullToRefresh onRefresh={handleRefresh}>
  <div className="p-4">{content}</div>
</MobilePullToRefresh>
```

### Touch-Friendly Interactions

**Minimum Touch Targets**
- Buttons: `h-10` minimum (40px) for easy tapping
- Form fields: `h-10` minimum with adequate padding
- Navigation items: `h-12` for comfortable interaction

**Touch Gestures**
- Swipe actions for lists
- Pull-to-refresh for data updates
- Pinch-to-zoom for images/diagrams

### Mobile Layout Adaptations

**Responsive Navigation**
```tsx
// Desktop: Sidebar
<div className="hidden md:block">
  <Sidebar />
</div>

// Mobile: Bottom navigation
<div className="md:hidden">
  <MobileBottomNav />
</div>
```

**Content Stacking**
```tsx
// Desktop: Side-by-side
<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
  <MainContent />
  <SidebarContent />
</div>

// Mobile: Stacked vertically
```

## Accessibility Standards

### ARIA Patterns

**Form Accessibility**
```tsx
<form aria-busy={isSubmitting}>
  <label htmlFor="email">Email</label>
  <input 
    id="email"
    aria-invalid={hasError}
    aria-describedby={hasError ? "email-error" : undefined}
  />
  {hasError && (
    <div id="email-error" role="alert">
      Email is required
    </div>
  )}
</form>
```

**Table Accessibility**
```tsx
<table role="table" aria-label="Work orders">
  <thead>
    <tr>
      <th scope="col">Work Order #</th>
      <th scope="col">Status</th>
      <th scope="col" aria-label="Actions">
        <span className="sr-only">Actions</span>
      </th>
    </tr>
  </thead>
</table>
```

**Interactive Elements**
```tsx
// Action buttons with descriptive labels
<Button 
  aria-label={`Edit work order ${workOrder.number}`}
  onClick={() => handleEdit(workOrder)}
>
  <Edit className="h-4 w-4" />
</Button>

// Status announcements
<div 
  role="status" 
  aria-live="polite" 
  className="sr-only"
>
  {`${searchResults.length} results found`}
</div>
```

### Keyboard Navigation

**Focus Management**
```tsx
// Custom hook for modal focus
const { dialogRef } = useFocusManagement(open);

<DialogContent ref={dialogRef}>
  {/* Modal content with proper focus trap */}
</DialogContent>
```

**Keyboard Shortcuts**
```tsx
const { handleKeyDown } = useKeyboardNavigation({
  onEscape: () => setOpen(false),
  onEnter: handleSelect,
  onArrowUp: focusPrevious,
  onArrowDown: focusNext
});
```

### Screen Reader Support

**Live Regions**
```tsx
// Status updates
<div role="status" aria-live="polite" aria-atomic="true">
  Form saved successfully
</div>

// Critical alerts  
<div role="alert" aria-live="assertive">
  Error: Unable to save form
</div>
```

**Semantic HTML**
```tsx
// Use proper semantic elements
<main>              {/* Main content area */}
<nav>               {/* Navigation */}
<article>           {/* Standalone content */}
<section>           {/* Thematic grouping */}
<aside>             {/* Sidebar content */}
```

### Color Contrast

**WCAG AA Compliance**
- Text contrast ratio: 4.5:1 minimum
- Large text contrast ratio: 3:1 minimum  
- Focus indicators: Visible and sufficient contrast
- Status colors: Don't rely on color alone

## Implementation Guidelines

### CSS Custom Properties

**Always Use Semantic Tokens**
```tsx
// ✅ CORRECT: Semantic color usage
<div className="bg-primary text-primary-foreground">

// ❌ WRONG: Direct color values
<div className="bg-blue-500 text-white">
```

### Component Development

**Consistent Variant Patterns**
```tsx
// Use cva for variant management
const componentVariants = cva(
  "base-classes",
  {
    variants: {
      variant: {
        default: "variant-specific-classes",
        secondary: "secondary-variant-classes"
      }
    }
  }
);
```

**Accessibility First**
```tsx
// Include accessibility from the start
const MyComponent = React.forwardRef<HTMLDivElement, ComponentProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("component-classes", className)}
      role="appropriate-role"
      {...props}
    />
  )
);
```

### Performance Considerations

**Icon Optimization**
- Tree-shake icon imports
- Use appropriate icon sizes
- Implement lazy loading for large icon sets

**Animation Performance**
- Use CSS transforms over layout properties
- Implement `will-change` for animating elements
- Provide reduced motion alternatives

### Quality Assurance

**Design System Checklist**
- [ ] All colors use semantic tokens
- [ ] Components have consistent variants
- [ ] ARIA labels and roles are implemented
- [ ] Keyboard navigation works correctly
- [ ] Mobile layouts are touch-friendly
- [ ] Loading states include aria-busy
- [ ] Error states are properly announced
- [ ] Focus management is handled correctly

**Testing Requirements**
- Keyboard-only navigation
- Screen reader compatibility
- Mobile device testing
- High contrast mode
- Reduced motion preferences
- Color blindness simulation

---

## Quick Reference

### Common Patterns

**Status Badge**
```tsx
<Badge variant={status === 'completed' ? 'default' : 'secondary'}>
  {status}
</Badge>
```

**Loading Button**
```tsx
<Button disabled={isLoading} aria-busy={isLoading}>
  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
  {isLoading ? 'Saving...' : 'Save'}
</Button>
```

**Responsive Grid**
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {items.map(item => <Card key={item.id}>...</Card>)}
</div>
```

This design system ensures consistent, accessible, and professional UI across all WorkOrderPro interfaces while maintaining the construction industry's professional aesthetic.