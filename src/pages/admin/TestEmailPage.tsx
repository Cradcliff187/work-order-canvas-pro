
import React from 'react';
import AdminLayout from '@/components/AdminLayout';
import { EmailTestingPanel } from '@/components/admin/EmailTestingPanel';
import { EmailSystemTest } from '@/components/admin/EmailSystemTest';

export default function TestEmailPage() {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Email System Testing</h1>
          <p className="text-muted-foreground">
            Test and validate the unified email system functionality
          </p>
        </div>
        
        <EmailSystemTest />
        <EmailTestingPanel />
      </div>
    </AdminLayout>
  );
}
