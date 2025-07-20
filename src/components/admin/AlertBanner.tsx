
import React, { useState, useEffect } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Info, XCircle, X } from 'lucide-react';

interface AlertBannerProps {
  alerts: {
    noRecipientSettings: boolean;
    noRecentEmails: boolean;
    highFailureRate: boolean;
    missingTemplates: string[];
  };
}

interface DismissedAlert {
  type: string;
  dismissedAt: number;
}

export const AlertBanner: React.FC<AlertBannerProps> = ({ alerts }) => {
  const [dismissedAlerts, setDismissedAlerts] = useState<DismissedAlert[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem('dismissedEmailAlerts');
    if (stored) {
      try {
        setDismissedAlerts(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse dismissed alerts:', e);
      }
    }
  }, []);

  const dismissAlert = (alertType: string) => {
    const newDismissed = [...dismissedAlerts, {
      type: alertType,
      dismissedAt: Date.now()
    }];
    setDismissedAlerts(newDismissed);
    localStorage.setItem('dismissedEmailAlerts', JSON.stringify(newDismissed));
  };

  const isAlertDismissed = (alertType: string) => {
    const dismissed = dismissedAlerts.find(d => d.type === alertType);
    if (!dismissed) return false;
    
    // Re-show alerts after 24 hours
    const twentyFourHours = 24 * 60 * 60 * 1000;
    return (Date.now() - dismissed.dismissedAt) < twentyFourHours;
  };

  const activeAlerts = [];

  if (alerts.noRecipientSettings && !isAlertDismissed('noRecipientSettings')) {
    activeAlerts.push({
      type: 'noRecipientSettings',
      severity: 'warning' as const,
      icon: AlertTriangle,
      message: 'Warning: No email recipient rules configured. Emails may not be sent.'
    });
  }

  if (alerts.noRecentEmails && !isAlertDismissed('noRecentEmails')) {
    activeAlerts.push({
      type: 'noRecentEmails',
      severity: 'info' as const,
      icon: Info,
      message: 'Notice: No emails sent recently. Verify edge functions are working.'
    });
  }

  if (alerts.highFailureRate && !isAlertDismissed('highFailureRate')) {
    activeAlerts.push({
      type: 'highFailureRate',
      severity: 'destructive' as const,
      icon: XCircle,
      message: 'Alert: High email failure rate detected. Check IONOS configuration.'
    });
  }

  if (alerts.missingTemplates.length > 0 && !isAlertDismissed('missingTemplates')) {
    activeAlerts.push({
      type: 'missingTemplates',
      severity: 'warning' as const,
      icon: AlertTriangle,
      message: `Warning: Missing email templates: ${alerts.missingTemplates.join(', ')}. Some notifications may fail.`
    });
  }

  if (activeAlerts.length === 0) return null;

  return (
    <div className="space-y-2 mb-6">
      {activeAlerts.map((alert) => {
        const Icon = alert.icon;
        return (
          <Alert key={alert.type} variant={alert.severity} className="relative">
            <Icon className="h-4 w-4" />
            <AlertDescription className="pr-8">
              {alert.message}
            </AlertDescription>
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-2 top-2 h-6 w-6 p-0"
              onClick={() => dismissAlert(alert.type)}
            >
              <X className="h-3 w-3" />
            </Button>
          </Alert>
        );
      })}
    </div>
  );
};
