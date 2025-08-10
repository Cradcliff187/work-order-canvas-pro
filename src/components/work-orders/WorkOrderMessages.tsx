import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { useMentionCandidates } from '@/hooks/useMentionCandidates';
import { 
  MessageCircle, 
  Users, 
  Lock, 
  Circle, 
  Clock, 
  HardHat,
  File,
  FileText,
  Image,
  FileSpreadsheet,
  Presentation,
  Archive,
  Code,
  Film,
  Music,
  X
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useWorkOrderMessages, WorkOrderMessage, WorkOrderAttachment } from '@/hooks/useWorkOrderMessages';
import { usePostMessage } from '@/hooks/usePostMessage';
import { useMessageSubscription } from '@/hooks/useMessageSubscription';
import { useOfflineMessageSync } from '@/hooks/useOfflineMessageSync';
import { useToast } from '@/hooks/use-toast';
import { isImageFile, getFileIcon } from '@/utils/fileUtils';

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
  const [crewMemberName, setCrewMemberName] = useState('');

  // File type icon mapping
  const FILE_TYPE_ICONS = {
    'file': File,
    'file-text': FileText,
    'image': Image,
    'file-spreadsheet': FileSpreadsheet,
    'presentation': Presentation,
    'archive': Archive,
    'code': Code,
    'film': Film,
    'music': Music,
  };
  
  // Pagination state
  const [publicPage, setPublicPage] = useState(1);
  const [internalPage, setInternalPage] = useState(1);
  const [allPublicMessages, setAllPublicMessages] = useState<WorkOrderMessage[]>([]);
  const [allInternalMessages, setAllInternalMessages] = useState<WorkOrderMessage[]>([]);
  
  // Track which message IDs have been marked as read to prevent re-processing
  const [markedAsReadIds, setMarkedAsReadIds] = useState<Set<string>>(new Set());
  
  // Track previous work order ID to detect actual changes
