import { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';

interface CompactMobileCardProps {
  title: string;
  subtitle: string;
  badge?: ReactNode;
  onClick?: () => void;
  trailing?: ReactNode;
  children?: ReactNode;
}

export function CompactMobileCard({ 
  title, 
  subtitle, 
  badge, 
  onClick, 
  trailing,
  children 
}: CompactMobileCardProps) {
  return (
    <Card 
      className={`transition-all duration-200 border-border ${
        onClick ? 'cursor-pointer hover:shadow-md hover:border-primary/20 active:scale-[0.98]' : ''
      }`}
      onClick={onClick}
    >
      <CardContent className="p-3 min-h-[48px]">
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm truncate">{title}</h3>
              <p className="text-sm text-muted-foreground truncate">{subtitle}</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {badge && (
                <div className="flex-shrink-0">
                  {badge}
                </div>
              )}
              {trailing && (
                <div className="flex-shrink-0">
                  {trailing}
                </div>
              )}
            </div>
          </div>
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