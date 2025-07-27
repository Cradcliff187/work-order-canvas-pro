import { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';

interface MobileTableCardProps {
  title: string;
  subtitle: string;
  status?: ReactNode;
  onClick?: () => void;
  children?: ReactNode;
}

export function MobileTableCard({ 
  title, 
  subtitle, 
  status, 
  onClick, 
  children 
}: MobileTableCardProps) {
  return (
    <Card 
      className={`transition-all duration-200 border-border ${
        onClick ? 'cursor-pointer hover:shadow-md hover:border-primary/20 active:scale-[0.98]' : ''
      }`}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm truncate">{title}</h3>
              <p className="text-sm text-muted-foreground truncate">{subtitle}</p>
            </div>
            {status && (
              <div className="flex-shrink-0">
                {status}
              </div>
            )}
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