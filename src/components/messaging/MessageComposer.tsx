import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useSendConversationMessage } from '@/hooks/messaging/useSendConversationMessage';

interface MessageComposerProps {
  conversationId: string;
}

export const MessageComposer: React.FC<MessageComposerProps> = ({ conversationId }) => {
  const [value, setValue] = useState('');
  const { mutate: send, isPending } = useSendConversationMessage();

  const handleSend = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed) return;
    send({ conversationId, message: trimmed });
    setValue('');
  }, [value, send, conversationId]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.key === 'Enter' && (e.ctrlKey || e.metaKey))) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex items-end gap-2">
      <Textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder="Type a message..."
        className="min-h-[44px] max-h-48"
        aria-label="Message input"
        disabled={isPending}
      />
      <Button onClick={handleSend} disabled={isPending || !value.trim()} size="sm">
        Send
      </Button>
    </div>
  );
};

export default MessageComposer;
