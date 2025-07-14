import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { useOrganizationValidation } from '@/hooks/useOrganizationValidation';

interface OrganizationValidationAlertProps {
  className?: string;
}

export const OrganizationValidationAlert: React.FC<OrganizationValidationAlertProps> = ({ 
  className 
}) => {
  const { shouldShowValidation, organizationCount, userType } = useOrganizationValidation();
  
  if (!shouldShowValidation) return null;
  
  return (
    <Alert variant="destructive" className={className}>
      <AlertCircle className="h-4 w-4" />
      <AlertDescription>
        <strong>Account Configuration Error:</strong> Your {userType} account has {organizationCount} organizations assigned, but should only have one. 
        Please contact your administrator to fix your account setup before proceeding.
      </AlertDescription>
    </Alert>
  );
};