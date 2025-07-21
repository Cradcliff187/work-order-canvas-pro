
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useCreateUser } from '@/hooks/useUsers';
import { Loader2 } from 'lucide-react';

export function EmailTestingPanel() {
  const { toast } = useToast();
  const createUser = useCreateUser();
  
  const [testUserData, setTestUserData] = useState({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    user_type: 'employee' as const,
  });

  const handleCreateTestUser = async () => {
    if (!testUserData.email || !testUserData.password || !testUserData.first_name || !testUserData.last_name) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please fill in all required fields',
      });
      return;
    }

    try {
      await createUser.mutateAsync(testUserData);
      setTestUserData({
        email: '',
        password: '',
        first_name: '',
        last_name: '',
        user_type: 'employee',
      });
    } catch (error) {
      console.error('Error creating test user:', error);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Email Testing Panel</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Create Test User</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={testUserData.email}
                onChange={(e) => setTestUserData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="test@example.com"
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={testUserData.password}
                onChange={(e) => setTestUserData(prev => ({ ...prev, password: e.target.value }))}
                placeholder="Enter password"
              />
            </div>
            <div>
              <Label htmlFor="first_name">First Name</Label>
              <Input
                id="first_name"
                value={testUserData.first_name}
                onChange={(e) => setTestUserData(prev => ({ ...prev, first_name: e.target.value }))}
                placeholder="John"
              />
            </div>
            <div>
              <Label htmlFor="last_name">Last Name</Label>
              <Input
                id="last_name"
                value={testUserData.last_name}
                onChange={(e) => setTestUserData(prev => ({ ...prev, last_name: e.target.value }))}
                placeholder="Doe"
              />
            </div>
            <div>
              <Label htmlFor="user_type">User Type</Label>
              <Select 
                value={testUserData.user_type} 
                onValueChange={(value) => setTestUserData(prev => ({ ...prev, user_type: value as any }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="partner">Partner</SelectItem>
                  <SelectItem value="subcontractor">Subcontractor</SelectItem>
                  <SelectItem value="employee">Employee</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button 
            onClick={handleCreateTestUser}
            disabled={createUser.isPending}
            className="w-full"
          >
            {createUser.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Test User'
            )}
          </Button>
        </div>

        <Separator />

        <div className="space-y-4">
          <h3 className="text-lg font-medium">Email Templates</h3>
          <p className="text-sm text-muted-foreground">
            Email templates are managed through the system settings. Configure your email templates and test them here.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
