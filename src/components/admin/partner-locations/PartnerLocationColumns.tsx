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
  | "zip_code"
  | "contact_name"
  | "status"
  | "created_at"
  | "actions";

export interface ColumnMeta {
  label: string;
  description?: string;
  visible: boolean;
  locked?: boolean; // locked columns cannot be hidden
}

export const LOCATION_COLUMN_METADATA = {
  organization: { label: "Organization", defaultVisible: true, description: "Owning organization" },
  location_number: { label: "Location #", defaultVisible: true, description: "Copyable location number" },
  location_name: { label: "Location Name", defaultVisible: true },
  address: { label: "Address", defaultVisible: true, description: "Street address with map link" },
  city: { label: "City", defaultVisible: false },
  state: { label: "State", defaultVisible: false },
  zip_code: { label: "ZIP", defaultVisible: false },
  contact_name: { label: "Contact", defaultVisible: false },
  status: { label: "Status", defaultVisible: true },
  created_at: { label: "Created", defaultVisible: false },
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