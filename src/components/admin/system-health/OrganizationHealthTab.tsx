import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TableActionsDropdown } from '@/components/ui/table-actions-dropdown';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { 
  AlertTriangle, 
  CheckCircle, 
  Users, 
  Wrench, 
  Eye, 
  Download,
  RefreshCw,
  Shield,
  User
} from 'lucide-react';

interface UserIssue {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  user_type: 'admin' | 'partner' | 'subcontractor' | 'employee';
  is_active: boolean;
  organization_count: number;
  organizations: Array<{ id: string; name: string }>;
  work_order_assignments?: Array<{ 
    work_order_id: string; 
    assigned_organization_id: string; 
    organization_name: string; 
  }>;
}

interface DiagnosticSummary {
  total_users: number;
  users_with_no_orgs: number;
  users_with_multiple_orgs: number;
  subcontractors_with_issues: number;
}

export const OrganizationHealthTab = () => {
  const { profile } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isFixing, setIsFixing] = useState(false);
  const [usersWithIssues, setUsersWithIssues] = useState<UserIssue[]>([]);
  const [summary, setSummary] = useState<DiagnosticSummary | null>(null);
  const [lastRefresh, setLastRefresh] = useState<string | null>(null);
  const [currentUserInfo, setCurrentUserInfo] = useState<any>(null);
  const { toast } = useToast();

  const fetchCurrentUserInfo = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const userInfo = {
        auth_uid: user?.id,
        email: user?.email,
        profile: profile,
        created_at: user?.created_at
      };

      setCurrentUserInfo(userInfo);
      return userInfo;
    } catch (error) {
      console.error('Failed to fetch user info:', error);
      return null;
    }
  };

  const fetchDiagnostics = async () => {
    setIsLoading(true);
    try {
      // Query users with organization count != 1 (excluding admins)
      const { data: usersQuery, error: usersError } = await supabase
        .from('profiles')
        .select(`
          id,
          email,
          first_name,
          last_name,
          user_type,
          is_active,
          user_organizations!inner (
            organization_id,
            organizations (
              id,
              name
            )
          )
        `)
        .neq('user_type', 'admin');

      if (usersError) throw usersError;

      // Get organization counts per user
      const { data: orgCounts, error: countsError } = await supabase
        .from('user_organizations')
        .select('user_id')
        .then(({ data }) => {
          const counts: Record<string, number> = {};
          data?.forEach(uo => {
            counts[uo.user_id] = (counts[uo.user_id] || 0) + 1;
          });
          return { data: counts, error: null };
        });

      if (countsError) throw countsError;

      // Get all non-admin users
      const { data: allUsers, error: allUsersError } = await supabase
        .from('profiles')
        .select('*')
        .neq('user_type', 'admin');

      if (allUsersError) throw allUsersError;

      // Identify users with issues
      const usersWithIssues: UserIssue[] = [];
      let noOrgCount = 0;
      let multipleOrgCount = 0;
      let subcontractorIssueCount = 0;

      for (const user of allUsers) {
        const orgCount = orgCounts[user.id] || 0;
        
        if (orgCount !== 1) {
          // Get user's organizations
          const { data: userOrgs } = await supabase
            .from('user_organizations')
            .select(`
              organization_id,
              organizations (
                id,
                name
              )
            `)
            .eq('user_id', user.id);

          const organizations = userOrgs?.map(uo => ({
            id: uo.organizations.id,
            name: uo.organizations.name
          })) || [];

          let workOrderAssignments = [];
          
          // For subcontractors, fetch their work order assignments
          if (user.user_type === 'subcontractor') {
            const { data: assignments } = await supabase
              .from('work_order_assignments')
              .select(`
                work_order_id,
                assigned_organization_id,
                organizations (
                  name
                )
              `)
              .eq('assigned_to', user.id)
              .not('assigned_organization_id', 'is', null);

            workOrderAssignments = assignments?.map(a => ({
              work_order_id: a.work_order_id,
              assigned_organization_id: a.assigned_organization_id,
              organization_name: a.organizations?.name || 'Unknown'
            })) || [];

            if (orgCount !== 1) subcontractorIssueCount++;
          }

          usersWithIssues.push({
            ...user,
            organization_count: orgCount,
            organizations,
            work_order_assignments: workOrderAssignments
          });

          if (orgCount === 0) noOrgCount++;
          if (orgCount > 1) multipleOrgCount++;
        }
      }

      setUsersWithIssues(usersWithIssues);
      setSummary({
        total_users: allUsers.length,
        users_with_no_orgs: noOrgCount,
        users_with_multiple_orgs: multipleOrgCount,
        subcontractors_with_issues: subcontractorIssueCount
      });

      setLastRefresh(new Date().toISOString());
    } catch (error) {
      console.error('Error fetching diagnostics:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch organization diagnostics',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fixAllIssues = async () => {
    setIsFixing(true);
    try {
      // Use the existing database function to fix organization assignments
      const { data, error } = await supabase.rpc('ensure_single_organization_assignment');
      
      if (error) throw error;

      toast({
        title: 'Fix Applied',
        description: `Fixed ${(data as any)?.cleaned_up_users || 0} users with organization issues`,
      });

      // Refresh diagnostics
      await fetchDiagnostics();
    } catch (error) {
      console.error('Error fixing issues:', error);
      toast({
        title: 'Error',
        description: 'Failed to fix organization issues',
        variant: 'destructive'
      });
    } finally {
      setIsFixing(false);
    }
  };

  const fixIndividualUser = async (userId: string) => {
    try {
      // Use the AuthContext auto-fix logic for individual user
      const { data: orgCheck } = await supabase
        .from('user_organizations')
        .select('organization_id')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (!orgCheck) {
        // Try to fix from work order assignments
        const { data: assignment } = await supabase
          .from('work_order_assignments')
          .select('assigned_organization_id')
          .eq('assigned_to', userId)
          .not('assigned_organization_id', 'is', null)
          .limit(1)
          .maybeSingle();
        
        if (assignment?.assigned_organization_id) {
          await supabase
            .from('user_organizations')
            .insert({
              user_id: userId,
              organization_id: assignment.assigned_organization_id
            });
          
          toast({
            title: 'User Fixed',
            description: 'Organization assignment created successfully',
          });
          
          await fetchDiagnostics();
        } else {
          toast({
            title: 'No Fix Available',
            description: 'No work order assignments found to determine organization',
            variant: 'destructive'
          });
        }
      }
    } catch (error) {
      console.error('Error fixing individual user:', error);
      toast({
        title: 'Error',
        description: 'Failed to fix user organization',
        variant: 'destructive'
      });
    }
  };

  const exportDiagnostics = () => {
    const csvContent = [
      ['Email', 'Name', 'User Type', 'Organization Count', 'Organizations', 'Work Order Assignments'].join(','),
      ...usersWithIssues.map(user => [
        user.email,
        `${user.first_name} ${user.last_name}`,
        user.user_type,
        user.organization_count.toString(),
        user.organizations.map(org => org.name).join('; '),
        user.work_order_assignments?.map(a => a.organization_name).join('; ') || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `organization-diagnostics-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    fetchDiagnostics();
    fetchCurrentUserInfo();
  }, []);

  const getIssueType = (user: UserIssue) => {
    if (user.organization_count === 0) return 'No Organization';
    if (user.organization_count > 1) return 'Multiple Organizations';
    return 'Unknown Issue';
  };

  const getIssueVariant = (user: UserIssue) => {
    if (user.organization_count === 0) return 'destructive';
    if (user.organization_count > 1) return 'secondary';
    return 'outline';
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-[500px] mt-2" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-10 w-20" />
            <Skeleton className="h-10 w-20" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current User Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Current User Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          {currentUserInfo ? (
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="font-medium">Auth UID:</span>
                <span className="text-sm font-mono">{currentUserInfo.auth_uid}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Email:</span>
                <span className="text-sm">{currentUserInfo.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Profile ID:</span>
                <span className="text-sm font-mono">{currentUserInfo.profile?.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">User Type:</span>
                <Badge>{currentUserInfo.profile?.user_type}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Full Name:</span>
                <span className="text-sm">{currentUserInfo.profile?.first_name} {currentUserInfo.profile?.last_name}</span>
              </div>
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-4">
              Loading user information...
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Organization Diagnostics</h2>
          <p className="text-muted-foreground">
            Identify and fix users with organization assignment issues
          </p>
          {lastRefresh && (
            <p className="text-sm text-muted-foreground mt-1">
              Last updated: {new Date(lastRefresh).toLocaleString()}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchDiagnostics} disabled={isLoading}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button variant="outline" onClick={exportDiagnostics} disabled={usersWithIssues.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button 
            onClick={fixAllIssues} 
            disabled={isFixing || usersWithIssues.length === 0}
            className="bg-primary hover:bg-primary/90"
          >
            {isFixing ? (
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Wrench className="mr-2 h-4 w-4" />
            )}
            Fix All Issues
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center">
                <Users className="h-4 w-4 text-muted-foreground mr-2" />
                <span className="text-2xl font-bold">{summary.total_users}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-destructive">No Organizations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center">
                <AlertTriangle className="h-4 w-4 text-destructive mr-2" />
                <span className="text-2xl font-bold">{summary.users_with_no_orgs}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-warning">Multiple Organizations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center">
                <Shield className="h-4 w-4 text-warning mr-2" />
                <span className="text-2xl font-bold">{summary.users_with_multiple_orgs}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-primary">Subcontractor Issues</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center">
                <CheckCircle className="h-4 w-4 text-primary mr-2" />
                <span className="text-2xl font-bold">{summary.subcontractors_with_issues}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Issues Table */}
      <Card>
        <CardHeader>
          <CardTitle>Users with Organization Issues</CardTitle>
          <CardDescription>
            {usersWithIssues.length === 0 
              ? "No organization issues found. All users have exactly one organization assignment."
              : `Found ${usersWithIssues.length} users with organization assignment issues.`
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {usersWithIssues.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="mx-auto h-12 w-12 text-success mb-4" />
              <h3 className="text-lg font-medium mb-2">All Good!</h3>
              <p className="text-muted-foreground">No organization assignment issues detected.</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Issue</TableHead>
                    <TableHead>Current Organizations</TableHead>
                    <TableHead>Work Order Assignments</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usersWithIssues.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{user.first_name} {user.last_name}</div>
                          <div className="text-sm text-muted-foreground">{user.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {user.user_type.charAt(0).toUpperCase() + user.user_type.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getIssueVariant(user)}>
                          {getIssueType(user)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {user.organizations.length === 0 ? (
                          <span className="text-muted-foreground">None</span>
                        ) : (
                          <div className="space-y-1">
                            {user.organizations.map(org => (
                              <div key={org.id} className="text-sm">{org.name}</div>
                            ))}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {user.work_order_assignments && user.work_order_assignments.length > 0 ? (
                          <div className="space-y-1">
                            {user.work_order_assignments.map((assignment, idx) => (
                              <div key={idx} className="text-sm">{assignment.organization_name}</div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">None</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <TableActionsDropdown
                          actions={[
                            {
                              label: 'Fix User',
                              icon: Wrench,
                              onClick: () => fixIndividualUser(user.id),
                              show: user.organization_count === 0
                            },
                            {
                              label: 'View Details',
                              icon: Eye,
                              onClick: () => console.log('View user details:', user)
                            }
                          ]}
                          itemName={`${user.first_name} ${user.last_name}`}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};