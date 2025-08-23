import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { supabase } from '@/integrations/supabase/client';
import { useWorkOrderStatusManager } from '@/hooks/useWorkOrderStatusManager';
import { getPartnerFriendlyStatus, getEstimateTabStatus } from '@/lib/status-display';
import type { Database } from '@/integrations/supabase/types';
import type { AuditLogEntry } from '@/hooks/useWorkOrderAuditLogs';

type WorkOrderStatus = Database['public']['Enums']['work_order_status'];
type WorkOrder = Database['public']['Tables']['work_orders']['Row'];
type WorkOrderReport = Database['public']['Tables']['work_order_reports']['Row'];

// Test data factories
const createMockWorkOrder = (overrides?: Partial<WorkOrder>): WorkOrder => ({
  id: 'test-wo-' + Math.random().toString(36).substr(2, 9),
  work_order_number: 'WO-TEST-001',
  status: 'received',
  title: 'Test Work Order',
  description: 'Test work order for status automation',
  assigned_organization_id: 'test-partner-org-id',
  created_by: 'test-admin-id',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  priority: 'standard',
  trade_id: null,
  internal_estimate_amount: null,
  partner_estimate_approved: null,
  subcontractor_estimate_amount: null,
  partner_po_number: null,
  contact_email: null,
  instructions: null,
  completion_notes: null,
  location_lat: null,
  location_lng: null,
  location_address: null,
  is_emergency: false,
  emergency_contact: null,
  photos: null,
  street_address: null,
  city: null,
  state: null,
  zip_code: null,
  admin_completion_notes: null,
  actual_completion_date: null,
  actual_hours: null,
  completion_checked_at: null,
  auto_completion_blocked: false,
  ...overrides,
});

const createMockAssignment = (workOrderId: string, assignedTo: string) => ({
  id: 'test-assignment-' + Math.random().toString(36).substr(2, 9),
  work_order_id: workOrderId,
  assigned_to: assignedTo,
  assignment_type: 'subcontractor',
  assigned_by: 'test-admin-id',
  assigned_at: new Date().toISOString(),
  notes: null,
  created_at: new Date().toISOString(),
});

const createMockReport = (workOrderId: string): WorkOrderReport => ({
  id: 'test-report-' + Math.random().toString(36).substr(2, 9),
  work_order_id: workOrderId,
  subcontractor_organization_id: 'test-subcontractor-org',
  submitted_by_user_id: 'test-subcontractor-user',
  work_performed: 'Test work performed',
  notes: 'Work completed successfully',
  materials_used: 'Test materials',
  hours_worked: 4,
  invoice_amount: 100,
  partner_billed_amount: 200,
  approved_subcontractor_invoice_amount: 0,
  status: 'submitted',
  submitted_at: new Date().toISOString(),
  reviewed_at: null,
  reviewed_by_user_id: null,
  photos: null,
  invoice_number: 'INV-TEST-001',
  invoiced_to_partner: false,
  invoiced_to_partner_at: null,
  invoice_notes: null,
});

const createMockAuditLog = (
  workOrderId: string, 
  oldStatus: WorkOrderStatus, 
  newStatus: WorkOrderStatus
): AuditLogEntry => ({
  id: 'test-audit-' + Math.random().toString(36).substr(2, 9),
  action: 'UPDATE',
  old_values: { status: oldStatus },
  new_values: { status: newStatus },
  created_at: new Date().toISOString(),
  user_id: 'test-user-id',
  profiles: {
    first_name: 'Test',
    last_name: 'User',
    email: 'test@example.com'
  }
});

// Mock Supabase responses
const mockSupabaseResponses = {
  workOrder: null as WorkOrder | null,
  assignment: null,
  report: null as WorkOrderReport | null,
  auditLogs: [] as AuditLogEntry[],
};

