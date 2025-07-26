import React, { useState } from 'react';
import { useUserProfile } from '@/hooks/useUserProfile';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, Users, Lock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface WorkOrderMessagesProps {
  workOrderId: string;
}

interface Message {
  id: string;
  message: string;
  is_internal: boolean;
  sender_id: string;
  sender_name: string;
  sender_organization: string;
  created_at: string;
}

export const WorkOrderMessages: React.FC<WorkOrderMessagesProps> = ({ workOrderId }) => {
  const { profile, isAdmin, isEmployee, isPartner, isSubcontractor } = useUserProfile();
  const [newMessage, setNewMessage] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Mock data for now - will be replaced with actual hooks
  const messages: Message[] = [
    {
      id: '1',
      message: 'Work order has been submitted. Please review and assign to appropriate team.',
      is_internal: false,
      sender_id: 'partner-1',
      sender_name: 'John Partner',
      sender_organization: 'ABC Property Management',
      created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
    },
    {
      id: '2',
      message: 'Assigning to Mike from Pipes & More. They have experience with similar issues.',
      is_internal: true,
      sender_id: 'admin-1',
      sender_name: 'Sarah Admin',
      sender_organization: 'WorkOrderPro Internal',
      created_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString()
    }
  ];

  // Determine which tabs to show based on user type
  const showPublicTab = isAdmin() || isEmployee() || isPartner();
  const showInternalTab = isAdmin() || isEmployee() || isSubcontractor();
  const canPostToPublic = isAdmin() || isEmployee() || isPartner();
  const canPostToInternal = isAdmin() || isEmployee() || isSubcontractor();

  // Filter messages based on tab
  const publicMessages = messages.filter(msg => !msg.is_internal);
  const internalMessages = messages.filter(msg => msg.is_internal);

  // Default tab based on user type
  const defaultTab = isPartner() ? 'public' : isSubcontractor() ? 'internal' : 'public';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    setIsSubmitting(true);
    try {
      // TODO: Implement usePostMessage hook
      console.log('Posting message:', { 
        workOrderId, 
        message: newMessage, 
        isInternal: isInternal && (isAdmin() || isEmployee())
      });
      
      setNewMessage('');
      setIsInternal(false);
    } catch (error) {
      console.error('Failed to post message:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderMessage = (message: Message) => (
    <div
      key={message.id}
      className={`p-4 rounded-lg border-l-4 ${
        message.is_internal
          ? 'bg-blue-50 border-l-blue-500'
          : 'bg-white border-l-primary'
      }`}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="font-medium text-foreground">
            {message.sender_name}
          </span>
          <Badge variant="outline" className="text-xs">
            {message.sender_organization}
          </Badge>
          {message.is_internal && (
            <Badge variant="secondary" className="text-xs flex items-center gap-1">
              <Lock className="h-3 w-3" />
              Internal
            </Badge>
          )}
        </div>
        <span className="text-xs text-muted-foreground">
          {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
        </span>
      </div>
      <p className="text-sm text-foreground whitespace-pre-wrap">
        {message.message}
      </p>
    </div>
  );

  const renderMessageList = (messageList: Message[], emptyMessage: string) => (
    <div className="space-y-4">
      {messageList.length > 0 ? (
        messageList.map(renderMessage)
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          <MessageCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>{emptyMessage}</p>
        </div>
      )}
    </div>
  );

  const renderMessageComposer = (forInternal: boolean) => {
    const canPost = forInternal ? canPostToInternal : canPostToPublic;
    
    if (!canPost) {
      return (
        <div className="p-4 bg-muted rounded-lg text-center text-muted-foreground">
          You don't have permission to post {forInternal ? 'internal notes' : 'public messages'}.
        </div>
      );
    }

    return (
      <form onSubmit={handleSubmit} className="space-y-4">
        <Textarea
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder={forInternal ? "Add an internal note..." : "Type your message..."}
          className="min-h-[100px] resize-none"
          disabled={isSubmitting}
        />
        
        {(isAdmin() || isEmployee()) && !forInternal && (
          <div className="flex items-center space-x-2">
            <Checkbox
              id="internal-note"
              checked={isInternal}
              onCheckedChange={(checked) => setIsInternal(checked as boolean)}
              disabled={isSubmitting}
            />
            <Label htmlFor="internal-note" className="text-sm font-medium">
              Make this an internal note (only visible to team and subcontractors)
            </Label>
          </div>
        )}
        
        <div className="flex justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setNewMessage('');
              setIsInternal(false);
            }}
            disabled={isSubmitting || !newMessage.trim()}
          >
            Clear
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting || !newMessage.trim()}
          >
            {isSubmitting ? 'Posting...' : 'Post Message'}
          </Button>
        </div>
      </form>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          Work Order Messages
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={defaultTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            {showPublicTab && (
              <TabsTrigger value="public" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Public Discussion
              </TabsTrigger>
            )}
            {showInternalTab && (
              <TabsTrigger value="internal" className="flex items-center gap-2">
                <Lock className="h-4 w-4" />
                Internal Notes
              </TabsTrigger>
            )}
          </TabsList>

          {showPublicTab && (
            <TabsContent value="public" className="space-y-6">
              <div>
                <h3 className="text-sm font-medium mb-4 text-muted-foreground">
                  Visible to partner organization and internal team
                </h3>
                {renderMessageList(publicMessages, "No public messages yet. Start the conversation!")}
              </div>
              {renderMessageComposer(false)}
            </TabsContent>
          )}

          {showInternalTab && (
            <TabsContent value="internal" className="space-y-6">
              <div>
                <h3 className="text-sm font-medium mb-4 text-muted-foreground">
                  Only visible to internal team and assigned subcontractors
                </h3>
                {renderMessageList(internalMessages, "No internal notes yet. Add a note to start tracking internal communication.")}
              </div>
              {renderMessageComposer(true)}
            </TabsContent>
          )}
        </Tabs>
      </CardContent>
    </Card>
  );
};