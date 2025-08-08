// Column metadata for Admin Users table (Phase 1, compile-only)
// Used later to initialize column visibility and presets

export type UsersColumnId =
  | "select"
  | "name"
  | "email"
  | "role"
  | "organizations"
  | "status"
  | "created_at"
  | "actions";

export interface ColumnMeta {
  label: string;
  description?: string;
  visible: boolean;
  locked?: boolean; // locked columns cannot be hidden
}

export const USERS_COLUMN_DEFAULTS: Record<UsersColumnId, ColumnMeta> = {
  select: { label: "Select", visible: true, locked: true },
  name: { label: "Name", visible: true },
  email: { label: "Email", visible: true },
  role: { label: "Role", visible: true },
  organizations: { label: "Organizations", visible: true },
  status: { label: "Status", visible: true },
  created_at: { label: "Created", visible: true },
  actions: { label: "Actions", visible: true, locked: true },
};

export const USERS_DEFAULT_VISIBLE_ORDER: UsersColumnId[] = [
  "select",
  "name",
  "email",
  "role",
  "organizations",
  "status",
  "created_at",
  "actions",
];
