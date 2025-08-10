import { User, AlertCircle, Clock, UserX, Calendar } from 'lucide-react';

export const QUICK_FILTER_PRESETS = [
  { id: 'my-orders', label: 'My Orders', icon: User },
  { id: 'urgent', label: 'Urgent', icon: AlertCircle },
  { id: 'overdue', label: 'Overdue', icon: Clock },
  { id: 'unassigned', label: 'Unassigned', icon: UserX },
  { id: 'today', label: 'Today', icon: Calendar },
] as const;

export type QuickFilterPresetId = typeof QUICK_FILTER_PRESETS[number]['id'];
