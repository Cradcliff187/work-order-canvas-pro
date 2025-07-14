import React from 'react';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { OrganizationErrorScreen } from '@/components/OrganizationErrorScreen';
import { useOrganizationGuard } from '@/hooks/useOrganizationGuard';

interface SingleOrganizationGuardProps {
  children: React.ReactNode;
  userType: 'partner' | 'subcontractor';
}

export const SingleOrganizationGuard: React.FC<SingleOrganizationGuardProps> = ({
  children,
  userType,
}) => {
  const { shouldBlock, isLoading, errorType, organizations } = useOrganizationGuard();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (shouldBlock && errorType) {
    return (
      <OrganizationErrorScreen
        type={errorType}
        organizations={organizations}
        userType={userType}
      />
    );
  }

  return <>{children}</>;
};