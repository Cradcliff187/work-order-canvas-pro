import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Gauge, ClipboardList, FileBarChart, FolderKanban, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { AdminMoreSheet } from './AdminMoreSheet';

interface AdminMobileNavProps {
  className?: string;
}

export function AdminMobileNav({ className }: AdminMobileNavProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { triggerHaptic } = useHapticFeedback();
  const [showMoreSheet, setShowMoreSheet] = useState(false);

  // Priority navigation items for admin mobile
  const priorityNavItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Gauge, path: '/admin/dashboard' },
    { id: 'work-orders', label: 'Work Orders', icon: ClipboardList, path: '/admin/work-orders' },
    { id: 'reports', label: 'Reports', icon: FileBarChart, path: '/admin/reports' },
    { id: 'projects', label: 'Projects', icon: FolderKanban, path: '/admin/projects' },
  ];

  const handleNavigation = (path: string) => {
    triggerHaptic({ pattern: 'light' });
    navigate(path);
  };

  const handleMoreClick = () => {
    triggerHaptic({ pattern: 'light' });
    setShowMoreSheet(true);
  };

  return (
    <>
      <nav 
        className={cn(
          "fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border",
          className
        )}
        role="navigation"
        aria-label="Admin navigation"
      >
        <div className="flex items-center justify-around h-16 px-2">
          {priorityNavItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            
            return (
              <button
                key={item.id}
                onClick={() => handleNavigation(item.path)}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-colors min-w-0 flex-1 min-h-[44px]",
                  isActive 
                    ? "text-primary bg-primary/10" 
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
                aria-label={item.label}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon size={20} className="flex-shrink-0" />
                <span className="text-xs font-medium truncate">{item.label}</span>
              </button>
            );
          })}
          
          {/* More button */}
          <button
            onClick={handleMoreClick}
            className="flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-colors min-w-0 flex-1 text-muted-foreground hover:text-foreground hover:bg-muted/50 min-h-[44px]"
            aria-label="More options"
          >
            <MoreHorizontal size={20} className="flex-shrink-0" />
            <span className="text-xs font-medium truncate">More</span>
          </button>
        </div>
      </nav>

      <AdminMoreSheet 
        open={showMoreSheet} 
        onOpenChange={setShowMoreSheet} 
      />
    </>
  );
}