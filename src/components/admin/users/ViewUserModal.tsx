
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { User, CheckCircle, XCircle, Mail, Phone, Building2, Calendar } from 'lucide-react';
import { User as UserType } from '@/hooks/useUsers';
import { formatDate } from '@/lib/utils/date';

interface ViewUserModalProps {
  user: UserType | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ViewUserModal({ user, isOpen, onClose }: ViewUserModalProps) {
  if (!user) return null;

  const getUserTypeColor = (userType: string) => {
    switch (userType) {
      case 'admin':
        return 'bg-red-100 text-red-800';
      case 'partner':
        return 'bg-blue-100 text-blue-800';
      case 'subcontractor':
        return 'bg-green-100 text-green-800';
      case 'employee':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            User Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <h2 className="text-xl font-semibold">
                {user.first_name} {user.last_name}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <Badge className={`${getUserTypeColor(user.user_type)} h-5 text-[10px] px-1.5`}>
                  {user.user_type}
                </Badge>
                <Badge variant={user.is_active ? 'default' : 'secondary'}>
                  {user.is_active ? (
                    <CheckCircle className="h-3 w-3 mr-1" />
                  ) : (
                    <XCircle className="h-3 w-3 mr-1" />
                  )}
                  {user.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{user.email}</span>
                </div>
                {user.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{user.phone}</span>
                  </div>
                )}
                {user.company_name && (
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{user.company_name}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Account Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    Created: {formatDate(user.created_at)}
                  </span>
                </div>
                {user.updated_at && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      Updated: {formatDate(user.updated_at)}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {user.user_organizations && user.user_organizations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Organizations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {user.user_organizations.map((userOrg, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{userOrg.organization.name}</span>
                      <Badge variant="outline" className="h-5 text-[10px] px-1.5">
                        {userOrg.organization.organization_type}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
