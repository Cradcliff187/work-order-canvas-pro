import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';

export function DebugProfile() {
  const { user, profile } = useAuth();
  
  return (
    <Card className="m-4 p-4 bg-yellow-50">
      <CardContent>
        <h3 className="font-bold">Debug Info</h3>
        <p>Logged in as: {user?.email}</p>
        <p>Profile ID: {profile?.id}</p>
        <p>Profile Email: {profile?.email}</p>
        <p>Has Employee Flag: {profile?.is_employee ? 'Yes' : 'No'}</p>
        <p>Hourly Rate: ${profile?.hourly_cost_rate || 'NOT SET'}</p>
      </CardContent>
    </Card>
  );
}