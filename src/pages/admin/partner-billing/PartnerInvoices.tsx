import React from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function PartnerInvoices() {
  const navigate = useNavigate();
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Partner Invoices</h1>
          <p className="text-muted-foreground">
            Manage invoices sent to partner organizations
          </p>
        </div>
        <Button onClick={() => navigate('/admin/partner-billing/select-reports')}>
          <Plus className="h-4 w-4 mr-2" />
          Create Invoice
        </Button>
      </div>
    </div>
  );
}