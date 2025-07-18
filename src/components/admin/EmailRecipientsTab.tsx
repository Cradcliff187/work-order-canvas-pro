
import React from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useEmailRecipientSettings } from '@/hooks/useEmailRecipientSettings';
import { Users, Mail, AlertTriangle } from 'lucide-react';

type UserType = 'admin' | 'partner' | 'subcontractor' | 'employee';

const USER_TYPE_LABELS: Record<UserType, string> = {
  admin: 'Admin',
  partner: 'Partner',
  subcontractor: 'Subcontractor',
  employee: 'Employee'
};

const TEMPLATE_LABELS: Record<string, string> = {
  work_order_created: 'Work Order Created',
  work_order_assigned: 'Work Order Assigned',
  work_order_completed: 'Work Order Completed',
  report_submitted: 'Report Submitted',
  report_reviewed: 'Report Reviewed',
  welcome_email: 'Welcome Email',
  invoice_submitted: 'Invoice Submitted'
};

export const EmailRecipientsTab: React.FC = () => {
  const {
    recipientMatrix,
    isLoading,
    updateRecipientSetting,
    bulkUpdateRole,
  } = useEmailRecipientSettings();

  const userTypes: UserType[] = ['admin', 'partner', 'subcontractor', 'employee'];

  const handleRecipientToggle = (templateName: string, role: UserType, checked: boolean) => {
    // Prevent unchecking if it would result in no recipients
    const currentMatrix = recipientMatrix.find(m => m.templateName === templateName);
    if (currentMatrix && !checked && currentMatrix.totalRecipients === 1) {
      return; // Don't allow unchecking the last recipient
    }

    updateRecipientSetting.mutate({
      templateName,
      role,
      receivesEmail: checked,
    });
  };

  const handleBulkToggle = (role: UserType, checked: boolean) => {
    bulkUpdateRole.mutate({
      role,
      receivesEmail: checked,
    });
  };

  const getRoleRecipientCount = (role: UserType) => {
    return recipientMatrix.filter(matrix => matrix.recipients[role]).length;
  };

  const isLastRecipient = (templateName: string, role: UserType) => {
    const matrix = recipientMatrix.find(m => m.templateName === templateName);
    return matrix && matrix.recipients[role] && matrix.totalRecipients === 1;
  };

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <LoadingSpinner />
        <p className="mt-2 text-muted-foreground">Loading recipient settings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Email Recipients</h2>
          <p className="text-muted-foreground">
            Configure which user roles receive each type of email notification
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="h-5 w-5 mr-2" />
            Recipient Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-medium">Email Template</TableHead>
                  {userTypes.map((role) => (
                    <TableHead key={role} className="text-center">
                      <div className="flex flex-col items-center space-y-2">
                        <span className="font-medium">{USER_TYPE_LABELS[role]}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const currentCount = getRoleRecipientCount(role);
                            const shouldEnable = currentCount < recipientMatrix.length;
                            handleBulkToggle(role, shouldEnable);
                          }}
                          disabled={bulkUpdateRole.isPending}
                          className="text-xs"
                        >
                          {getRoleRecipientCount(role) === recipientMatrix.length ? 'Unselect All' : 'Select All'}
                        </Button>
                      </div>
                    </TableHead>
                  ))}
                  <TableHead className="text-center">Recipients</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recipientMatrix.map((matrix) => (
                  <TableRow key={matrix.templateName}>
                    <TableCell className="font-medium">
                      <div className="flex items-center space-x-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span className="font-mono text-sm">
                          {TEMPLATE_LABELS[matrix.templateName] || matrix.templateName}
                        </span>
                      </div>
                    </TableCell>
                    {userTypes.map((role) => {
                      const isChecked = matrix.recipients[role];
                      const isLast = isLastRecipient(matrix.templateName, role);
                      const isPending = updateRecipientSetting.isPending;
                      
                      return (
                        <TableCell key={role} className="text-center">
                          <div className="flex items-center justify-center">
                            <Checkbox
                              checked={isChecked}
                              onCheckedChange={(checked) => 
                                handleRecipientToggle(matrix.templateName, role, checked as boolean)
                              }
                              disabled={isPending || (isLast && isChecked)}
                              className="h-5 w-5"
                            />
                            {isLast && (
                              <AlertTriangle className="h-4 w-4 ml-1 text-warning" />
                            )}
                          </div>
                        </TableCell>
                      );
                    })}
                    <TableCell className="text-center">
                      <Badge 
                        variant={matrix.totalRecipients === 0 ? 'destructive' : 'default'}
                        className="font-mono"
                      >
                        {matrix.totalRecipients}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          <div className="mt-4 p-4 bg-muted/50 rounded-lg">
            <div className="flex items-start space-x-2">
              <AlertTriangle className="h-4 w-4 text-warning mt-0.5" />
              <div className="text-sm text-muted-foreground">
                <p className="font-medium">Important Notes:</p>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>Each email template must have at least one recipient role configured</li>
                  <li>The warning icon (⚠️) indicates the last remaining recipient for a template</li>
                  <li>Use "Select All" / "Unselect All" buttons to quickly configure entire roles</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
