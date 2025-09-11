import React, { useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { useBulkTimeEntryImport, type ValidationResult } from '@/hooks/useBulkTimeEntryImport';

interface CSVPreviewTableProps {
  file: File;
  validationResults?: ValidationResult[];
}

export function CSVPreviewTable({ file, validationResults }: CSVPreviewTableProps) {
  const { parseCSV, parsedData, isValidating } = useBulkTimeEntryImport();

  useEffect(() => {
    if (file) {
      parseCSV(file);
    }
  }, [file, parseCSV]);

  if (isValidating) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-2 text-muted-foreground">Loading and validating data...</span>
      </div>
    );
  }

  if (!parsedData || parsedData.length === 0) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          No data found in the uploaded file. Please check the file format and try again.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border max-h-96 overflow-auto">
        <Table>
          <TableHeader className="sticky top-0 bg-background">
            <TableRow>
              <TableHead className="w-12">Row</TableHead>
              <TableHead>Employee Email</TableHead>
              <TableHead>Work Order #</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Hours</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {parsedData.map((row, index) => {
              const validation = validationResults?.[index];
              const isValid = validation?.isValid ?? false;
              const errors = validation?.errors ?? [];

              return (
                <TableRow
                  key={index}
                  className={!isValid ? 'bg-red-50 hover:bg-red-100' : ''}
                >
                  <TableCell className="text-xs text-muted-foreground">
                    {index + 1}
                  </TableCell>
                  <TableCell className={errors.some(e => e.field === 'employeeEmail') ? 'text-red-600' : ''}>
                    {row.employeeEmail}
                  </TableCell>
                  <TableCell className={errors.some(e => e.field === 'workOrderNumber') ? 'text-red-600' : ''}>
                    {row.workOrderNumber}
                  </TableCell>
                  <TableCell className={errors.some(e => e.field === 'date') ? 'text-red-600' : ''}>
                    {row.date}
                  </TableCell>
                  <TableCell className={errors.some(e => e.field === 'hours') ? 'text-red-600' : ''}>
                    {row.hours}
                  </TableCell>
                  <TableCell className="max-w-xs truncate">
                    {row.description}
                  </TableCell>
                  <TableCell>
                    {validation ? (
                      <div className="space-y-1">
                        <Badge variant={isValid ? 'default' : 'destructive'}>
                          {isValid ? 'Valid' : 'Invalid'}
                        </Badge>
                        {errors.length > 0 && (
                          <div className="text-xs text-red-600 space-y-1">
                            {errors.map((error, i) => (
                              <div key={i}>{error.message}</div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <Badge variant="secondary">Validating...</Badge>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {validationResults && (
        <div className="text-sm text-muted-foreground">
          Showing {parsedData.length} rows from uploaded file
        </div>
      )}
    </div>
  );
}