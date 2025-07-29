import React from 'react';
import { MigrationStatusDashboard } from '@/components/admin/migration/MigrationStatusDashboard';
import { MigrationTestComponent } from '@/components/MigrationTestComponent';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const MigrationDashboard: React.FC = () => {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Migration Dashboard</h1>
        <p className="text-muted-foreground">
          Monitor and manage the organization-based authentication migration
        </p>
      </div>

      <Tabs defaultValue="status" className="space-y-6">
        <TabsList>
          <TabsTrigger value="status">Migration Status</TabsTrigger>
          <TabsTrigger value="testing">System Testing</TabsTrigger>
        </TabsList>

        <TabsContent value="status">
          <MigrationStatusDashboard />
        </TabsContent>

        <TabsContent value="testing">
          <MigrationTestComponent />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MigrationDashboard;