const previousWorkOrderId = useRef<string | null>(null);

  const [selectedMentions, setSelectedMentions] = useState<{ id: string; name: string }[]>([]);
  const [mentionNameMap, setMentionNameMap] = useState<Record<string, string>>({});
  const { data: publicCandidates } = useMentionCandidates(workOrderId, false);
  const { data: internalCandidates } = useMentionCandidates(workOrderId, true);

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

  // Build map of mentioned user IDs to names for rendering
  useEffect(() => {
    const ids = new Set<string>();
    [...allPublicMessages, ...allInternalMessages].forEach((m) => {
      m.mentioned_user_ids?.forEach((id: string) => ids.add(id));
    });
    if (ids.size === 0) return;
    (async () => {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, email')
          .in('id', Array.from(ids));
        const map: Record<string, string> = {};
        data?.forEach((p: any) => {
          const name = `${p.first_name || ''} ${p.last_name || ''}`.trim() || p.email;
          map[p.id] = name;
        });
        setMentionNameMap(map);
      } catch (e) {
        console.error('Failed to load mention names', e);
      }
    })();
  }, [allPublicMessages, allInternalMessages]);

  // Reset pagination only when work order ID actually changes
  useEffect(() => {
    if (previousWorkOrderId.current !== null && previousWorkOrderId.current !== workOrderId) {
      // Work order ID has changed, reset state
      setPublicPage(1);
      setInternalPage(1);
      setAllPublicMessages([]);
      setAllInternalMessages([]);
      setMarkedAsReadIds(new Set());
    }
    previousWorkOrderId.current = workOrderId;
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
    if (!newMessage.trim() && !crewMemberName.trim()) return;

    try {
      await postMessage.mutateAsync({
        workOrderId,
        message: newMessage,
        isInternal: isSubcontractor() || (isInternal && (isAdmin() || isEmployee())),
        attachmentIds: [], // No file attachments in messages anymore
        crewMemberName: crewMemberName.trim() || undefined,
        mentionedUserIds: selectedMentions.map((m) => m.id),
      });
      
      setNewMessage('');
      setIsInternal(false);
      setCrewMemberName('');
      setSelectedMentions([]);
    } catch (error) {
      // Error is handled by the mutation hook
      console.error('Failed to post message:', error);
    }
  };

  const renderAttachments = (attachments: WorkOrderAttachment[] | undefined) => {
    if (!attachments || attachments.length === 0) return null;

    return (
      <div className="mt-3 flex flex-wrap gap-2">
        {attachments.map((attachment) => {
          const publicUrl = supabase.storage.from('work-order-attachments').getPublicUrl(attachment.file_url).data.publicUrl;
          const isImage = isImageFile(attachment.file_name, attachment.file_type);
          const iconName = getFileIcon(attachment.file_name, attachment.file_type);
          const IconComponent = FILE_TYPE_ICONS[iconName as keyof typeof FILE_TYPE_ICONS] || File;
          
          return (
            <div key={attachment.id} className="relative group">
              {isImage ? (
                <img
                  src={publicUrl}
                  alt={attachment.file_name}
                  className="w-20 h-20 object-cover rounded-lg border cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => window.open(publicUrl, '_blank')}
                />
              ) : (
                <div 
                  className="w-20 h-20 bg-muted rounded-lg border flex flex-col items-center justify-center cursor-pointer hover:bg-muted/80 transition-colors p-1"
                  onClick={() => window.open(publicUrl, '_blank')}
                  title={attachment.file_name}
                >
                  <IconComponent className="h-6 w-6 text-muted-foreground mb-1" />
                  <span className="text-xs text-muted-foreground text-center leading-tight truncate w-full">
                    {attachment.file_name.split('.').pop()?.toUpperCase()}
                  </span>
                </div>
              )}
              {attachments.length > 1 && (
                <Badge className="absolute -top-1 -right-1 text-xs px-1.5 py-0.5">
                  {attachments.length}
                </Badge>
              )}
            </div>
          );
        })}
      </div>
    );
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
          </div>
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
          </span>
        </div>
        
        {/* Crew Member Info Display - Prominent */}
        {message.crew_member_name && (
          <div className="mb-2 bg-blue-50 dark:bg-blue-950/20 rounded-md px-3 py-2 border border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-2 text-sm text-blue-800 dark:text-blue-200">
              <HardHat className="h-4 w-4" />
              <span className="font-medium">On Site:</span>
              <span>{message.crew_member_name}</span>
            </div>
          </div>
        )}
        
        {message.message && (
          <p className={`text-sm text-foreground whitespace-pre-wrap ${isUnread ? 'font-medium' : 'font-normal'}`}>
            {message.message}
          </p>
        )}
        {renderAttachments(message.attachments)}
        {message.mentioned_user_ids?.length > 0 && (
          <div className="mt-2 text-xs text-muted-foreground">
            Mentioned: {message.mentioned_user_ids.map((id: string) => mentionNameMap[id] || 'User').join(', ')}
          </div>
        )}
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
        {/* Crew Member Input (Subcontractors only) - Moved to top for better UX */}
        {isSubcontractor() && (
          <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
            <Label htmlFor="crew-member" className="text-sm font-medium flex items-center gap-2 mb-2">
              <HardHat className="h-4 w-4 text-blue-600" />
              On-Site Crew Member
            </Label>
            <input
              id="crew-member"
              type="text"
              value={crewMemberName}
              onChange={(e) => setCrewMemberName(e.target.value)}
              placeholder="Who from your team is doing this work?"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={postMessage.isPending}
            />
            <p className="text-xs text-muted-foreground mt-1">Optional - Tag which team member is performing this work</p>
          </div>
        )}

        <Textarea
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder={forInternal ? "Add an internal note..." : "Type your message..."}
          className="min-h-[100px] resize-none"
          disabled={postMessage.isPending}
        />
        
        {/* Mentions */}
        {selectedMentions.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {selectedMentions.map((m) => (
              <Badge key={m.id} variant="secondary" className="flex items-center gap-1">
                {m.name}
                <button
                  type="button"
                  aria-label={`Remove ${m.name}`}
                  onClick={() => setSelectedMentions((prev) => prev.filter((x) => x.id !== m.id))}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
        <div className="flex justify-between">
          <Popover>
            <PopoverTrigger asChild>
              <Button type="button" variant="outline" size="sm">Mention users</Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-0" align="start">
              <Command>
                <CommandInput placeholder="Search users..." />
                <CommandList>
                  <CommandEmpty>No users found.</CommandEmpty>
                  <CommandGroup>
                    {(forInternal ? (internalCandidates || []) : (publicCandidates || [])).map((u) => (
                      <CommandItem
                        key={u.id}
                        value={u.id}
                        onSelect={() => {
                          setSelectedMentions((prev) => prev.some((x) => x.id === u.id) ? prev : [...prev, { id: u.id, name: u.fullName }]);
                        }}
                      >
                        <div className="flex flex-col">
                          <span>{u.fullName}</span>
                          {u.orgName && <span className="text-xs text-muted-foreground">{u.orgName}</span>}
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

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
        
        <div className="flex justify-between items-center">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setNewMessage('');
              setIsInternal(false);
              setCrewMemberName('');
            }}
            disabled={postMessage.isPending || (!newMessage.trim() && !crewMemberName.trim())}
          >
            Clear
          </Button>
          
          <Button
            type="submit"
            disabled={postMessage.isPending || (!newMessage.trim() && !crewMemberName.trim())}
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