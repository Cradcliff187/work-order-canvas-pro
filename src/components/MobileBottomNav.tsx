
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Home, Briefcase, FileText, User, Plus } from 'lucide-react';
import { useOfflineStorage } from '@/hooks/useOfflineStorage';

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
  badge?: number;
}

interface MobileBottomNavProps {
  navItems?: NavItem[];
}

export function MobileBottomNav({ navItems: customNavItems }: MobileBottomNavProps = {}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { pendingCount } = useOfflineStorage();

  // Default subcontractor navigation (for backward compatibility)
  const defaultNavItems: NavItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: Home,
      path: '/subcontractor/dashboard'
    },
    {
      id: 'work-orders',
      label: 'Work Orders',
      icon: Briefcase,
      path: '/subcontractor/work-orders'
    },
    {
      id: 'submit',
      label: 'Submit',
      icon: Plus,
      path: '/subcontractor/submit-invoice'
    },
    {
      id: 'reports',
      label: 'Reports',
      icon: FileText,
      path: '/subcontractor/reports',
      badge: pendingCount
    },
    {
      id: 'profile',
      label: 'Profile',
      icon: User,
      path: '/subcontractor/profile'
    }
  ];

  // Use custom nav items if provided, otherwise use defaults
  const navItems = customNavItems || defaultNavItems;

  const handleNavClick = (item: NavItem) => {
    // Add haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }

    navigate(item.path);
  };

  const isActive = (path: string) => {
    // Handle exact match for dashboard routes
    if (path.endsWith('/dashboard')) {
      return location.pathname === path;
    }
    
    // Handle root paths that should match dashboard
    if (path === '/subcontractor' || path === '/partner') {
      return location.pathname === `${path}/dashboard`;
    }
    
    // For other paths, check if current path starts with the nav path
    return location.pathname.startsWith(path);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border z-40 pb-safe-area-pb">
      <div className="flex items-center justify-around px-1 py-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          
          return (
            <Button
              key={item.id}
              variant="ghost"
              size="sm"
              onClick={() => handleNavClick(item)}
              className={`flex flex-col items-center gap-1 h-14 min-w-0 px-2 py-1 relative touch-manipulation ${
                active 
                  ? 'text-primary bg-primary/10' 
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
              }`}
            >
              <div className="relative flex items-center justify-center">
                <Icon className="h-5 w-5" />
                {item.badge && item.badge > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-2 -right-2 h-4 w-4 p-0 text-[10px] flex items-center justify-center min-w-[16px]"
                  >
                    {item.badge > 99 ? '99+' : item.badge}
                  </Badge>
                )}
              </div>
              <span className="text-[10px] font-medium truncate max-w-full leading-tight">
                {item.label}
              </span>
              {item.id === 'submit' && (
                <div className="absolute inset-0 rounded-lg bg-primary/5 -z-10" />
              )}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
