export interface Employee {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  hourly_cost_rate?: number;
  hourly_billable_rate?: number;
  phone?: string;
  organization_id?: string; // From organization relationship
  created_at: string;
  updated_at: string;
  is_employee: boolean;
}

export interface UpdateEmployeeRatesData {
  hourly_cost_rate?: number;
  hourly_billable_rate?: number;
}

export interface CreateEmployeeData {
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  organization_id?: string; // Reference to organization
  hourly_cost_rate?: number;
  hourly_billable_rate?: number;
}

export interface EmployeesData {
  employees: Employee[];
  totalCount: number;
  activeCount: number;
  inactiveCount: number;
  averageCostRate: number;
  averageBillableRate: number;
}