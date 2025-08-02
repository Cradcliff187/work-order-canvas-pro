import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Users, Clock, CheckCircle } from 'lucide-react';

interface OrganizationMember {
  id: string;
  first_name: string;
  last_name: string;
  avatar_url?: string;
  is_active: boolean;
  active_work_orders: number;
  completed_this_month: number;
  last_activity?: string;
}

interface OrganizationMembersCardProps {
  members: OrganizationMember[];
  className?: string;
  currentUserId?: string;
}

export function OrganizationMembersCard({ 
  members, 
  className,
  currentUserId 
}: OrganizationMembersCardProps) {
  const activeMembersCount = members.filter(m => m.is_active).length;
  
  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Users className="h-4 w-4" />
          Team Members ({activeMembersCount})
        </CardTitle>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="space-y-3">
          {members.slice(0, 6).map((member) => (
            <div 
              key={member.id} 
              className={`flex items-center gap-3 ${
                member.id === currentUserId ? 'bg-primary/5 rounded-lg p-2 -m-2' : ''
              }`}
            >
              <Avatar className="h-8 w-8">
                <AvatarImage src={member.avatar_url} />
                <AvatarFallback className="text-xs">
                  {`${member.first_name[0]}${member.last_name[0]}`}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium truncate">
                    {member.first_name} {member.last_name}
                  </p>
                  {member.id === currentUserId && (
                    <Badge variant="outline" className="text-xs">You</Badge>
                  )}
                  {!member.is_active && (
                    <Badge variant="secondary" className="text-xs">Inactive</Badge>
                  )}
                </div>
                
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  {member.active_work_orders > 0 && (
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {member.active_work_orders} active
                    </div>
                  )}
                  
                  {member.completed_this_month > 0 && (
                    <div className="flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" />
                      {member.completed_this_month} completed
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {members.length > 6 && (
          <p className="text-xs text-muted-foreground text-center mt-3 pt-3 border-t">
            +{members.length - 6} more members
          </p>
        )}
      </CardContent>
    </Card>
  );
}