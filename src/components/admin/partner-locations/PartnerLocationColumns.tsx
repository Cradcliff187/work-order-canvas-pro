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
  | "wo_received"
  | "wo_assigned"
  | "wo_in_progress"
  | "wo_completed"
  | "wo_cancelled"
  | "wo_estimate_needed"
  | "wo_estimate_pending"
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
  wo_received: { label: "Received", defaultVisible: false, description: "Work orders received" },
  wo_assigned: { label: "Assigned", defaultVisible: true, description: "Work orders assigned" },
  wo_in_progress: { label: "In Progress", defaultVisible: true, description: "Work orders in progress" },
  wo_completed: { label: "Completed", defaultVisible: true, description: "Work orders completed" },
  wo_cancelled: { label: "Cancelled", defaultVisible: false, description: "Work orders cancelled" },
  wo_estimate_needed: { label: "Est. Needed", defaultVisible: false, description: "Work orders needing estimates" },
  wo_estimate_pending: { label: "Est. Pending", defaultVisible: false, description: "Work orders with pending estimates" },
  created_at: { label: "Created", defaultVisible: false },
};

export const PARTNER_LOCATION_DEFAULT_VISIBLE_ORDER: PartnerLocationColumnId[] = [
  "select",
  "location_number",
  "location_name",
  "organization",
  "address",
  "wo_assigned",
  "wo_in_progress", 
  "wo_completed",
  "status",
  "created_at",
  "actions",
];