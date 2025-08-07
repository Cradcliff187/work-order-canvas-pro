import React from 'react';
import { Button } from '@/components/ui/button';
import { Phone, Map, MessageSquare, Eye, FileText } from 'lucide-react';
import { generateMapUrl } from '@/lib/utils/addressUtils';

interface QuickAction {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  variant?: 'ghost' | 'outline' | 'default';
}

interface MobileQuickActionsProps {
  actions: QuickAction[];
  className?: string;
}

export const MobileQuickActions: React.FC<MobileQuickActionsProps> = ({ 
  actions, 
  className = '' 
}) => {
  if (actions.length === 0) return null;

  return (
    <div className={`grid grid-cols-${Math.min(actions.length, 4)} gap-2 p-3 border-t border-border bg-muted/5 ${className}`}>
      {actions.map((action) => {
        const Icon = action.icon;
        return (
          <Button
            key={action.id}
            variant={action.variant || 'ghost'}
            size="sm"
            className="h-12 flex flex-col items-center gap-1 text-xs min-h-[48px]"
            onClick={(e) => {
              e.stopPropagation();
              action.onClick();
            }}
          >
            <Icon className="h-4 w-4" />
            <span className="leading-none">{action.label}</span>
          </Button>
        );
      })}
    </div>
  );
};

// Helper function to create phone action
export const createPhoneAction = (phoneNumber: string, label: string): QuickAction => ({
  id: 'phone',
  label,
  icon: Phone,
  onClick: () => {
    window.location.href = `tel:${phoneNumber}`;
  },
});

// Helper function to create map action
export const createMapAction = (address: any): QuickAction => ({
  id: 'map',
  label: 'Map',
  icon: Map,
  onClick: () => {
    const mapUrl = generateMapUrl(address);
    if (mapUrl) {
      window.open(mapUrl, '_blank');
    }
  },
});

// Helper function to create message action
export const createMessageAction = (onMessage: () => void): QuickAction => ({
  id: 'message',
  label: 'Message',
  icon: MessageSquare,
  onClick: onMessage,
});

// Helper function to create view details action
export const createViewDetailsAction = (onViewDetails: () => void): QuickAction => ({
  id: 'view',
  label: 'Details',
  icon: Eye,
  onClick: onViewDetails,
});

// Helper function to create submit report action
export const createSubmitReportAction = (onSubmitReport: () => void): QuickAction => ({
  id: 'submit',
  label: 'Submit',
  icon: FileText,
  onClick: onSubmitReport,
});