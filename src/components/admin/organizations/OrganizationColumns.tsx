// Column metadata for Admin Organizations table (Phase 1, compile-only)
// Used later to initialize column visibility and presets

export type OrganizationColumnId =
  | "select"
  | "name"
  | "contact_email"
  | "contact_phone"
  | "status"
  | "created_at"
  | "actions";

export interface ColumnMeta {
  label: string;
  description?: string;
  visible: boolean;
  locked?: boolean; // locked columns cannot be hidden
}

export const ORGANIZATION_COLUMN_DEFAULTS: Record<OrganizationColumnId, ColumnMeta> = {
  select: { label: "Select", visible: true, locked: true },
  name: { label: "Organization", visible: true },
  contact_email: { label: "Contact Email", visible: true },
  contact_phone: { label: "Contact Phone", visible: true },
  status: { label: "Status", visible: true },
  created_at: { label: "Created", visible: true },
  actions: { label: "Actions", visible: true, locked: true },
};

export const ORGANIZATION_DEFAULT_VISIBLE_ORDER: OrganizationColumnId[] = [
  "select",
  "name",
  "contact_email",
  "contact_phone",
  "status",
  "created_at",
  "actions",
];
