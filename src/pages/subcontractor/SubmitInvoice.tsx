import React, { useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useDropzone } from 'react-dropzone';
import { Upload, ArrowLeft, FileText, Loader2, Save } from 'lucide-react';
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import { useFormPersist } from "@/hooks/useFormPersist";
import StandardFormLayout from '@/components/layout/StandardFormLayout';
import { useSubmitInvoice } from '@/hooks/useSubmitInvoice';

interface InvoiceFormData {
  invoiceNumber: string;
  invoiceAmount: string;
  notes: string;
  workPerformed: string;
  materialsUsed: string;
}

export default function SubmitInvoice() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [formData, setFormData] = useState<InvoiceFormData>({
    invoiceNumber: '',
    invoiceAmount: '',
    notes: '',
    workPerformed: '',
    materialsUsed: '',
  });
  const [files, setFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Persist form data to local storage
  useFormPersist<InvoiceFormData>('invoiceFormData', formData, setFormData);

  const { mutate: submitInvoice, isLoading: isMutationLoading } = useSubmitInvoice({
    onSuccess: () => {
      toast({
        title: "Invoice submitted successfully!",
        description: "You will be redirected to the invoices page.",
      });
      setIsSubmitting(false);
      navigate('/subcontractor/invoices');
    },
    onError: (error: any) => {
      toast({
        title: "Error submitting invoice.",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
      setIsSubmitting(false);
    },
  });

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);

    const payload = {
      ...formData,
      files,
    };

    submitInvoice(payload);
  };

  const handleSaveDraft = () => {
    toast({
      title: "Draft saved!",
      description: "Your progress has been saved to local storage.",
    });
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles(prevFiles => [...prevFiles, ...acceptedFiles]);
  }, []);

  const {getRootProps, getInputProps, isDragActive} = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif'],
      'application/pdf': ['.pdf'],
    },
    maxSize: 10000000, // 10MB
  });

  const handleRemoveFile = (fileToRemove: File) => {
    setFiles(prevFiles => prevFiles.filter(file => file !== fileToRemove));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/subcontractor/invoices">
            <Button variant="outline" size="sm" className="min-h-[44px] sm:min-h-auto">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Invoices
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Submit Invoice</h1>
            <p className="text-muted-foreground">Submit your invoice for completed work</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <StandardFormLayout>
          <StandardFormLayout.Section 
            title="Invoice Details"
            description="Enter the details of your invoice"
          >
            <StandardFormLayout.FieldGroup>
              <div className="space-y-2">
                <Label htmlFor="invoiceNumber">Invoice Number *</Label>
                <Input
                  id="invoiceNumber"
                  placeholder="INV-2024-001"
                  value={formData.invoiceNumber}
                  onChange={(e) => setFormData(prev => ({ ...prev, invoiceNumber: e.target.value }))}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="invoiceAmount">Invoice Amount *</Label>
                <Input
                  id="invoiceAmount"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={formData.invoiceAmount}
                  onChange={(e) => setFormData(prev => ({ ...prev, invoiceAmount: e.target.value }))}
                  required
                />
              </div>
            </StandardFormLayout.FieldGroup>
          </StandardFormLayout.Section>

          <StandardFormLayout.Section 
            title="Work Details"
            description="Provide details about the work performed"
          >
            <StandardFormLayout.FieldGroup>
              <div className="space-y-2">
                <Label htmlFor="workPerformed">Work Performed *</Label>
                <Textarea
                  id="workPerformed"
                  placeholder="Describe the work you performed in detail..."
                  value={formData.workPerformed}
                  onChange={(e) => setFormData(prev => ({ ...prev, workPerformed: e.target.value }))}
                  className="min-h-[120px]"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="materialsUsed">Materials Used</Label>
                <Textarea
                  id="materialsUsed"
                  placeholder="List materials, parts, or supplies used..."
                  value={formData.materialsUsed}
                  onChange={(e) => setFormData(prev => ({ ...prev, materialsUsed: e.target.value }))}
                  className="min-h-[80px]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Additional Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Any additional information or observations..."
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  className="min-h-[80px]"
                />
              </div>
            </StandardFormLayout.FieldGroup>
          </StandardFormLayout.Section>

          <StandardFormLayout.Section 
            title="Photos & Documentation"
            description="Upload photos or documents related to the invoice"
          >
            <StandardFormLayout.FieldGroup>
              <div className="space-y-2">
                <Label>Upload Photos or Documents</Label>
                <div 
                  {...getRootProps()} 
                  className={cn(
                    "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
                    isDragActive ? "border-primary bg-primary/10" : "border-muted-foreground/25 hover:border-muted-foreground/50"
                  )}
                >
                  <input {...getInputProps()} />
                  <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    {isDragActive ? "Drop files here..." : "Drag & drop files here, or click to select"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    PNG, JPG, GIF, PDF up to 10MB each
                  </p>
                </div>
              </div>

              {files.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {files.map((file, index) => (
                    <Card key={index}>
                      <CardHeader className="flex items-center space-x-4">
                        <CardTitle className="text-sm font-medium truncate">{file.name}</CardTitle>
                      </CardHeader>
                      <CardContent className="flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">{file.type}</p>
                        <Button variant="ghost" size="sm" onClick={() => handleRemoveFile(file)}>
                          Remove
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </StandardFormLayout.FieldGroup>
          </StandardFormLayout.Section>

          <StandardFormLayout.Actions>
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleSaveDraft}
              disabled={isSubmitting}
              className="min-h-[44px]"
            >
              <Save className="h-4 w-4 mr-2" />
              Save Draft
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting}
              className="min-h-[44px]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4 mr-2" />
                  Submit Invoice
                </>
              )}
            </Button>
          </StandardFormLayout.Actions>
        </StandardFormLayout>
      </form>
    </div>
  );
}
