
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { XCircle, Mail, Clock } from 'lucide-react';

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
  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-destructive" />
            Failed Emails ({failedEmails.length})
          </DialogTitle>
          <DialogDescription>
            Detailed view of emails that failed to deliver today
          </DialogDescription>
        </DialogHeader>
        
        <div className="overflow-auto flex-1">
          {failedEmails.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">No failed emails today</p>
              <p className="text-sm">All emails have been delivered successfully.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Template</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Error Message</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {failedEmails.map((email) => (
                  <TableRow key={email.id}>
                    <TableCell className="font-mono text-sm">
                      {email.recipient_email}
                    </TableCell>
                    <TableCell>
                      {email.template_used ? (
                        <Badge variant="outline">{email.template_used}</Badge>
                      ) : (
                        <span className="text-muted-foreground">N/A</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Clock className="h-3 w-3" />
                        {formatTime(email.sent_at)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-xs">
                        {email.error_message ? (
                          <span className="text-destructive text-sm break-words">
                            {email.error_message}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">No error message</span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
