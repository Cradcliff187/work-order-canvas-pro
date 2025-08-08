// Column metadata for Admin Employees table (Phase 1, compile-only)
// Used later to initialize column visibility and presets

export type EmployeeColumnId =
  | "select"
  | "employee_name"
  | "email"
  | "phone"
  | "organization"
  | "status"
  | "hourly_cost_rate"
  | "hourly_billable_rate"
  | "created_at"
  | "actions";

export interface ColumnMeta {
  label: string;
  description?: string;
  visible: boolean;
  locked?: boolean; // locked columns cannot be hidden
}

export const EMPLOYEE_COLUMN_DEFAULTS: Record<EmployeeColumnId, ColumnMeta> = {
  select: { label: "Select", visible: true, locked: true },
  employee_name: { label: "Name", visible: true, description: "First and last name" },
  email: { label: "Email", visible: true },
  phone: { label: "Phone", visible: false },
  organization: { label: "Organization", visible: true },
  status: { label: "Status", visible: true },
  hourly_cost_rate: { label: "Cost Rate", visible: false, description: "Internal cost/hr" },
  hourly_billable_rate: { label: "Billable Rate", visible: false, description: "Billable/hr" },
  created_at: { label: "Created", visible: true },
  actions: { label: "Actions", visible: true, locked: true },
};

export const EMPLOYEE_DEFAULT_VISIBLE_ORDER: EmployeeColumnId[] = [
  "select",
  "employee_name",
  "email",
  "organization",
  "status",
  "created_at",
  "actions",
];
