import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useMigrationStatus } from '@/hooks/useMigrationStatus';
import { useMigrationRepair } from '@/hooks/useMigrationRepair';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { 
  CheckCircle, 
  AlertTriangle, 
  Users, 
  Building, 
  RefreshCw,
  Wrench
} from 'lucide-react';

export const MigrationStatusDashboard: React.FC = () => {
  const { data: status, isLoading, error } = useMigrationStatus();
  const { repairProfile, syncAllProfiles, isRepairing, isSyncing } = useMigrationRepair();

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Failed to load migration status: {error.message}
        </AlertDescription>
      </Alert>
    );
  }

  if (!status) return null;

  const migrationHealth = status.inconsistencies.length === 0 ? 'healthy' : 'needs-attention';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Migration Status Dashboard</h2>
          <p className="text-muted-foreground">
            Monitor the organization-based authentication migration
          </p>
        </div>
        <Badge 
          variant={migrationHealth === 'healthy' ? 'default' : 'destructive'}
          className="text-sm"
        >
          {migrationHealth === 'healthy' ? (
            <>
              <CheckCircle className="h-4 w-4 mr-1" />
              Migration Healthy
            </>
          ) : (
            <>
              <AlertTriangle className="h-4 w-4 mr-1" />
              Needs Attention
            </>
          )}
        </Badge>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Profiles</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{status.totalProfiles}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Organization Members</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{status.totalOrganizationMembers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Migrated Users</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {status.profilesWithOrganizations}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Issues Found</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {status.inconsistencies.length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      {status.syncRequired && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              Migration Actions
            </CardTitle>
            <CardDescription>
              Fix inconsistencies and sync profiles with organization memberships
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={() => syncAllProfiles()}
              disabled={isSyncing}
              className="w-full"
            >
              {isSyncing ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Syncing All Profiles...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Sync All Profiles
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Issues Details */}
      {status.inconsistencies.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Migration Issues</CardTitle>
            <CardDescription>
              Profiles that need attention during migration
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {status.inconsistencies.map((issue, index) => (
                <div 
                  key={index}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex-1">
                    <p className="font-medium">{issue.email}</p>
                    <p className="text-sm text-muted-foreground">{issue.issue}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => repairProfile(issue.profileId)}
                    disabled={isRepairing}
                  >
                    {isRepairing ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      'Repair'
                    )}
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};