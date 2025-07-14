import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building2, AlertTriangle, ArrowLeft, Mail } from 'lucide-react';

interface OrganizationErrorScreenProps {
  type: 'none' | 'multiple';
  organizations: Array<{
    id: string;
    name: string;
    organization_type: string;
  }>;
  userType: 'partner' | 'subcontractor';
}

export const OrganizationErrorScreen: React.FC<OrganizationErrorScreenProps> = ({
  type,
  organizations,
  userType,
}) => {
  const navigate = useNavigate();

  const handleBackToDashboard = () => {
    navigate(`/${userType}/dashboard`);
  };

  const handleContactAdmin = () => {
    // In a real app, this could open email client or redirect to support
    window.location.href = 'mailto:admin@workorderpro.com?subject=Organization Assignment Issue';
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto mb-4">
            {type === 'none' ? (
              <Building2 className="h-16 w-16 text-muted-foreground" />
            ) : (
              <AlertTriangle className="h-16 w-16 text-destructive" />
            )}
          </div>
          <CardTitle className="text-xl">
            {type === 'none' ? 'No Organization Assigned' : 'Multiple Organizations Detected'}
          </CardTitle>
          <CardDescription className="text-center">
            {type === 'none' ? (
              'Your account is not assigned to any organization. Please contact your administrator to set up your organization access.'
            ) : (
              `Your account has ${organizations.length} organizations assigned, but should only have one. Please contact your administrator to fix your account setup.`
            )}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {type === 'multiple' && organizations.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">Organizations:</h4>
              <div className="space-y-1">
                {organizations.map((org) => (
                  <div key={org.id} className="flex items-center gap-2 text-sm">
                    <Building2 className="h-3 w-3 text-muted-foreground" />
                    <span>{org.name}</span>
                    <span className="text-xs text-muted-foreground capitalize">
                      ({org.organization_type})
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2 pt-4">
            <Button onClick={handleContactAdmin} className="w-full">
              <Mail className="h-4 w-4 mr-2" />
              Contact Administrator
            </Button>
            
            <Button variant="outline" onClick={handleBackToDashboard} className="w-full">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};