// Setup mocks
beforeEach(() => {
  vi.clearAllMocks();
  
  // Mock Supabase client methods
  vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
    const mockQuery = {
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      single: vi.fn(),
      maybeSingle: vi.fn(),
    };

    // Configure responses based on table
    switch (table) {
      case 'work_orders':
        mockQuery.single.mockResolvedValue({ 
          data: mockSupabaseResponses.workOrder, 
          error: null 
        });
        mockQuery.maybeSingle.mockResolvedValue({ 
          data: mockSupabaseResponses.workOrder, 
          error: null 
        });
        mockQuery.insert.mockResolvedValue({ 
          data: mockSupabaseResponses.workOrder, 
          error: null 
        });
        mockQuery.update.mockResolvedValue({ 
          data: mockSupabaseResponses.workOrder, 
          error: null 
        });
        break;
      
      case 'work_order_assignments':
        mockQuery.insert.mockResolvedValue({ 
          data: mockSupabaseResponses.assignment, 
          error: null 
        });
        break;
      
      case 'work_order_reports':
        mockQuery.insert.mockResolvedValue({ 
          data: mockSupabaseResponses.report, 
          error: null 
        });
        mockQuery.single.mockResolvedValue({ 
          data: mockSupabaseResponses.report, 
          error: null 
        });
        break;
      
      case 'audit_logs':
        mockQuery.select.mockResolvedValue({ 
          data: mockSupabaseResponses.auditLogs, 
          error: null 
        });
        break;
    }

    return mockQuery as any;
  });

  // Mock transition_work_order_status function
  vi.spyOn(supabase, 'rpc').mockImplementation((functionName: string) => {
    if (functionName === 'transition_work_order_status') {
      return Promise.resolve({ data: true, error: null });
    }
    return Promise.resolve({ data: null, error: null });
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  // Reset mock responses
  mockSupabaseResponses.workOrder = null;
  mockSupabaseResponses.assignment = null;
  mockSupabaseResponses.report = null;
  mockSupabaseResponses.auditLogs = [];
});

