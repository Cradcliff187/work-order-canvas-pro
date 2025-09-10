import type { Database } from '@/integrations/supabase/types';

export type EmployeeReport = Database['public']['Tables']['employee_reports']['Row'];

export interface ClockStateData {
  id: string;
  clock_in_time: string;
  work_order_id: string | null; // Allow null to match database
  project_id?: string | null;
  location_lat?: number | null;
  location_lng?: number | null;
  location_address?: string | null;
  hourly_rate_snapshot?: number | null;
}

export interface SimpleLocationData {
  latitude: number;
  longitude: number;
}

export interface LocationInfo {
  location_lat: number;
  location_lng: number;
  location_address: string;
}

export interface ClockOutLocationData {
  clock_out_location_lat: number;
  clock_out_location_lng: number;
  clock_out_location_address: string;
}

export interface ClockOutResult {
  locationData: ClockOutLocationData | {};
  hoursWorked: number;
}

export interface ClockInParams {
  workOrderId?: string;
  projectId?: string;
}

export interface ClockInResult {
  location_lat?: number;
  location_lng?: number;
  location_address?: string;
}

export interface ClockState {
  isClocked: boolean;
  activeReportId: string | null;
  clockInTime: Date | null;
  elapsedTime: number; // in milliseconds
  workOrderId: string | null;
  projectId?: string | null;
  locationLat?: number | null;
  locationLng?: number | null;
  locationAddress?: string | null;
  hourlyRate?: number | null;
}

export interface CachedLocationData {
  location: SimpleLocationData;
  address: string;
  timestamp: number;
}