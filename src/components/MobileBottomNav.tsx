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
      path: '/subcontractor'
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
      path: '/subcontractor/work-orders'
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
      path: '/profile'
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
    // Handle exact match for dashboard routes (both partner and subcontractor)
    if (path === '/subcontractor' || path === '/partner/dashboard') {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border z-40 safe-area-pb">
      <div className="flex items-center justify-around px-2 py-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          
          return (
            <Button
              key={item.id}
              variant="ghost"
              size="sm"
              onClick={() => handleNavClick(item)}
              className={`flex flex-col items-center gap-1 h-12 min-w-0 px-2 relative ${
                active 
                  ? 'text-primary' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <div className="relative">
                <Icon className={`h-5 w-5 ${item.id === 'submit' ? 'h-6 w-6' : ''}`} />
                {item.badge && item.badge > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-2 -right-2 h-4 w-4 p-0 text-xs flex items-center justify-center"
                  >
                    {item.badge > 99 ? '99+' : item.badge}
                  </Badge>
                )}
              </div>
              <span className="text-xs font-medium truncate max-w-full">
                {item.label}
              </span>
              {item.id === 'submit' && (
                <div className="absolute inset-0 rounded-lg bg-primary/10 -z-10" />
              )}
            </Button>
          );
        })}
      </div>
    </div>
  );
}