import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useStartDirectConversation } from '@/hooks/messaging/useStartDirectConversation';

interface NewDirectMessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (conversationId: string) => void;
}

interface UserRow {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
}

export const NewDirectMessageDialog: React.FC<NewDirectMessageDialogProps> = ({ open, onOpenChange, onCreated }) => {
  const [query, setQuery] = useState('');
  const { mutate: startConversation, isPending } = useStartDirectConversation();

  const enabled = query.trim().length >= 2;

  const { data: results = [], isLoading } = useQuery({
    queryKey: ['dm-user-search', query],
    enabled,
    queryFn: async (): Promise<UserRow[]> => {
      const q = `%${query.trim()}%`;
      const { data, error } = await supabase
        .from('profiles' as any)
        .select('id, first_name, last_name, email')
        .or(`email.ilike.${q},first_name.ilike.${q},last_name.ilike.${q}`)
        .limit(10);
      if (error) throw error;
      return (data ?? []) as any;
    },
    staleTime: 10_000,
  });

  const handleSelect = (userId: string) => {
    startConversation(
      { otherUserId: userId },
      {
        onSuccess: (res) => {
          onCreated(res.conversation_id);
          onOpenChange(false);
        },
      }
    );
  };

  const content = useMemo(() => {
    if (!enabled) return <div className="text-sm text-muted-foreground">Type at least 2 characters to search users</div>;
    if (isLoading) return <div className="text-sm text-muted-foreground">Searching…</div>;
    if (!results.length) return <div className="text-sm text-muted-foreground">No users found</div>;
    return (
      <ul className="mt-2 divide-y rounded-md border">
        {results.map((u) => (
          <li key={u.id}>
            <button
              className="w-full text-left p-3 hover:bg-muted/50 transition-colors"
              onClick={() => handleSelect(u.id)}
              disabled={isPending}
            >
              <div className="font-medium">{[u.first_name, u.last_name].filter(Boolean).join(' ') || u.email}</div>
              <div className="text-xs text-muted-foreground">{u.email}</div>
            </button>
          </li>
        ))}
      </ul>
    );
  }, [enabled, isLoading, results, isPending]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New direct message</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Input
            placeholder="Search by name or email"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
          {content}
          <div className="flex justify-end">
            <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={isPending}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NewDirectMessageDialog;
