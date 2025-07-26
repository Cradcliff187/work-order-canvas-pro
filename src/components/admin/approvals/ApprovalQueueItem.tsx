import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ApprovalItem } from '@/hooks/useApprovalQueue';

interface ApprovalQueueItemProps {
  item: ApprovalItem;
  onApprove: (item: ApprovalItem) => void;
  onReject: (item: ApprovalItem) => void;
  onView: (item: ApprovalItem) => void;
  loading?: boolean;
}

export function ApprovalQueueItem({ 
  item, 
  onApprove, 
  onReject, 
  onView, 
  loading = false 
}: ApprovalQueueItemProps) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        {/* Header row */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Badge variant={item.type === 'report' ? 'secondary' : 'default'}>
              {item.type === 'report' ? 'Report' : 'Invoice'}
            </Badge>
            {item.urgency === 'high' && (
              <div className="flex items-center gap-1">
                <div className="h-2 w-2 bg-red-500 rounded-full animate-pulse" />
                <span className="text-xs text-red-600">Urgent</span>
              </div>
            )}
          </div>
          <span className="text-sm text-muted-foreground">
            {formatDistanceToNow(new Date(item.submittedAt), { addSuffix: true })}
          </span>
        </div>
        
        {/* Content */}
        <h4 className="font-medium mb-1">{item.title}</h4>
        <p className="text-sm text-muted-foreground">
          Submitted by {item.submittedBy}
        </p>
        {item.type === 'invoice' && item.amount && (
          <p className="text-sm font-medium mt-1 text-green-600">
            ${item.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
        )}
        
        {/* Actions */}
        <div className="flex items-center gap-2 mt-4">
          <Button 
            variant="outline"
            size="sm"
            onClick={() => onView(item)}
            disabled={loading}
            aria-label={`View details for ${item.title}`}
          >
            <Eye className="h-4 w-4 mr-2" />
            View Details
          </Button>

          <Button 
            variant="default"
            size="sm"
            onClick={() => onApprove(item)}
            disabled={loading}
            aria-label={`Approve ${item.title}`}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Approving...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Approve
              </>
            )}
          </Button>

          <Button 
            variant="destructive"
            size="sm"
            onClick={() => onReject(item)}
            disabled={loading}
            aria-label={`Reject ${item.title}`}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Rejecting...
              </>
            ) : (
              <>
                <XCircle className="h-4 w-4 mr-2" />
                Reject
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}