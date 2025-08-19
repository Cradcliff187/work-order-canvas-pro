import React from 'react';
import { LifecycleTestRunner } from '@/components/testing/LifecycleTestRunner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Activity, 
  Database, 
  Upload, 
  FileText, 
  Users, 
  Shield,
  CheckCircle
} from 'lucide-react';

export default function TestingPage() {
  const testCategories = [
    {
      icon: <Activity className="h-5 w-5" />,
      title: 'Work Order Lifecycle',
      description: 'End-to-end workflow from creation to completion',
      status: 'ready'
    },
    {
      icon: <Database className="h-5 w-5" />,
      title: 'Data Integrity',
      description: 'Validates relationships and constraints',
      status: 'ready'
    },
    {
      icon: <Upload className="h-5 w-5" />,
      title: 'File Upload',
      description: 'Storage integration and file handling',
      status: 'ready'
    },
    {
      icon: <FileText className="h-5 w-5" />,
      title: 'Report Generation',
      description: 'PDF creation and database storage',
      status: 'ready'
    },
    {
      icon: <Users className="h-5 w-5" />,
      title: 'User Access Control',
      description: 'Role-based permissions and security',
      status: 'ready'
    },
    {
      icon: <Shield className="h-5 w-5" />,
      title: 'Assignment System',
      description: 'Work order assignment and tracking',
      status: 'ready'
    }
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">System Testing Dashboard</h1>
        <p className="text-muted-foreground">
          Comprehensive testing suite for work order management system
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {testCategories.map((category, index) => (
          <Card key={index} className="relative">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="flex items-center space-x-2">
                {category.icon}
                <CardTitle className="text-sm font-medium">
                  {category.title}
                </CardTitle>
              </div>
              <Badge variant="outline" className="text-xs">
                <CheckCircle className="h-3 w-3 mr-1" />
                {category.status}
              </Badge>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                {category.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <LifecycleTestRunner />
    </div>
  );
}