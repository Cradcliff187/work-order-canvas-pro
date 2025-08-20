import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Clock, FileText, Camera, Receipt } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

interface QuickAction {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
}

const actions: QuickAction[] = [
  { id: 'clock', label: 'Clock', icon: Clock, path: '/employee/dashboard' },
  { id: 'reports', label: 'Reports', icon: FileText, path: '/employee/time-reports' },
  { id: 'photo', label: 'Photo', icon: Camera, path: '/employee/time-reports' },
  { id: 'receipt', label: 'Receipt', icon: Receipt, path: '/employee/receipts' }
];

export const QuickActionsBar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();

  if (!isMobile) return null;

  const isActive = (path: string): boolean => {
    if (path === '/employee/dashboard') {
      return location.pathname === '/employee/dashboard';
    }
    return location.pathname.startsWith(path);
  };

  const handleActionClick = (action: QuickAction) => {
    // Haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }
    navigate(action.path);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 backdrop-blur-sm bg-background/95 border-t border-border">
      <div className="grid grid-cols-4 h-[60px] px-1">
        {actions.map((action) => {
          const Icon = action.icon;
          const active = isActive(action.path);
          
          return (
            <Button
              key={action.id}
              variant="ghost"
              size="sm"
              className={`
                min-h-[48px] min-w-0 h-full flex flex-col items-center justify-center gap-1
                transition-all duration-200 active:scale-95
                ${active 
                  ? 'text-primary font-medium bg-primary/12' 
                  : 'text-muted-foreground hover:text-foreground'
                }
              `}
              onClick={() => handleActionClick(action)}
            >
              <Icon className="h-4 w-4" />
              <span className="text-xs leading-none">{action.label}</span>
            </Button>
          );
        })}
      </div>
    </div>
  );
};