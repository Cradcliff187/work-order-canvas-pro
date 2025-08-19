import React from 'react';

// Component prop interfaces
interface AdminPageLayoutProps {
  children: React.ReactNode;
  className?: string;
}

interface HeaderProps {
  title: string;
  description?: string;
  breadcrumb?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

interface FiltersProps {
  children?: React.ReactNode;
  className?: string;
}

interface ContentProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Standardized admin page layout component with compound pattern.
 * 
 * Usage example:
 * ```tsx
 * <AdminPageLayout>
 *   <AdminPageLayout.Header
 *     title="Reports"
 *     description="View and manage all reports"
 *     breadcrumb={<ReportsBreadcrumb />}
 *     actions={<Button>Export</Button>}
 *   />
 *   <AdminPageLayout.Filters>
 *     <ReportsFilterPanel />
 *   </AdminPageLayout.Filters>
 *   <AdminPageLayout.Content>
 *     <ReportsTable />
 *   </AdminPageLayout.Content>
 * </AdminPageLayout>
 * ```
 */
function AdminPageLayout({ children, className = '' }: AdminPageLayoutProps) {
  return (
    <div className={`space-y-6 ${className}`}>
      {children}
    </div>
  );
}

/**
 * Header section with title, description, breadcrumbs, and actions
 */
function Header({ title, description, breadcrumb, actions, className = '' }: HeaderProps) {
  return (
    <header role="banner" className={`space-y-4 ${className}`}>
      {breadcrumb && (
        <nav aria-label="Breadcrumb" className="text-sm">
          {breadcrumb}
        </nav>
      )}
      
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            {title}
          </h1>
          {description && (
            <p className="text-muted-foreground">
              {description}
            </p>
          )}
        </div>
        
        {actions && (
          <div className="flex items-center gap-2">
            {actions}
          </div>
        )}
      </div>
    </header>
  );
}

/**
 * Filters section for expandable filter panels
 */
function Filters({ children, className = '' }: FiltersProps) {
  if (!children) return null;
  
  return (
    <section role="search" aria-label="Filters" className={`border border-border rounded-lg bg-card ${className}`}>
      {children}
    </section>
  );
}

/**
 * Main content area with proper landmarks and spacing
 */
function Content({ children, className = '' }: ContentProps) {
  return (
    <main role="main" className={`flex-1 ${className}`}>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 bg-background text-foreground border border-border rounded-md px-3 py-2 shadow outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background z-50"
      >
        Skip to main content
      </a>
      <div id="main-content" tabIndex={-1}>
        {children}
      </div>
    </main>
  );
}

// Attach sub-components to main component
AdminPageLayout.Header = Header;
AdminPageLayout.Filters = Filters;
AdminPageLayout.Content = Content;

export { AdminPageLayout };
export type { AdminPageLayoutProps, HeaderProps, FiltersProps, ContentProps };