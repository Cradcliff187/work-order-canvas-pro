import React from 'react';
import { useNavigate } from 'react-router-dom';
import { SmartReceiptFlow } from '@/components/receipts/SmartReceiptFlow';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function AdminReceiptUpload() {
  const navigate = useNavigate();
  
  const handleBack = () => {
    navigate('/admin/receipts');
  };

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="text-2xl font-bold">Upload Receipt</CardTitle>
            <p className="text-muted-foreground mt-1">
              Upload and process a receipt with OCR assistance
            </p>
          </div>
          <Button 
            variant="outline" 
            onClick={handleBack}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Receipts
          </Button>
        </CardHeader>
      </Card>

      {/* Admin context wrapper - SmartReceiptFlow handles all the upload/OCR logic */}
      <div className="admin-receipt-upload-context">
        <SmartReceiptFlow />
      </div>
    </div>
  );
}