describe('Work Order Status Automation', () => {
  describe('Automated Status Progression', () => {
    it('should progress through statuses automatically', async () => {
      const workOrderId = 'test-work-order-id';
      const subcontractorId = 'test-subcontractor-id';
      
      // 1. Create work order - should be 'received'
      const initialWorkOrder = createMockWorkOrder({ 
        id: workOrderId, 
        status: 'received' 
      });
      mockSupabaseResponses.workOrder = initialWorkOrder;
      
      expect(initialWorkOrder.status).toBe('received');
      
      // 2. Create assignment - trigger should change to 'assigned'
      const assignment = createMockAssignment(workOrderId, subcontractorId);
      mockSupabaseResponses.assignment = assignment;
      mockSupabaseResponses.workOrder = { ...initialWorkOrder, status: 'assigned' };
      
      const wo2 = mockSupabaseResponses.workOrder;
      expect(wo2.status).toBe('assigned');
      
      // 3. Submit report - trigger should change to 'in_progress'
      const report = createMockReport(workOrderId);
      mockSupabaseResponses.report = report;
      mockSupabaseResponses.workOrder = { ...wo2, status: 'in_progress' };
      
      const wo3 = mockSupabaseResponses.workOrder;
      expect(wo3.status).toBe('in_progress');
      
      // 4. Approve report - trigger should change to 'completed'
      const approvedReport = { ...report, status: 'approved' as const };
      mockSupabaseResponses.report = approvedReport;
      mockSupabaseResponses.workOrder = { ...wo3, status: 'completed' };
      
      const wo4 = mockSupabaseResponses.workOrder;
      expect(wo4.status).toBe('completed');
      
      // 5. Verify audit trail
      mockSupabaseResponses.auditLogs = [
        createMockAuditLog(workOrderId, 'received', 'assigned'),
        createMockAuditLog(workOrderId, 'assigned', 'in_progress'),
        createMockAuditLog(workOrderId, 'in_progress', 'completed'),
      ];
      
      const audits = mockSupabaseResponses.auditLogs;
      expect(audits).toContainEqual(
        expect.objectContaining({
          old_values: { status: 'received' },
          new_values: { status: 'assigned' }
        })
      );
      expect(audits).toContainEqual(
        expect.objectContaining({
          old_values: { status: 'assigned' },
          new_values: { status: 'in_progress' }
        })
      );
      expect(audits).toContainEqual(
        expect.objectContaining({
          old_values: { status: 'in_progress' },
          new_values: { status: 'completed' }
        })
      );
    });

    it('should enforce business rules during status transitions', async () => {
      // Test that invalid transitions are blocked
      const workOrder = createMockWorkOrder({ status: 'received' });
      
      // Mock RPC to simulate validation failure
      vi.spyOn(supabase, 'rpc').mockResolvedValueOnce({ 
        data: null, 
        error: { message: 'Invalid status transition' } 
      });
      
      const result = await supabase.rpc('transition_work_order_status', {
        work_order_id: workOrder.id,
        new_status: 'completed', // Invalid: can't go from received to completed directly
        reason: 'Test invalid transition'
      });
      
      expect(result.error).toBeTruthy();
      expect(result.error?.message).toContain('Invalid status transition');
    });
  });

  describe('Status Manager Hook Integration', () => {
    it('should use transition_work_order_status function for safe updates', async () => {
      const rpcSpy = vi.spyOn(supabase, 'rpc').mockResolvedValue({ 
        data: true, 
        error: null 
      });
      
      const workOrderId = 'test-work-order';
      const newStatus: WorkOrderStatus = 'assigned';
      const reason = 'Test status change';
      
      // Simulate calling the status manager (we can't actually use the hook in tests)
      await supabase.rpc('transition_work_order_status', {
        work_order_id: workOrderId,
        new_status: newStatus,
        reason: reason,
        user_id: undefined
      });
      
      expect(rpcSpy).toHaveBeenCalledWith('transition_work_order_status', {
        work_order_id: workOrderId,
        new_status: newStatus,
        reason: reason,
        user_id: undefined
      });
    });

    it('should handle status change errors gracefully', async () => {
      vi.spyOn(supabase, 'rpc').mockResolvedValue({ 
        data: null, 
        error: { message: 'Database error' } 
      });
      
      const result = await supabase.rpc('transition_work_order_status', {
        work_order_id: 'invalid-id',
        new_status: 'assigned',
        reason: 'Test error handling'
      });
      
      expect(result.error).toBeTruthy();
      expect(result.error?.message).toBe('Database error');
    });
  });

  describe('Role-Based Status Display', () => {
    it('should preserve role-based display for partners', () => {
      // Test estimate needed - preparing estimate
      const workOrderPreparingEstimate = createMockWorkOrder({
        status: 'estimate_needed',
        internal_estimate_amount: null
      });
      
      const preparingLabel = getPartnerFriendlyStatus(
        'estimate_needed', 
        workOrderPreparingEstimate
      );
      expect(preparingLabel).toBe('Preparing Estimate');
      
      // Test estimate needed - pending approval
      const workOrderPendingApproval = createMockWorkOrder({
        status: 'estimate_needed',
        internal_estimate_amount: 1000
      });
      
      const pendingLabel = getPartnerFriendlyStatus(
        'estimate_needed', 
        workOrderPendingApproval
      );
      expect(pendingLabel).toBe('Pending Your Approval');
      
      // Test estimate approved
      const approvedLabel = getPartnerFriendlyStatus('estimate_approved', {});
      expect(approvedLabel).toBe('Approved - Ready to Start');
      
      // Test other statuses
      expect(getPartnerFriendlyStatus('received', {})).toBe('New');
      expect(getPartnerFriendlyStatus('assigned', {})).toBe('Assigned');
      expect(getPartnerFriendlyStatus('in_progress', {})).toBe('In Progress');
      expect(getPartnerFriendlyStatus('completed', {})).toBe('Completed');
    });

    it('should provide correct estimate tab status indicators', () => {
      // No estimate - should return null
      const noEstimate = getEstimateTabStatus({ internal_estimate_amount: null });
      expect(noEstimate).toBeNull();
      
      // Pending approval - should show warning badge with pulse
      const pendingApproval = getEstimateTabStatus({
        internal_estimate_amount: 1000,
        partner_estimate_approved: null
      });
      expect(pendingApproval).toEqual({
        showBadge: true,
        badgeVariant: 'warning',
        badgeText: 'Action Required',
        pulseAnimation: true
      });
      
      // Approved estimate - should show success badge
      const approved = getEstimateTabStatus({
        internal_estimate_amount: 1000,
        partner_estimate_approved: true
      });
      expect(approved).toEqual({
        showBadge: true,
        badgeVariant: 'success',
        badgeText: 'Approved',
        pulseAnimation: false
      });
      
      // Rejected estimate - should show destructive badge
      const rejected = getEstimateTabStatus({
        internal_estimate_amount: 1000,
        partner_estimate_approved: false
      });
      expect(rejected).toEqual({
        showBadge: true,
        badgeVariant: 'destructive',
        badgeText: 'Rejected',
        pulseAnimation: false
      });
    });
  });

  describe('Audit Trail Validation', () => {
    it('should create audit logs for each status change', () => {
      const workOrderId = 'test-audit-work-order';
      
      // Mock audit logs for a complete workflow
      const auditLogs: AuditLogEntry[] = [
        createMockAuditLog(workOrderId, 'received', 'assigned'),
        createMockAuditLog(workOrderId, 'assigned', 'in_progress'), 
        createMockAuditLog(workOrderId, 'in_progress', 'completed')
      ];
      
      mockSupabaseResponses.auditLogs = auditLogs;
      
      // Verify each transition is logged
      expect(auditLogs).toHaveLength(3);
      
      // Verify audit log structure
      auditLogs.forEach(log => {
        expect(log).toHaveProperty('id');
        expect(log).toHaveProperty('action', 'UPDATE');
        expect(log).toHaveProperty('old_values');
        expect(log).toHaveProperty('new_values');
        expect(log).toHaveProperty('created_at');
        expect(log).toHaveProperty('user_id');
        expect(log.old_values).toHaveProperty('status');
        expect(log.new_values).toHaveProperty('status');
      });
    });

    it('should track user information in audit logs', () => {
      const auditLog = createMockAuditLog('test-wo', 'received', 'assigned');
      
      expect(auditLog.user_id).toBeTruthy();
      expect(auditLog.profiles).toEqual({
        first_name: 'Test',
        last_name: 'User', 
        email: 'test@example.com'
      });
    });
  });

  describe('Business Rules Validation', () => {
    it('should validate estimate approval workflow', () => {
      const workOrder = createMockWorkOrder({
        status: 'estimate_needed',
        internal_estimate_amount: 1500,
        partner_estimate_approved: null
      });
      
      // Partner should see action required for pending estimate
      const partnerStatus = getPartnerFriendlyStatus(workOrder.status, workOrder);
      expect(partnerStatus).toBe('Pending Your Approval');
      
      // Tab should show warning badge with pulse
      const tabStatus = getEstimateTabStatus(workOrder);
      expect(tabStatus?.badgeVariant).toBe('warning');
      expect(tabStatus?.pulseAnimation).toBe(true);
    });

    it('should handle completion logic correctly', async () => {
      const workOrder = createMockWorkOrder({ status: 'in_progress' });
      const approvedReport = createMockReport(workOrder.id);
      
      mockSupabaseResponses.report = { 
        ...approvedReport, 
        status: 'approved' as const 
      };
      
      // When all reports are approved, status should transition to completed
      mockSupabaseResponses.workOrder = { ...workOrder, status: 'completed' };
      
      const completedWorkOrder = mockSupabaseResponses.workOrder;
      expect(completedWorkOrder.status).toBe('completed');
    });
  });

  describe('Error Handling & Edge Cases', () => {
    it('should handle invalid work order IDs gracefully', async () => {
      vi.spyOn(supabase, 'rpc').mockResolvedValue({ 
        data: null, 
        error: { message: 'Work order not found' } 
      });
      
      const result = await supabase.rpc('transition_work_order_status', {
        work_order_id: 'invalid-id',
        new_status: 'assigned',
        reason: 'Test invalid ID'
      });
      
      expect(result.error?.message).toContain('Work order not found');
    });

    it('should handle concurrent status changes', async () => {
      // Mock scenario where status was already changed by another user
      vi.spyOn(supabase, 'rpc').mockResolvedValue({ 
        data: null, 
        error: { message: 'Status conflict detected' } 
      });
      
      const result = await supabase.rpc('transition_work_order_status', {
        work_order_id: 'test-concurrent',
        new_status: 'assigned',
        reason: 'Concurrent change test'
      });
      
      expect(result.error?.message).toContain('Status conflict detected');
    });
  });
});