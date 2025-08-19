import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, Clock, Package, MessageSquare, Paperclip } from 'lucide-react';

interface ReportPreviewSummaryProps {
  formData: {
    workPerformed: string;
    materialsUsed?: string;
    hoursWorked?: string;
    notes?: string;
    attachments?: File[];
    invoiceAmount?: string;
    invoiceNumber?: string;
  };
}

export const ReportPreviewSummary: React.FC<ReportPreviewSummaryProps> = ({ formData }) => {
  return (
    <div className="space-y-4">
      {/* Work Performed - Always shown */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5 text-primary" />
            Work Performed
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-foreground whitespace-pre-wrap">
            {formData.workPerformed || "No work description provided"}
          </p>
        </CardContent>
      </Card>

      {/* Materials Used - Conditional */}
      {formData.materialsUsed && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Package className="h-5 w-5 text-primary" />
              Materials Used
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-foreground whitespace-pre-wrap">
              {formData.materialsUsed}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Time and Invoice Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Hours Worked - Conditional */}
        {formData.hoursWorked && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Clock className="h-5 w-5 text-primary" />
                Hours Worked
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-sm font-medium">
                  {formData.hoursWorked} hours
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Invoice Information - Conditional */}
        {(formData.invoiceAmount || formData.invoiceNumber) && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="h-5 w-5 text-primary" />
                Invoice Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {formData.invoiceAmount && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Amount:</span>
                  <Badge variant="outline" className="font-medium">
                    ${formData.invoiceAmount}
                  </Badge>
                </div>
              )}
              {formData.invoiceNumber && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Invoice #:</span>
                  <span className="text-sm font-medium">{formData.invoiceNumber}</span>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Additional Notes - Conditional */}
      {formData.notes && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <MessageSquare className="h-5 w-5 text-primary" />
              Additional Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-foreground whitespace-pre-wrap">
              {formData.notes}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Attachments - Conditional */}
      {formData.attachments && formData.attachments.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Paperclip className="h-5 w-5 text-primary" />
              Attachments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {formData.attachments.map((file, index) => (
                <div key={index} className="flex items-center gap-3 p-2 bg-muted/50 rounded-md">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
              ))}
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="secondary" className="text-xs">
                  {formData.attachments.length} file{formData.attachments.length !== 1 ? 's' : ''}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};