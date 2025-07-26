import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useUserProfile } from '@/hooks/useUserProfile';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { MessageCircle, Users, Lock, Circle, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useWorkOrderMessages, WorkOrderMessage, WorkOrderMessagesResult } from '@/hooks/useWorkOrderMessages';
import { usePostMessage } from '@/hooks/usePostMessage';
import { useMessageSubscription } from '@/hooks/useMessageSubscription';
import { useOfflineMessageSync } from '@/hooks/useOfflineMessageSync';
import { useToast } from '@/hooks/use-toast';

interface WorkOrderMessagesProps {
  workOrderId: string;
}

export const WorkOrderMessages: React.FC<WorkOrderMessagesProps> = ({ workOrderId }) => {
  const { profile, isAdmin, isEmployee, isPartner, isSubcontractor } = useUserProfile();
  const { toast } = useToast();
  
  // Default tab based on user type
  const defaultTab = isPartner() ? 'public' : isSubcontractor() ? 'internal' : 'public';
  
  const [newMessage, setNewMessage] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [activeTab, setActiveTab] = useState(defaultTab);
  
  // Pagination state
  const [publicPage, setPublicPage] = useState(1);
  const [internalPage, setInternalPage] = useState(1);
  const [allPublicMessages, setAllPublicMessages] = useState<WorkOrderMessage[]>([]);
  const [allInternalMessages, setAllInternalMessages] = useState<WorkOrderMessage[]>([]);
  
  // Track which message IDs have been marked as read to prevent re-processing
  const [markedAsReadIds, setMarkedAsReadIds] = useState<Set<string>>(new Set());

  // Fetch messages using custom hooks
  const { data: publicData, isLoading: isLoadingPublic } = useWorkOrderMessages(workOrderId, false, publicPage);
  const { data: internalData, isLoading: isLoadingInternal } = useWorkOrderMessages(workOrderId, true, internalPage);
  const postMessage = usePostMessage();
  
  // Initialize offline message sync
  const { getQueuedMessages } = useOfflineMessageSync();
  
  // Request browser notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(console.error);
    }
  }, []);

  // Browser notification handler
  const handleBrowserNotification = useCallback(async (message: WorkOrderMessage) => {
    if (!profile?.id || message.sender_id === profile.id) return;
    
    try {
      // Only show browser notification if page is not focused
      if ('Notification' in window && 
          Notification.permission === 'granted' && 
          document.hidden) {
        
        // Fetch work order details for notification
        const { data: workOrder } = await supabase
          .from('work_orders')
          .select('work_order_number')
          .eq('id', workOrderId)
          .single();

        const workOrderNumber = workOrder?.work_order_number || workOrderId;
        const messagePreview = message.message.length > 100 
          ? `${message.message.substring(0, 100)}...`
          : message.message;

        new Notification(`New message in Work Order ${workOrderNumber}`, {
          body: messagePreview,
          icon: '/favicon.ico',
        });
      }
    } catch (error) {
      console.error('Failed to show browser notification:', error);
    }
  }, [profile?.id, workOrderId]);

  // Set up real-time subscription with browser notification callback
  useMessageSubscription(workOrderId, handleBrowserNotification, toast);

  // Handle pagination data updates
  useEffect(() => {
    if (publicData?.messages) {
      if (publicPage === 1) {
        setAllPublicMessages(publicData.messages);
      } else {
        setAllPublicMessages(prev => [...prev, ...publicData.messages]);
      }
    }
  }, [publicData, publicPage]);

  useEffect(() => {
    if (internalData?.messages) {
      if (internalPage === 1) {
        setAllInternalMessages(internalData.messages);
      } else {
        setAllInternalMessages(prev => [...prev, ...internalData.messages]);
      }
    }
  }, [internalData, internalPage]);

  // Reset pagination when work order changes
  useEffect(() => {
    setPublicPage(1);
    setInternalPage(1);
    setAllPublicMessages([]);
    setAllInternalMessages([]);
    setMarkedAsReadIds(new Set());
  }, [workOrderId]);

  // Load more messages functions
  const loadMorePublicMessages = useCallback(() => {
    if (publicData?.hasMore && !isLoadingPublic) {
      setPublicPage(prev => prev + 1);
    }
  }, [publicData?.hasMore, isLoadingPublic]);

  const loadMoreInternalMessages = useCallback(() => {
    if (internalData?.hasMore && !isLoadingInternal) {
      setInternalPage(prev => prev + 1);
    }
  }, [internalData?.hasMore, isLoadingInternal]);

  // Function to mark messages as read
  const markMessagesAsRead = useCallback(async (messages: WorkOrderMessage[]) => {
    if (!profile?.id || messages.length === 0) return;

    try {
      // Get unread message IDs
      const { data: existingReceipts } = await supabase
        .from('message_read_receipts')
        .select('message_id')
        .eq('user_id', profile.id)
        .in('message_id', messages.map(m => m.id));

      const readMessageIds = new Set(existingReceipts?.map(r => r.message_id) || []);
      const unreadMessages = messages.filter(m => !readMessageIds.has(m.id));

      if (unreadMessages.length > 0) {
        await supabase
          .from('message_read_receipts')
          .insert(
            unreadMessages.map(msg => ({
              message_id: msg.id,
              user_id: profile.id,
              read_at: new Date().toISOString()
            }))
          );
      }
    } catch (error) {
      console.log('Failed to mark messages as read:', error);
    }
  }, [profile?.id]);

  // Mark messages as read when tab changes or component mounts
  useEffect(() => {
    const messages = activeTab === 'public' ? allPublicMessages : allInternalMessages;
    const isLoading = activeTab === 'public' ? isLoadingPublic : isLoadingInternal;
    
    if (!isLoading && messages.length > 0) {
      // Filter out messages that have already been marked as read
      const newMessages = messages.filter(msg => !markedAsReadIds.has(msg.id));
      
      if (newMessages.length > 0) {
        markMessagesAsRead(newMessages);
        // Add the processed message IDs to the tracked set
        setMarkedAsReadIds(prev => {
          const newSet = new Set(prev);
          newMessages.forEach(msg => newSet.add(msg.id));
          return newSet;
        });
      }
    }
  }, [activeTab, allPublicMessages, allInternalMessages, isLoadingPublic, isLoadingInternal, markMessagesAsRead, markedAsReadIds]);

  // Determine which tabs to show based on user type
  const showPublicTab = isAdmin() || isEmployee() || isPartner();
  const showInternalTab = isAdmin() || isEmployee() || isSubcontractor();
  const canPostToPublic = isAdmin() || isEmployee() || isPartner();
  const canPostToInternal = isAdmin() || isEmployee() || isSubcontractor();

  // Calculate unread message counts for tab badges
  const { publicUnreadCount, internalUnreadCount } = useMemo(() => {
    if (!profile?.id || isLoadingPublic || isLoadingInternal) {
      return { publicUnreadCount: 0, internalUnreadCount: 0 };
    }

    const publicUnread = allPublicMessages.filter(
      msg => !msg.is_read && msg.sender_id !== profile.id
    ).length;

    const internalUnread = allInternalMessages.filter(
      msg => !msg.is_read && msg.sender_id !== profile.id
    ).length;

    return { 
      publicUnreadCount: publicUnread, 
      internalUnreadCount: internalUnread 
    };
  }, [allPublicMessages, allInternalMessages, profile?.id, isLoadingPublic, isLoadingInternal]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      await postMessage.mutateAsync({
        workOrderId,
        message: newMessage,
        isInternal: isInternal && (isAdmin() || isEmployee()),
      });
      
      setNewMessage('');
      setIsInternal(false);
    } catch (error) {
      // Error is handled by the mutation hook
      console.error('Failed to post message:', error);
    }
  };

  const renderMessage = (message: WorkOrderMessage | any) => {
    const isOwnMessage = message.sender_id === profile?.id;
    const isUnread = !message.is_read && !isOwnMessage;
    const isQueued = message.isQueued || message.id?.startsWith('temp-');
    
    return (
      <div
        key={message.id}
        className={`p-4 rounded-lg border-l-4 transition-colors ${
          isQueued
            ? 'bg-amber-50 dark:bg-amber-950/20 border-l-amber-500'
            : isUnread 
              ? 'bg-blue-50 dark:bg-blue-950/20 border-l-blue-500' 
              : message.is_internal
                ? 'bg-[#EFF8FF] border-l-[#0485EA]'
                : 'bg-white border-l-[#0485EA]'
        }`}
      >
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            {isQueued && (
              <Clock className="h-3 w-3 text-amber-500 flex-shrink-0" />
            )}
            {isUnread && !isQueued && (
              <Circle className="h-2 w-2 fill-blue-500 text-blue-500 flex-shrink-0" />
            )}
            <span className={`text-foreground ${isUnread ? 'font-medium' : 'font-normal'}`}>
              {message.sender 
                ? `${message.sender.first_name} ${message.sender.last_name}`
                : 'Unknown User'
              }
            </span>
            <Badge variant="outline" className="text-xs">
              {message.sender_organization?.name || 'Internal Team'}
            </Badge>
            {message.is_internal && (
              <Badge variant="secondary" className="text-xs flex items-center gap-1">
                <Lock className="h-3 w-3" />
                Internal
              </Badge>
            )}
            {isQueued && (
              <Badge variant="outline" className="text-xs flex items-center gap-1 bg-amber-50 text-amber-700 border-amber-200">
                <Clock className="h-3 w-3" />
                Queued
              </Badge>
            )}
          </div>
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
          </span>
        </div>
        <p className={`text-sm text-foreground whitespace-pre-wrap ${isUnread ? 'font-medium' : 'font-normal'}`}>
          {message.message}
        </p>
        {isOwnMessage && message.total_recipients > 0 && (
          <div className="mt-2 pt-2 border-t border-muted">
            <span className="text-xs text-muted-foreground">
              Read by {message.read_count} of {message.total_recipients} recipients
            </span>
          </div>
        )}
      </div>
    );
  };

  const renderMessageList = (
    messageList: WorkOrderMessage[], 
    emptyMessage: string, 
    isLoading: boolean,
    hasMore: boolean,
    onLoadMore: () => void
  ) => (
    <div className="space-y-4">
      {/* Load More Button at the top */}
      {hasMore && messageList.length > 0 && (
        <div className="text-center">
          <Button 
            variant="outline" 
            onClick={onLoadMore}
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? 'Loading...' : 'Load More Messages'}
          </Button>
        </div>
      )}
      
      {isLoading && messageList.length === 0 ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="p-4 rounded-lg border-l-4 border-l-[#0485EA] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-16" />
                </div>
                <Skeleton className="h-3 w-16" />
              </div>
              <Skeleton className="h-12 w-full" />
            </div>
          ))}
        </div>
      ) : messageList.length > 0 ? (
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
            disabled={postMessage.isPending}
          />
        
        {(isAdmin() || isEmployee()) && !forInternal && (
          <div className="flex items-center space-x-2">
            <Checkbox
              id="internal-note"
              checked={isInternal}
              onCheckedChange={(checked) => setIsInternal(checked as boolean)}
              disabled={postMessage.isPending}
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
            disabled={postMessage.isPending || !newMessage.trim()}
          >
            Clear
          </Button>
          <Button
            type="submit"
            disabled={postMessage.isPending || !newMessage.trim()}
          >
            {postMessage.isPending ? 'Posting...' : 'Post Message'}
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
        <Tabs defaultValue={defaultTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            {showPublicTab && (
              <TabsTrigger value="public" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Public Discussion
                {publicUnreadCount > 0 && (
                  <span className="text-muted-foreground font-normal">
                    ({publicUnreadCount})
                  </span>
                )}
              </TabsTrigger>
            )}
            {showInternalTab && (
              <TabsTrigger value="internal" className="flex items-center gap-2">
                <Lock className="h-4 w-4" />
                Internal Notes
                {internalUnreadCount > 0 && (
                  <span className="text-muted-foreground font-normal">
                    ({internalUnreadCount})
                  </span>
                )}
              </TabsTrigger>
            )}
          </TabsList>

          {showPublicTab && (
            <TabsContent value="public" className="space-y-6">
              <div>
                <h3 className="text-sm font-medium mb-4 text-muted-foreground">
                  Visible to partner organization and internal team
                </h3>
                {renderMessageList(
                  allPublicMessages, 
                  "No public messages yet. Start the conversation!", 
                  isLoadingPublic,
                  publicData?.hasMore || false,
                  loadMorePublicMessages
                )}
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
                {renderMessageList(
                  allInternalMessages, 
                  "No internal notes yet. Add a note to start tracking internal communication.", 
                  isLoadingInternal,
                  internalData?.hasMore || false,
                  loadMoreInternalMessages
                )}
              </div>
              {renderMessageComposer(true)}
            </TabsContent>
          )}
        </Tabs>
      </CardContent>
    </Card>
  );
};