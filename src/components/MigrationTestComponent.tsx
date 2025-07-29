/**
 * Migration Test Component
 * Component to validate both legacy and new permission systems work correctly
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useEnhancedPermissions } from '@/hooks/useEnhancedPermissions';
import { useLegacyCompatibility } from '@/components/MigrationWrapper';
import { Permission } from '@/lib/permissions';

export const MigrationTestComponent: React.FC = () => {
  const legacyProfile = useUserProfile();
  const enhancedPermissions = useEnhancedPermissions();
  const compatibility = useLegacyCompatibility();

  return (
    <div className="p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Migration System Test</h1>
        <p className="text-muted-foreground">Validating both legacy and new permission systems</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Legacy System */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Legacy System
              <Badge variant="secondary">useUserProfile</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <strong>User Type:</strong> {legacyProfile.userType || 'N/A'}
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span>Admin:</span>
                <Badge variant={legacyProfile.isAdmin() ? 'default' : 'outline'}>
                  {legacyProfile.isAdmin() ? 'Yes' : 'No'}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <span>Employee:</span>
                <Badge variant={legacyProfile.isEmployee() ? 'default' : 'outline'}>
                  {legacyProfile.isEmployee() ? 'Yes' : 'No'}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <span>Partner:</span>
                <Badge variant={legacyProfile.isPartner() ? 'default' : 'outline'}>
                  {legacyProfile.isPartner() ? 'Yes' : 'No'}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <span>Subcontractor:</span>
                <Badge variant={legacyProfile.isSubcontractor() ? 'default' : 'outline'}>
                  {legacyProfile.isSubcontractor() ? 'Yes' : 'No'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Enhanced System */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Enhanced System
              <Badge variant="default">useEnhancedPermissions</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <strong>User Type:</strong> {enhancedPermissions.userType || 'N/A'}
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span>Admin:</span>
                <Badge variant={enhancedPermissions.isAdmin ? 'default' : 'outline'}>
                  {enhancedPermissions.isAdmin ? 'Yes' : 'No'}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <span>Employee:</span>
                <Badge variant={enhancedPermissions.isEmployee ? 'default' : 'outline'}>
                  {enhancedPermissions.isEmployee ? 'Yes' : 'No'}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <span>Partner:</span>
                <Badge variant={enhancedPermissions.isPartner ? 'default' : 'outline'}>
                  {enhancedPermissions.isPartner ? 'Yes' : 'No'}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <span>Subcontractor:</span>
                <Badge variant={enhancedPermissions.isSubcontractor ? 'default' : 'outline'}>
                  {enhancedPermissions.isSubcontractor ? 'Yes' : 'No'}
                </Badge>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span>Can Manage Users:</span>
                <Badge variant={enhancedPermissions.canManageUsers ? 'default' : 'outline'}>
                  {enhancedPermissions.canManageUsers ? 'Yes' : 'No'}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <span>Can View Financials:</span>
                <Badge variant={enhancedPermissions.canViewFinancialData ? 'default' : 'outline'}>
                  {enhancedPermissions.canViewFinancialData ? 'Yes' : 'No'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Migration State */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Migration State
              <Badge variant="outline">Feature Flags</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span>Organization Auth:</span>
                <Badge variant={enhancedPermissions.isUsingOrganizationAuth ? 'default' : 'outline'}>
                  {enhancedPermissions.isUsingOrganizationAuth ? 'Enabled' : 'Disabled'}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <span>Organization Permissions:</span>
                <Badge variant={enhancedPermissions.isUsingOrganizationPermissions ? 'default' : 'outline'}>
                  {enhancedPermissions.isUsingOrganizationPermissions ? 'Enabled' : 'Disabled'}
                </Badge>
              </div>
            </div>
            <div className="space-y-2">
              <div>
                <strong>Bridge API:</strong>
              </div>
              <div className="flex items-center gap-2">
                <span>Admin:</span>
                <Badge variant={compatibility.isAdmin ? 'default' : 'outline'}>
                  {compatibility.isAdmin ? 'Yes' : 'No'}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <span>Internal Access:</span>
                <Badge variant={compatibility.hasInternalAccess ? 'default' : 'outline'}>
                  {compatibility.hasInternalAccess ? 'Yes' : 'No'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Permission Comparison Table */}
      <Card>
        <CardHeader>
          <CardTitle>Permission Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-border">
              <thead>
                <tr className="bg-muted">
                  <th className="border border-border p-2 text-left">Permission</th>
                  <th className="border border-border p-2 text-center">Legacy</th>
                  <th className="border border-border p-2 text-center">Enhanced</th>
                  <th className="border border-border p-2 text-center">Match</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-border p-2">Is Admin</td>
                  <td className="border border-border p-2 text-center">
                    <Badge variant={legacyProfile.isAdmin() ? 'default' : 'outline'}>
                      {legacyProfile.isAdmin() ? 'Yes' : 'No'}
                    </Badge>
                  </td>
                  <td className="border border-border p-2 text-center">
                    <Badge variant={enhancedPermissions.isAdmin ? 'default' : 'outline'}>
                      {enhancedPermissions.isAdmin ? 'Yes' : 'No'}
                    </Badge>
                  </td>
                  <td className="border border-border p-2 text-center">
                    <Badge variant={legacyProfile.isAdmin() === enhancedPermissions.isAdmin ? 'default' : 'destructive'}>
                      {legacyProfile.isAdmin() === enhancedPermissions.isAdmin ? '✓' : '✗'}
                    </Badge>
                  </td>
                </tr>
                <tr>
                  <td className="border border-border p-2">Is Employee</td>
                  <td className="border border-border p-2 text-center">
                    <Badge variant={legacyProfile.isEmployee() ? 'default' : 'outline'}>
                      {legacyProfile.isEmployee() ? 'Yes' : 'No'}
                    </Badge>
                  </td>
                  <td className="border border-border p-2 text-center">
                    <Badge variant={enhancedPermissions.isEmployee ? 'default' : 'outline'}>
                      {enhancedPermissions.isEmployee ? 'Yes' : 'No'}
                    </Badge>
                  </td>
                  <td className="border border-border p-2 text-center">
                    <Badge variant={legacyProfile.isEmployee() === enhancedPermissions.isEmployee ? 'default' : 'destructive'}>
                      {legacyProfile.isEmployee() === enhancedPermissions.isEmployee ? '✓' : '✗'}
                    </Badge>
                  </td>
                </tr>
                <tr>
                  <td className="border border-border p-2">Can Manage Users</td>
                  <td className="border border-border p-2 text-center">
                    <Badge variant={legacyProfile.hasPermission('admin') ? 'default' : 'outline'}>
                      {legacyProfile.hasPermission('admin') ? 'Yes' : 'No'}
                    </Badge>
                  </td>
                  <td className="border border-border p-2 text-center">
                    <Badge variant={enhancedPermissions.canManageUsers ? 'default' : 'outline'}>
                      {enhancedPermissions.canManageUsers ? 'Yes' : 'No'}
                    </Badge>
                  </td>
                  <td className="border border-border p-2 text-center">
                    <Badge variant={legacyProfile.hasPermission('admin') === enhancedPermissions.canManageUsers ? 'default' : 'destructive'}>
                      {legacyProfile.hasPermission('admin') === enhancedPermissions.canManageUsers ? '✓' : '✗'}
                    </Badge>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};