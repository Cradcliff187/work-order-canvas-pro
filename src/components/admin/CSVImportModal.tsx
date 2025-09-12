import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FileText, Download, Upload, AlertCircle, CheckCircle } from 'lucide-react';
import { UnifiedFileUpload } from '@/components/upload/UnifiedFileUpload';
import { CSVPreviewTable } from './CSVPreviewTable';
import { useBulkTimeEntryImport } from '@/hooks/useBulkTimeEntryImport';
import { generateFilename } from '@/lib/utils/export';
import * as XLSX from 'xlsx';

interface CSVImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function CSVImportModal({ open, onOpenChange, onSuccess }: CSVImportModalProps) {
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [step, setStep] = useState<'upload' | 'preview' | 'importing' | 'results'>('upload');
  const [importResults, setImportResults] = useState<{ success: number; failed: number; errors: string[] }>({
    success: 0,
    failed: 0,
    errors: []
  });

  const {
    parsedData,
    validationResults,
    isValidating,
    bulkImport,
    isBulkImporting,
    resetData
  } = useBulkTimeEntryImport();

  const downloadTemplate = () => {
    const templateData = [
      {
        'Employee Email': 'employee@company.com',
        'Work Order #': 'WO-2024-001',
        'Date': '2024-01-15',
        'Start Time': '08:00',
        'End Time': '17:00',
        'Hours': '8.0',
        'Description': 'Performed maintenance tasks'
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Template');
    
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'time_entry_template.xlsx';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const handleFileUpload = async (files: File[]) => {
    const file = files[0];
    if (!file) return;

    setCsvFile(file);
    setStep('preview');
  };

  const handleImport = async () => {
    if (!validationResults) return;

    const validEntries = validationResults.filter(result => result.isValid);
    if (validEntries.length === 0) return;

    setStep('importing');

    try {
      const results = await bulkImport(validEntries.map(entry => entry.data));
      setImportResults(results);
      setStep('results');
      
      if (results.success > 0 && onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Import failed:', error);
      setImportResults({
        success: 0,
        failed: validEntries.length,
        errors: ['Import failed: ' + (error as Error).message]
      });
      setStep('results');
    }
  };

  const handleClose = () => {
    setStep('upload');
    setCsvFile(null);
    resetData();
    setImportResults({ success: 0, failed: 0, errors: [] });
    onOpenChange(false);
  };

  const validEntries = validationResults?.filter(result => result.isValid) || [];
  const invalidEntries = validationResults?.filter(result => !result.isValid) || [];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Import Time Entries from CSV
          </DialogTitle>
          <DialogDescription>
            Upload a CSV file to bulk import time entries for employees
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {step === 'upload' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Step 1: Download Template & Upload CSV</h3>
                <Button onClick={downloadTemplate} variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Download Template
                </Button>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Download the template to see the required CSV format. Include columns: Employee Email, Work Order #, Date, Start Time (HH:MM), End Time (HH:MM), Hours, Description. Hours will be calculated from start/end times if provided.
                </AlertDescription>
              </Alert>

              <UnifiedFileUpload
                acceptedTypes={['.csv', '.xlsx', '.xls']}
                maxFiles={1}
                onFilesSelected={handleFileUpload}
                className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8"
              />
            </div>
          )}

          {step === 'preview' && csvFile && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Step 2: Review & Validate Data</h3>
                <div className="text-sm text-muted-foreground">
                  File: {csvFile.name}
                </div>
              </div>

              {isValidating && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                  Validating data...
                </div>
              )}

              <CSVPreviewTable
                file={csvFile}
                validationResults={validationResults}
              />

              {validationResults && validationResults.length > 0 && (
                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="flex gap-4 text-sm">
                    <span className="text-green-600">
                      ✓ {validEntries.length} valid entries
                    </span>
                    {invalidEntries.length > 0 && (
                      <span className="text-red-600">
                        ✗ {invalidEntries.length} invalid entries
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => setStep('upload')} variant="outline">
                      Back
                    </Button>
                    <Button
                      onClick={handleImport}
                      disabled={validEntries.length === 0}
                    >
                      Import {validEntries.length} Entries
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 'importing' && (
            <div className="space-y-4 text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <h3 className="text-lg font-medium">Importing Time Entries...</h3>
              <p className="text-muted-foreground">
                Processing {validEntries.length} entries. Please wait...
              </p>
            </div>
          )}

          {step === 'results' && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Import Results</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    <strong>{importResults.success}</strong> entries imported successfully
                  </AlertDescription>
                </Alert>

                {importResults.failed > 0 && (
                  <Alert className="border-red-200 bg-red-50">
                    <AlertCircle className="h-4 w-4 text-red-600" />
                    <AlertDescription className="text-red-800">
                      <strong>{importResults.failed}</strong> entries failed to import
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              {importResults.errors.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-destructive">Errors:</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                    {importResults.errors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button onClick={handleClose}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}