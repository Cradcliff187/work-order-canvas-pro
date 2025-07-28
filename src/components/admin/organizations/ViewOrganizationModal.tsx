
import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, Mail, Phone, MapPin, Hash, Users, FileText, Activity } from 'lucide-react';
import { Organization } from '@/hooks/useOrganizations';
import { format } from 'date-fns';

interface ViewOrganizationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organization: Organization | null;
  onEdit: () => void;
}

export function ViewOrganizationModal({ open, onOpenChange, organization, onEdit }: ViewOrganizationModalProps) {
  if (!organization) return null;

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'partner':
        return 'bg-blue-100 text-blue-800 hover:bg-blue-100';
      case 'subcontractor':
        return 'bg-green-100 text-green-800 hover:bg-green-100';
      case 'internal':
        return 'bg-purple-100 text-purple-800 hover:bg-purple-100';
      default:
        return 'bg-gray-100 text-gray-800 hover:bg-gray-100';
    }
  };

  const getStatusColor = (isActive: boolean) => {
    return isActive
      ? 'bg-green-100 text-green-800 hover:bg-green-100'
      : 'bg-red-100 text-red-800 hover:bg-red-100';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Organization Details
          </DialogTitle>
          <DialogDescription>
            View complete information for {organization.name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Information Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Building2 className="h-4 w-4" />
                Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Organization Name</label>
                  <p className="text-sm mt-1">{organization.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Type</label>
                  <div className="mt-1">
                    <Badge className={`${getTypeColor(organization.organization_type)} h-5 text-[10px] px-1.5`}>
                      {organization.organization_type.charAt(0).toUpperCase() + organization.organization_type.slice(1)}
                    </Badge>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Status</label>
                  <div className="mt-1">
                    <Badge className={`${getStatusColor(organization.is_active)} h-5 text-[10px] px-1.5`}>
                      {organization.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                    <Hash className="h-3 w-3" />
                    Initials
                  </label>
                  <p className="text-sm mt-1">{organization.initials || 'Not provided'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact Information Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Mail className="h-4 w-4" />
                Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  Email Address
                </label>
                <p className="text-sm mt-1">{organization.contact_email}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  Phone Number
                </label>
                <p className="text-sm mt-1">{organization.contact_phone || 'Not provided'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  Address
                </label>
                <p className="text-sm mt-1 whitespace-pre-line">{organization.address || 'Not provided'}</p>
              </div>
            </CardContent>
          </Card>

          {/* Statistics Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Activity className="h-4 w-4" />
                Statistics
              </CardTitle>
              <CardDescription>
                Overview of organization activity and relationships
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <Users className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="text-2xl font-semibold">0</p>
                    <p className="text-sm text-muted-foreground">Users</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <FileText className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="text-2xl font-semibold">0</p>
                    <p className="text-sm text-muted-foreground">Work Orders</p>
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-muted-foreground">
                <div>
                  <span className="font-medium">Created:</span> {format(new Date(organization.created_at), 'MMM d, yyyy')}
                </div>
                <div>
                  <span className="font-medium">Last Updated:</span> {format(new Date(organization.updated_at), 'MMM d, yyyy')}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={onEdit}>
            Edit Organization
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
