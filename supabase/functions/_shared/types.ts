/**
 * Shared TypeScript interfaces for Supabase Edge Functions
 * 
 * This file contains type definitions used across multiple edge functions,
 * ensuring type safety and consistency throughout the serverless architecture.
 */

// Database entity types
export interface Organization {
  id?: string;
  name: string;
  contact_email: string;
  contact_phone?: string;
  organization_type: 'partner' | 'subcontractor' | 'internal';
  initials?: string;
  address?: string;
  is_active?: boolean;
  next_sequence_number?: number;
}

export interface Profile {
  id?: string;
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  user_type: 'admin' | 'partner' | 'subcontractor' | 'employee';
  company_name?: string;
  phone?: string;
  is_active?: boolean;
  is_employee?: boolean;
  hourly_cost_rate?: number;
  hourly_billable_rate?: number;
}

export interface Trade {
  id?: string;
  name: string;
  description?: string;
  is_active?: boolean;
}

export interface WorkOrder {
  id?: string;
  work_order_number?: string;
  title: string;
  description?: string;
  organization_id?: string;
  trade_id?: string;
  status?: 'received' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';
  created_by: string;
  assigned_to?: string;
  assigned_to_type?: 'internal' | 'subcontractor';
  store_location?: string;
  street_address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  partner_location_number?: string;
  partner_po_number?: string;
}

export interface PartnerLocation {
  id?: string;
  organization_id: string;
  location_name: string;
  location_number: string;
  street_address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  is_active?: boolean;
}

export interface WorkOrderReport {
  id?: string;
  work_order_id: string;
  subcontractor_user_id: string;
  work_performed: string;
  materials_used?: string;
  hours_worked?: number;
  invoice_amount: number;
  invoice_number?: string;
  notes?: string;
  status?: 'submitted' | 'reviewed' | 'approved' | 'rejected';
}

export interface EmailTemplate {
  id?: string;
  template_name: string;
  subject: string;
  html_content: string;
  text_content?: string;
  is_active?: boolean;
}

// Seeding-specific types
export interface SeedDataConfig {
  organizations: Organization[];
  users: Profile[];
  trades: Trade[];
  emailTemplates: EmailTemplate[];
  workOrderTemplates: Partial<WorkOrder>[];
}

export interface SeedingProgress {
  stage: string;
  progress: number;
  total: number;
  message: string;
  completed?: boolean;
  error?: string;
}

export interface SeedingResult {
  success: boolean;
  message: string;
  progress?: SeedingProgress[];
  data?: {
    organizations_created: number;
    users_created: number;
    work_orders_created: number;
    reports_created: number;
    invoices_created: number;
  };
  error?: string;
  duration_ms?: number;
}

// Edge Function response types
export interface EdgeFunctionResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Authentication context for edge functions
export interface AuthContext {
  user_id?: string;
  role?: string;
  is_admin?: boolean;
  email?: string;
}

/**
 * Standard error response structure for edge functions
 */
export interface ErrorResponse {
  success: false;
  error: string;
  code?: string;
  details?: any;
}

/**
 * Success response structure for edge functions
 */
export interface SuccessResponse<T = any> {
  success: true;
  data: T;
  message?: string;
}

// Utility type for edge function responses
export type FunctionResponse<T = any> = SuccessResponse<T> | ErrorResponse;