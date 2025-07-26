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

## Database Tables

### work_order_messages

**Purpose**: Stores all messages and internal notes for work orders

**Schema**:
```sql
CREATE TABLE work_order_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id UUID NOT NULL REFERENCES work_orders(id),
  sender_id UUID NOT NULL REFERENCES profiles(id),
  message TEXT NOT NULL,
  is_internal BOOLEAN NOT NULL DEFAULT false,
  attachment_ids UUID[], -- References to work_order_attachments
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

**Key Fields**:
- `is_internal`: Boolean flag that determines message visibility
  - `false` = Public messages (visible to partners and internal team)
  - `true` = Internal notes (visible to internal team and assigned subcontractors only)
- `attachment_ids`: Array of UUIDs linking to work_order_attachments
- `sender_id`: Profile ID of the message author

### message_read_receipts

**Purpose**: Tracks when users have read specific messages for notification management

**Schema**:
```sql
CREATE TABLE message_read_receipts (
  message_id UUID NOT NULL REFERENCES work_order_messages(id),
  user_id UUID NOT NULL REFERENCES profiles(id),
  read_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  PRIMARY KEY (message_id, user_id)
);
```

**Usage**: Prevents showing notifications for already-read messages and provides read status indicators.

## Visibility Rules

The messaging system enforces strict visibility controls based on the `is_internal` flag and user roles:

### Public Messages (is_internal = false)
**Visible to:**
- Partner organizations that submitted the work order
- All internal team members (admins/employees)
- All assigned subcontractors for the work order

**Purpose**: Client-facing communication, status updates, coordination between all parties

### Internal Messages (is_internal = true)  
**Visible to:**
- Internal team members (admins/employees) only
- Assigned subcontractors for the specific work order only
- NOT visible to partner organizations

**Purpose**: Operational coordination, sensitive information, internal notes

### Message Creation Restrictions

**Partners:**
- Can only create public messages (`is_internal = false`)
- Limited to work orders from their organization
- Ensures all partner communication is visible to internal team

**Subcontractors:**
- Can only create internal messages (`is_internal = true`) 
- Limited to work orders assigned to them
- Keeps operational details private from clients

**Admins/Employees:**
- Can create both public and internal messages
- Full access to all work order conversations
- Can moderate and manage all communications

## Key Components

### WorkOrderMessages.tsx
**Location**: `src/components/work-orders/WorkOrderMessages.tsx`

**Primary component** that renders the messaging interface with:
- Tabbed interface for Public and Internal messages
- Real-time message updates via subscriptions
- Message composition with file attachment support
- Pagination with "Load More" functionality
- Read receipt tracking and unread message indicators
- Offline message queuing with visual indicators

**Key Features:**
```typescript
// Tab visibility based on user roles
const showPublicTab = isAdmin() || isEmployee() || isPartner();
const showInternalTab = isAdmin() || isEmployee() || isSubcontractor();

// Message posting permissions
const canPostToPublic = isAdmin() || isEmployee() || isPartner();
const canPostToInternal = isAdmin() || isEmployee() || isSubcontractor();
```

### Supporting Hooks

**useWorkOrderMessages**: Fetches paginated messages with role-based filtering
**usePostMessage**: Handles message creation with offline queuing support
**useMessageSubscription**: Real-time message updates via Supabase subscriptions
**useOfflineMessageSync**: Manages offline message queue and sync operations
**useUnreadMessageCounts**: Tracks unread message counts across work orders

### Database Functions

**get_unread_message_counts()**: RPC function that efficiently calculates unread message counts for users across multiple work orders, respecting visibility rules.

## Difference from Email System

**Messaging System (In-App Chat)**:
- **Purpose**: Real-time communication within the application
- **Audience**: Internal users (admins, employees, partners, subcontractors)
- **Delivery**: Instant via WebSocket subscriptions
- **Storage**: Persisted in `work_order_messages` table
- **Access**: Role-based visibility with public/internal distinction
- **Interface**: Tabbed chat interface within work order details

**Email System (External Notifications)**:
- **Purpose**: External notifications and alerts sent via email
- **Audience**: All stakeholders including external contacts
- **Delivery**: Asynchronous via email service (Resend)
- **Storage**: Tracked in `email_logs` and `email_queue` tables  
- **Access**: Delivered to email addresses, not role-based
- **Interface**: Email templates sent to external email clients

**Example Use Cases:**

**In-App Messaging**: 
- Subcontractor asks admin about materials needed
- Partner requests status update on work order
- Admin leaves internal note about customer requirements

**Email Notifications**:
- Partner receives email when work order is assigned
- Subcontractor gets email when work order status changes
- Admin receives email alert for new work order submission

## Real-Time Functionality

The messaging system uses Supabase real-time subscriptions to provide instant updates:

```typescript
// Real-time subscription setup
useMessageSubscription(workOrderId, handleBrowserNotification, toast);

// Listens for INSERT/UPDATE events on work_order_messages table
// Automatically updates UI and shows browser notifications
```

**Features:**
- Instant message delivery to all connected users
- Browser notifications when page is not focused
- Automatic read receipt tracking
- Live typing indicators (visual feedback)
- Offline message queuing with automatic sync when connection restored

## Security Model

**Row Level Security (RLS) Policies:**
- 8 policies on `work_order_messages` table enforce visibility rules
- 1 policy on `message_read_receipts` ensures users only manage their own receipts
- Message visibility strictly controlled by `is_internal` flag and organizational relationships
- File attachments inherit same security model as messages

**Access Patterns:**
- Partners: View public messages for their org's work orders only
- Subcontractors: View all messages for assigned work orders only  
- Admins/Employees: Full access to all messages across all work orders
- Read receipts: Private to each user, no cross-user visibility

## Migration References

**Database Schema**: `20250712204423-9a1234b5-6c78-9d01-2e34-56789abcdef0.sql`
**RLS Policies**: Documented in `docs/RLS_POLICIES.md` under "Messaging System Policies"