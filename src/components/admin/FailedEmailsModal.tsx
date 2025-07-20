
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertCircle, Clock } from 'lucide-react';

interface FailedEmail {
  id: string;
  recipient_email: string;
  template_used: string | null;
  sent_at: string;
  error_message: string | null;
}

interface FailedEmailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  failedEmails: FailedEmail[];
}

export const FailedEmailsModal: React.FC<FailedEmailsModalProps> = ({
  isOpen,
  onClose,
  failedEmails
}) => {
  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            Failed Emails Today ({failedEmails.length})
          </DialogTitle>
          <DialogDescription>
            Detailed information about emails that failed to send today
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="max-h-96">
          {failedEmails.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No failed emails found for today</p>
            </div>
          ) : (
            <div className="space-y-4">
              {failedEmails.map((email) => (
                <div
                  key={email.id}
                  className="border rounded-lg p-4 space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="destructive">Failed</Badge>
                        {email.template_used && (
                          <Badge variant="outline">{email.template_used}</Badge>
                        )}
                      </div>
                      
                      <div className="space-y-1 text-sm">
                        <div>
                          <span className="font-medium">Recipient:</span>{' '}
                          <span className="font-mono">{email.recipient_email}</span>
                        </div>
                        
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>{formatDateTime(email.sent_at)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {email.error_message && (
                    <div className="mt-3 p-3 bg-destructive/10 rounded border border-destructive/20">
                      <div className="text-sm font-medium text-destructive mb-1">
                        Error Message:
                      </div>
                      <div className="text-xs font-mono text-destructive/80">
                        {email.error_message}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
