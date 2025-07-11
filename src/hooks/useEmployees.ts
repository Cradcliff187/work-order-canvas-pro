// Re-export all employee-related hooks and utilities for backward compatibility
export { useEmployees, useEmployee } from './useEmployeeQueries';
export { useEmployeeMutations } from './useEmployeeMutations';
export { formatCurrency } from '@/utils/employeeUtils';
export type { 
  Employee, 
  UpdateEmployeeRatesData, 
  CreateEmployeeData, 
  EmployeesData 
} from '@/types/employee';