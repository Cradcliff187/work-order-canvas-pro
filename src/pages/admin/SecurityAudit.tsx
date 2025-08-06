import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SecurityTestingPanel } from '@/components/admin/SecurityTestingPanel';
import { AttachmentSecurityAudit } from '@/components/admin/AttachmentSecurityAudit';

export default function SecurityAudit() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Security Audit</h1>
        <p className="text-muted-foreground">
          Monitor and test attachment security controls
        </p>
      </div>

      <Tabs defaultValue="testing" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="testing">Security Testing</TabsTrigger>
          <TabsTrigger value="audit">Attachment Audit</TabsTrigger>
        </TabsList>
        
        <TabsContent value="testing" className="space-y-6">
          <SecurityTestingPanel />
        </TabsContent>
        
        <TabsContent value="audit" className="space-y-6">
          <AttachmentSecurityAudit />
        </TabsContent>
      </Tabs>
    </div>
  );
}