import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

export const OrganizationAssignmentHelper = () => {
  const queryClient = useQueryClient();
  
  const handleRefresh = () => {
    // Force refresh user organizations
    queryClient.invalidateQueries({ queryKey: ['user-organizations'] });
    window.location.reload();
  };

  return (
    <Card className="max-w-md mx-auto mt-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-yellow-500" />
          Organization Setup Needed
        </CardTitle>
        <CardDescription>
          We're updating your organization assignment. This usually takes just a moment.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          If you continue to see this message, your administrator may need to complete your account setup.
        </p>
        <Button onClick={handleRefresh} className="w-full">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh Organization
        </Button>
      </CardContent>
    </Card>
  );
};