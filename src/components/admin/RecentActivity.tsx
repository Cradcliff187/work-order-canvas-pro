
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

interface ActivityItem {
  id: string;
  title?: string;
  work_order_number?: string;
  work_order_title?: string;
  status: string;
  created_at?: string;
  submitted_at?: string;
  assigned_to_name?: string;
  subcontractor_name?: string;
}

interface RecentActivityProps {
  title: string;
  items: ActivityItem[];
  type: 'work-orders' | 'reports';
  isLoading: boolean;
}

const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case 'received':
      return 'bg-blue-100 text-blue-800';
    case 'assigned':
      return 'bg-yellow-100 text-yellow-800';
    case 'in_progress':
      return 'bg-orange-100 text-orange-800';
    case 'completed':
      return 'bg-green-100 text-green-800';
    case 'submitted':
      return 'bg-blue-100 text-blue-800';
    case 'approved':
      return 'bg-green-100 text-green-800';
    case 'rejected':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export const RecentActivity: React.FC<RecentActivityProps> = ({
  title,
  items,
  type,
  isLoading
}) => {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-muted-foreground text-sm">No recent activity</p>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <p className="font-medium text-sm">
                    {type === 'work-orders' 
                      ? `${item.work_order_number} - ${item.title}`
                      : `${item.work_order_number} - ${item.work_order_title}`
                    }
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {type === 'work-orders' && item.assigned_to_name && (
                      <span>Assigned to: {item.assigned_to_name} • </span>
                    )}
                    {type === 'reports' && item.subcontractor_name && (
                      <span>By: {item.subcontractor_name} • </span>
                    )}
                    {format(
                      new Date(item.created_at || item.submitted_at || ''), 
                      'MMM dd, yyyy'
                    )}
                  </p>
                </div>
                <Badge 
                  variant="secondary" 
                  className={getStatusColor(item.status)}
                >
                  {item.status.replace('_', ' ').toUpperCase()}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
