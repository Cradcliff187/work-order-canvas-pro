import { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MoreHorizontal } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface MobileTableCardProps {
  title?: string;
  subtitle?: string;
  status?: ReactNode;
  onClick?: () => void;
  children?: ReactNode;
  data?: Record<string, string>;
  badge?: ReactNode;
  actions?: Array<{
    label: string;
    icon: any;
    onClick: () => void;
    show?: boolean;
  }>;
  className?: string;
}

export function MobileTableCard({ 
  title, 
  subtitle, 
  status, 
  onClick, 
  children,
  data,
  badge,
  actions,
  className
}: MobileTableCardProps) {
  // If data is provided, use the first two entries as title and subtitle
  const displayTitle = title || (data ? Object.values(data)[0] : '');
  const displaySubtitle = subtitle || (data ? Object.values(data)[1] : '');
  const displayStatus = status || badge;

  return (
    <Card 
      className={`transition-all duration-200 border-border ${
        onClick ? 'cursor-pointer hover:shadow-md hover:border-primary/20 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background' : ''
      } ${className || ''}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : -1}
      onKeyDown={(e) => {
        if (!onClick) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <CardContent className="p-4">
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm truncate">{displayTitle}</h3>
              <p className="text-sm text-muted-foreground truncate">{displaySubtitle}</p>
            </div>
            <div className="flex items-center gap-2">
              {displayStatus && (
                <div className="flex-shrink-0">
                  {displayStatus}
                </div>
              )}
              {actions && actions.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {actions.filter(action => action.show !== false).map((action, index) => {
                      const Icon = action.icon;
                      return (
                        <DropdownMenuItem
                          key={index}
                          onClick={(e) => {
                            e.stopPropagation();
                            action.onClick();
                          }}
                        >
                          <Icon className="h-4 w-4 mr-2" />
                          {action.label}
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
          
          {/* Display additional data if provided */}
          {data && Object.keys(data).length > 2 && (
            <div className="grid grid-cols-1 gap-1 text-xs text-muted-foreground">
              {Object.entries(data).slice(2).map(([key, value]) => (
                <div key={key} className="flex justify-between">
                  <span>{key}:</span>
                  <span className="font-medium">{value}</span>
                </div>
              ))}
            </div>
          )}
          
          {children && (
            <div className="pt-2 border-t border-border">
              {children}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}