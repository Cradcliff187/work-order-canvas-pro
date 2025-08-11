
# WorkOrderPortal Messaging System

## Overview

The WorkOrderPortal messaging system provides **in-app real-time chat functionality** for work order communication. This is NOT an email system - it's an internal messaging platform that enables secure, real-time conversations between different user types while maintaining strict access controls.

**Key Features:**
- Real-time messaging with WebSocket subscriptions
- Message visibility controls based on user roles and message type
- File attachment support (photos and documents)  
- Offline message queuing with automatic sync
- Read receipt tracking for message acknowledgment
- Browser notifications for new messages when page is not focused

## Unified Inbox

The Messages page provides a unified list of:
- Direct conversations (DMs) from the `conversations` + `work_order_messages` tables
- Work order threads from `work_order_messages` grouped by `work_order_id`

Data sources:
- `get_conversations_overview()` returns DM/org/announcement summaries with title, last_message, updated_at, and accurate unread_count.
- `get_work_order_threads_overview()` returns work order thread summaries and unread counts using `message_read_receipts`.

Behavior:
- Filter chips for All / Direct / Work Orders.
- Selecting a DM opens the in-panel conversation view.
- Selecting a Work Order routes to `/work-orders/:id` for full context.

## Unread Logic

DMs:
- `get_conversations_overview()` computes unread by comparing `conversation_participants.last_read_at` with `work_order_messages` for the conversation and excluding messages the current user sent.

Work orders:
- `get_work_order_threads_overview()` computes unread by counting messages without a `message_read_receipts` row for the current user and excluding messages sent by the current user.

Mark as read:
- `mark_conversation_read(p_conversation_id)` updates the participant’s `last_read_at`.
- UI immediately invalidates: `conversations-overview`, `unified-inbox-overview`, and the conversation cache.

## Realtime

Published to `supabase_realtime`:
- `work_order_messages`
- `message_read_receipts`
- `conversations`
- `conversation_participants`

Subscriptions:
- Conversation view subscribes to `work_order_messages` with `conversation_id=...` and:
  - Updates message list and unread counters
  - Shows a toast preview for new incoming messages

Presence:
- A lightweight presence channel `presence:conv:{conversationId}` indicates whether any other participant is online in the same conversation.

## RLS Matrix (Summary)

- Admin/Employees (internal):
  - DMs: Visible to participants
  - Work orders: Full access to public and internal messages
  - Insert allowed on work order messages (internal operations)
- Partners:
  - DMs: Visible only if valid direct conversation participants
  - Work orders: View public messages for their organization’s orders; can insert public messages only
- Subcontractors:
  - DMs: Visible only if valid direct conversation participants
  - Work orders: View all messages on assigned orders; can insert internal messages only

Implementation notes:
- Internal employee work order message access is explicitly allowed via policies:
  - `internal_employees_select_work_order_messages` (SELECT)
  - `internal_employees_insert_work_order_messages` (INSERT)

## Key Components

- `DirectMessagesPage`: Unified list UI and master-detail navigation.
- `ConversationView`: DM thread view with infinite scroll, mark-as-read, optimistic send, presence indicator, and realtime updates.
- `MessageComposer`: DM composer with ctrl/cmd+Enter to send and optimistic UI.
- `WorkOrderMessages`: Full work order thread UI with tabs and realtime.

## Database Functions

- `get_conversations_overview()` – DM/org/announcement summaries with unread counts.
- `get_work_order_threads_overview()` – Work order thread summaries with unread counts.
- `get_conversation_messages()` – Paginated messages for a conversation.
- `mark_conversation_read()` – Marks a conversation as read for current user.

## Difference from Email System

Messaging (in-app chat) vs Email (external notifications) remain separate systems as previously documented.
