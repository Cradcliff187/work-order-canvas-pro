import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, parse, isValid as isValidDate } from 'date-fns';
import * as XLSX from 'xlsx';

export interface CSVRow {
  employeeEmail: string;
  workOrderNumber: string;
  date: string;
  startTime: string;
  endTime: string;
  hours: string;
  description: string;
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  rowIndex: number;
  isValid: boolean;
  errors: ValidationError[];
  data: {
    employee_user_id: string;
    work_order_id: string;
    report_date: string;
    hours_worked: number;
    work_performed: string;
    hourly_rate_snapshot: number;
    total_labor_cost: number;
    notes: string;
    clock_in_time: string;
    clock_out_time: string;
    is_retroactive: boolean;
    approval_status: 'pending' | 'approved' | 'rejected';
  };
}

export interface BulkImportResult {
  success: number;
  failed: number;
  errors: string[];
}

export function useBulkTimeEntryImport() {
  const [parsedData, setParsedData] = useState<CSVRow[]>([]);
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([]);
  const [isValidating, setIsValidating] = useState(false);
  const [isBulkImporting, setIsBulkImporting] = useState(false);

  // Fetch reference data for validation
  const { data: employees } = useQuery({
    queryKey: ['csv-import-employees'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          email,
          first_name,
          last_name,
          hourly_billable_rate,
          organization_members!inner(
            organization:organizations!inner(
              organization_type
            )
          )
        `)
        .eq('organization_members.organization.organization_type', 'internal')
        .eq('is_employee', true)
        .eq('is_active', true);

      if (error) throw error;
      return data || [];
    },
  });

  const { data: workOrders } = useQuery({
    queryKey: ['csv-import-work-orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('work_orders')
        .select(`
          id,
          work_order_number,
          status,
          organizations!inner(
            organization_type
          )
        `)
        .eq('organizations.organization_type', 'internal')
        .in('status', ['assigned', 'in_progress', 'completed']);

      if (error) throw error;
      return data || [];
    },
  });

  const parseCSV = useCallback(async (file: File) => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      if (jsonData.length < 2) {
        setParsedData([]);
        return;
      }

      // Get headers and normalize them
      const headers = (jsonData[0] as string[]).map(header => 
        header.toLowerCase().replace(/[^a-z0-9]/g, '')
      );
      
      // Map headers to expected fields
      const headerMap: Record<string, string> = {
        'employeeemail': 'employeeEmail',
        'email': 'employeeEmail',
        'workorder': 'workOrderNumber',
        'workordernumber': 'workOrderNumber',
        'wo': 'workOrderNumber',
        'date': 'date',
        'starttime': 'startTime',
        'start': 'startTime',
        'endtime': 'endTime',
        'end': 'endTime',
        'hours': 'hours',
        'description': 'description',
        'workperformed': 'description',
      };

      const rows = jsonData.slice(1) as any[][];
      const parsedRows: CSVRow[] = rows
        .filter(row => row.some(cell => cell !== null && cell !== undefined && cell !== ''))
        .map(row => {
          const rowData: any = {};
          headers.forEach((header, index) => {
            const mappedField = headerMap[header];
            if (mappedField && row[index] !== null && row[index] !== undefined) {
              rowData[mappedField] = String(row[index]).trim();
            }
          });
          
          return {
            employeeEmail: rowData.employeeEmail || '',
            workOrderNumber: rowData.workOrderNumber || '',
            date: rowData.date || '',
            startTime: rowData.startTime || '',
            endTime: rowData.endTime || '',
            hours: rowData.hours || '',
            description: rowData.description || '',
          };
        });

      setParsedData(parsedRows);
      
      // Start validation
      if (parsedRows.length > 0) {
        validateData(parsedRows);
      }
    } catch (error) {
      console.error('Error parsing CSV:', error);
      setParsedData([]);
    }
  }, []);

  const validateData = useCallback(async (data: CSVRow[]) => {
    if (!employees || !workOrders) return;

    setIsValidating(true);
    
    try {
      const results: ValidationResult[] = [];

      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        const errors: ValidationError[] = [];
        let employeeId = '';
        let workOrderId = '';
        let hourlyRate = 0;

        // Validate employee email
        const employee = employees.find(emp => 
          emp.email.toLowerCase() === row.employeeEmail.toLowerCase()
        );
        if (!employee) {
          errors.push({
            field: 'employeeEmail',
            message: 'Employee not found or not an internal employee'
          });
        } else {
          employeeId = employee.id;
          hourlyRate = employee.hourly_billable_rate || 0;
        }

        // Validate work order number
        const workOrder = workOrders.find(wo => 
          wo.work_order_number === row.workOrderNumber
        );
        if (!workOrder) {
          errors.push({
            field: 'workOrderNumber',
            message: 'Work order not found or not available for time entry'
          });
        } else {
          workOrderId = workOrder.id;
        }

        // Validate date
        let parsedDate: Date | null = null;
        if (!row.date) {
          errors.push({
            field: 'date',
            message: 'Date is required'
          });
        } else {
          // Try multiple date formats
          const dateFormats = ['yyyy-MM-dd', 'MM/dd/yyyy', 'M/d/yyyy', 'yyyy/MM/dd'];
          for (const dateFormat of dateFormats) {
            try {
              const date = parse(row.date, dateFormat, new Date());
              if (isValidDate(date)) {
                parsedDate = date;
                break;
              }
            } catch {
              // Continue to next format
            }
          }
          
          if (!parsedDate) {
            errors.push({
              field: 'date',
              message: 'Invalid date format. Use YYYY-MM-DD, MM/DD/YYYY, or similar'
            });
          } else if (parsedDate > new Date()) {
            errors.push({
              field: 'date',
              message: 'Date cannot be in the future'
            });
          }
        }

        // Validate start and end times
        const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
        let startTime = '';
        let endTime = '';
        let calculatedHours = 0;
        
        if (row.startTime && row.endTime) {
          if (!timeRegex.test(row.startTime)) {
            errors.push({
              field: 'startTime',
              message: 'Start time must be in HH:MM format'
            });
          } else {
            startTime = row.startTime;
          }

          if (!timeRegex.test(row.endTime)) {
            errors.push({
              field: 'endTime',
              message: 'End time must be in HH:MM format'
            });
          } else {
            endTime = row.endTime;
          }

          // Calculate hours from times if both are valid
          if (startTime && endTime && parsedDate) {
            const start = new Date(`${format(parsedDate, 'yyyy-MM-dd')}T${startTime}:00`);
            const end = new Date(`${format(parsedDate, 'yyyy-MM-dd')}T${endTime}:00`);
            if (end > start) {
              calculatedHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
            } else {
              errors.push({
                field: 'endTime',
                message: 'End time must be after start time'
              });
            }
          }
        }

        // Validate hours (use calculated if available, otherwise require manual entry)
        let finalHours = 0;
        if (calculatedHours > 0) {
          finalHours = calculatedHours;
        } else if (row.hours) {
          const hours = parseFloat(row.hours);
          if (isNaN(hours)) {
            errors.push({
              field: 'hours',
              message: 'Hours must be a valid number'
            });
          } else if (hours < 0.25) {
            errors.push({
              field: 'hours',
              message: 'Hours must be at least 0.25'
            });
          } else if (hours > 24) {
            errors.push({
              field: 'hours',
              message: 'Hours cannot exceed 24'
            });
          } else {
            finalHours = hours;
            // Default times if not provided but hours are
            if (!startTime) startTime = '08:00';
            if (!endTime) {
              const startHour = parseInt(startTime.split(':')[0]);
              const startMin = parseInt(startTime.split(':')[1]);
              const endTotalMinutes = (startHour * 60 + startMin) + (hours * 60);
              const endHour = Math.floor(endTotalMinutes / 60);
              const endMin = endTotalMinutes % 60;
              endTime = `${endHour.toString().padStart(2, '0')}:${endMin.toString().padStart(2, '0')}`;
            }
          }
        } else {
          errors.push({
            field: 'hours',
            message: 'Hours must be provided or calculable from start/end times'
          });
        }

        // Validate description
        if (!row.description || row.description.trim().length === 0) {
          errors.push({
            field: 'description',
            message: 'Description is required'
          });
        }

        // Check for existing time entry on same date/work order/employee
        if (employeeId && workOrderId && parsedDate) {
          const existingEntry = await supabase
            .from('employee_reports')
            .select('id')
            .eq('employee_user_id', employeeId)
            .eq('work_order_id', workOrderId)
            .eq('report_date', format(parsedDate, 'yyyy-MM-dd'))
            .single();

          if (existingEntry.data && !existingEntry.error) {
            errors.push({
              field: 'date',
              message: 'Time entry already exists for this employee, work order, and date'
            });
          }
        }

        const isValid = errors.length === 0;
        
        // Calculate clock times if valid
        let clockInTime = '';
        let clockOutTime = '';
        if (isValid && parsedDate && startTime && endTime) {
          const clockIn = new Date(`${format(parsedDate, 'yyyy-MM-dd')}T${startTime}:00`);
          const clockOut = new Date(`${format(parsedDate, 'yyyy-MM-dd')}T${endTime}:00`);
          clockInTime = clockIn.toISOString();
          clockOutTime = clockOut.toISOString();
        }
        
        results.push({
          rowIndex: i,
          isValid,
          errors,
          data: {
            employee_user_id: employeeId,
            work_order_id: workOrderId,
            report_date: parsedDate ? format(parsedDate, 'yyyy-MM-dd') : '',
            hours_worked: finalHours,
            work_performed: row.description || '',
            hourly_rate_snapshot: hourlyRate,
            total_labor_cost: finalHours * hourlyRate,
            notes: 'Imported from CSV',
            clock_in_time: clockInTime,
            clock_out_time: clockOutTime,
            is_retroactive: true,
            approval_status: 'pending' as const,
          }
        });
      }

      setValidationResults(results);
    } catch (error) {
      console.error('Validation error:', error);
      setValidationResults([]);
    } finally {
      setIsValidating(false);
    }
  }, [employees, workOrders]);

  const bulkImport = useCallback(async (validData: ValidationResult['data'][]): Promise<BulkImportResult> => {
    setIsBulkImporting(true);
    
    try {
      let successCount = 0;
      let failedCount = 0;
      const errors: string[] = [];

      // Process in batches of 10 to avoid overwhelming the database
      const batchSize = 10;
      for (let i = 0; i < validData.length; i += batchSize) {
        const batch = validData.slice(i, i + batchSize);
        
        try {
          const { error } = await supabase
            .from('employee_reports')
            .insert(batch);

          if (error) {
            failedCount += batch.length;
            errors.push(`Batch ${Math.floor(i / batchSize) + 1}: ${error.message}`);
          } else {
            successCount += batch.length;
          }
        } catch (batchError) {
          failedCount += batch.length;
          errors.push(`Batch ${Math.floor(i / batchSize) + 1}: ${(batchError as Error).message}`);
        }
      }

      return {
        success: successCount,
        failed: failedCount,
        errors
      };
    } catch (error) {
      return {
        success: 0,
        failed: validData.length,
        errors: [(error as Error).message]
      };
    } finally {
      setIsBulkImporting(false);
    }
  }, []);

  const resetData = useCallback(() => {
    setParsedData([]);
    setValidationResults([]);
    setIsValidating(false);
    setIsBulkImporting(false);
  }, []);

  return {
    parsedData,
    validationResults,
    isValidating,
    isBulkImporting,
    parseCSV,
    bulkImport,
    resetData,
  };
}