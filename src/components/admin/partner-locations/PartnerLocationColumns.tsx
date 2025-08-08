// Column metadata for Admin Partner Locations table (Phase 1, compile-only)
// Used later to initialize column visibility and presets

export type PartnerLocationColumnId =
  | "select"
  | "location_number"
  | "location_name"
  | "organization"
  | "address"
  | "city"
  | "state"
  | "zip"
  | "status"
  | "created_at"
  | "actions";

export interface ColumnMeta {
  label: string;
  description?: string;
  visible: boolean;
  locked?: boolean; // locked columns cannot be hidden
}

export const PARTNER_LOCATION_COLUMN_DEFAULTS: Record<PartnerLocationColumnId, ColumnMeta> = {
  select: { label: "Select", visible: true, locked: true },
  location_number: { label: "Location #", visible: true, description: "Copyable location number" },
  location_name: { label: "Location Name", visible: true },
  organization: { label: "Organization", visible: true, description: "Owning organization" },
  address: { label: "Address", visible: true, description: "Street address with map link" },
  city: { label: "City", visible: false },
  state: { label: "State", visible: false },
  zip: { label: "ZIP", visible: false },
  status: { label: "Status", visible: true },
  created_at: { label: "Created", visible: true },
  actions: { label: "Actions", visible: true, locked: true },
};

export const PARTNER_LOCATION_DEFAULT_VISIBLE_ORDER: PartnerLocationColumnId[] = [
  "select",
  "location_number",
  "location_name",
  "organization",
  "address",
  "status",
  "created_at",
  "actions",
];
