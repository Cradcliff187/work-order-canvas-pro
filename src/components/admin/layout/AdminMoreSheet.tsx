import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle 
} from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { sidebarItems, sidebarSections, adminOnlyItems } from './sidebarConfig';
import { UserProfileDropdown } from '@/components/admin/layout/UserProfileDropdown';

interface AdminMoreSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AdminMoreSheet({ open, onOpenChange }: AdminMoreSheetProps) {
  const navigate = useNavigate();
  const { triggerHaptic } = useHapticFeedback();
  const [searchQuery, setSearchQuery] = useState('');

  // Priority items that are already in bottom nav (excluding these from More sheet)
  const priorityPaths = ['/admin/dashboard', '/admin/work-orders', '/admin/finance/receipts', '/admin/reports'];

  // Filter admin-only items and exclude priority items
  const adminItems = sidebarItems.filter(item => 
    adminOnlyItems.includes(item.title) && 
    !priorityPaths.includes(item.url)
  );

  // Filter items based on search query
  const filteredItems = adminItems.filter(item =>
    item.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group filtered items by section
  const groupedItems = Object.entries(sidebarSections).reduce((acc, [sectionName, sectionItems]) => {
    const sectionPages = filteredItems.filter(item => sectionItems.includes(item.title));
    if (sectionPages.length > 0) {
      acc[sectionName] = sectionPages;
    }
    return acc;
  }, {} as Record<string, typeof adminItems>);

  const handleNavigation = (path: string) => {
    triggerHaptic({ pattern: 'light' });
    navigate(path);
    onOpenChange(false);
  };

  const clearSearch = () => {
    setSearchQuery('');
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side="bottom" 
        className="h-[85vh] flex flex-col p-0 gap-0"
      >
        <SheetHeader className="px-6 py-4 border-b border-border">
          <SheetTitle className="text-left">Admin Pages</SheetTitle>
          
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search pages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-10"
            />
            {searchQuery && (
              <button
                onClick={clearSearch}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </SheetHeader>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {Object.keys(groupedItems).length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery ? 'No pages found matching your search.' : 'No additional pages available.'}
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedItems).map(([sectionName, sectionPages]) => (
                <div key={sectionName}>
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    {sectionName}
                  </h3>
                  <div className="grid gap-2">
                    {sectionPages.map((item) => {
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.url}
                          onClick={() => handleNavigation(item.url)}
                          className={cn(
                            "flex items-center gap-3 p-3 rounded-lg transition-colors text-left w-full min-h-[44px]",
                            "text-foreground hover:bg-muted/50 active:bg-muted"
                          )}
                        >
                          <Icon className="h-5 w-5 flex-shrink-0 text-muted-foreground" />
                          <span className="font-medium">{item.title}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {/* Profile & Account Section */}
          <div className="mt-8 pt-6 border-t border-border">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Profile & Account
            </h3>
            <UserProfileDropdown collapsed={true} />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}