import { describe, it, expect } from 'vitest'
import { getPartnerFriendlyStatus, getEstimateTabStatus } from '../status-display'
import type { Database } from '@/integrations/supabase/types'

type WorkOrderStatus = Database['public']['Enums']['work_order_status']

// Test data factory
const createWorkOrder = (overrides = {}) => ({
  internal_estimate_amount: null,
  partner_estimate_approved: null,
  subcontractor_estimate_amount: null,
  ...overrides,
})

describe('getPartnerFriendlyStatus', () => {
  describe('estimate_needed status handling', () => {
    it('returns "Pending Your Approval" when internal estimate exists', () => {
      const workOrder = createWorkOrder({
        internal_estimate_amount: 1000,
        partner_estimate_approved: null,
      })
      
      const result = getPartnerFriendlyStatus('estimate_needed', workOrder)
      expect(result).toBe('Pending Your Approval')
    })

    it('returns "Preparing Estimate" when no internal estimate', () => {
      const workOrder = createWorkOrder({
        internal_estimate_amount: null,
      })
      
      const result = getPartnerFriendlyStatus('estimate_needed', workOrder)
      expect(result).toBe('Preparing Estimate')
    })

    it('returns "Preparing Estimate" when internal estimate is zero', () => {
      const workOrder = createWorkOrder({
        internal_estimate_amount: 0,
      })
      
      const result = getPartnerFriendlyStatus('estimate_needed', workOrder)
      expect(result).toBe('Preparing Estimate')
    })

    it('returns "Preparing Estimate" when internal estimate is negative', () => {
      const workOrder = createWorkOrder({
        internal_estimate_amount: -100,
      })
      
      const result = getPartnerFriendlyStatus('estimate_needed', workOrder)
      expect(result).toBe('Preparing Estimate')
    })
  })

  describe('estimate_approved status handling', () => {
    it('always returns "Approved - Ready to Start" for estimate_approved status', () => {
      const workOrder = createWorkOrder({
        internal_estimate_amount: 1000,
        partner_estimate_approved: true,
      })
      
      const result = getPartnerFriendlyStatus('estimate_approved', workOrder)
      expect(result).toBe('Approved - Ready to Start')
    })

    it('returns "Approved - Ready to Start" even without internal estimate', () => {
      const workOrder = createWorkOrder({
        internal_estimate_amount: null,
        partner_estimate_approved: true,
      })
      
      const result = getPartnerFriendlyStatus('estimate_approved', workOrder)
      expect(result).toBe('Approved - Ready to Start')
    })
  })

  describe('standard status mappings', () => {
    const statusMappings: Array<[WorkOrderStatus, string]> = [
      ['received', 'New'],
      ['assigned', 'Assigned'],
      ['in_progress', 'In Progress'],
      ['completed', 'Completed'],
      ['cancelled', 'Cancelled'],
    ]

    statusMappings.forEach(([status, expectedLabel]) => {
      it(`returns "${expectedLabel}" for ${status} status`, () => {
        const workOrder = createWorkOrder()
        const result = getPartnerFriendlyStatus(status, workOrder)
        expect(result).toBe(expectedLabel)
      })
    })
  })

  describe('edge cases and error handling', () => {
    it('handles null workOrder gracefully', () => {
      const result = getPartnerFriendlyStatus('received', null as any)
      expect(result).toBe('New')
    })

    it('handles undefined workOrder gracefully', () => {
      const result = getPartnerFriendlyStatus('received', undefined as any)
      expect(result).toBe('New')
    })

    it('handles empty workOrder object', () => {
      const result = getPartnerFriendlyStatus('estimate_needed', {})
      expect(result).toBe('Preparing Estimate')
    })

    it('returns original status for unknown status types', () => {
      const workOrder = createWorkOrder()
      const unknownStatus = 'unknown_status' as WorkOrderStatus
      const result = getPartnerFriendlyStatus(unknownStatus, workOrder)
      expect(result).toBe('unknown_status')
    })

    it('handles missing internal_estimate_amount property', () => {
      const workOrder = { partner_estimate_approved: null }
      const result = getPartnerFriendlyStatus('estimate_needed', workOrder)
      expect(result).toBe('Preparing Estimate')
    })
  })
})

describe('getEstimateTabStatus', () => {
  describe('no internal estimate scenarios', () => {
    it('returns null when no internal estimate amount', () => {
      const workOrder = createWorkOrder({
        internal_estimate_amount: null,
      })
      
      const result = getEstimateTabStatus(workOrder)
      expect(result).toBeNull()
    })

    it('returns null when internal estimate is zero', () => {
      const workOrder = createWorkOrder({
        internal_estimate_amount: 0,
      })
      
      const result = getEstimateTabStatus(workOrder)
      expect(result).toBeNull()
    })

    it('returns null when internal estimate is negative', () => {
      const workOrder = createWorkOrder({
        internal_estimate_amount: -100,
      })
      
      const result = getEstimateTabStatus(workOrder)
      expect(result).toBeNull()
    })

    it('returns null when workOrder is null', () => {
      const result = getEstimateTabStatus(null as any)
      expect(result).toBeNull()
    })

    it('returns null when workOrder is undefined', () => {
      const result = getEstimateTabStatus(undefined as any)
      expect(result).toBeNull()
    })
  })

  describe('pending approval state (partner_estimate_approved = null)', () => {
    it('returns warning badge with "Action Required" and pulse animation', () => {
      const workOrder = createWorkOrder({
        internal_estimate_amount: 1000,
        partner_estimate_approved: null,
      })
      
      const result = getEstimateTabStatus(workOrder)
      expect(result).toEqual({
        showBadge: true,
        badgeVariant: 'warning',
        badgeText: 'Action Required',
        pulseAnimation: true,
      })
    })

    it('handles large estimate amounts correctly', () => {
      const workOrder = createWorkOrder({
        internal_estimate_amount: 999999.99,
        partner_estimate_approved: null,
      })
      
      const result = getEstimateTabStatus(workOrder)
      expect(result).toEqual({
        showBadge: true,
        badgeVariant: 'warning',
        badgeText: 'Action Required',
        pulseAnimation: true,
      })
    })
  })

  describe('approved estimate state (partner_estimate_approved = true)', () => {
    it('returns success badge with "Approved" and no pulse animation', () => {
      const workOrder = createWorkOrder({
        internal_estimate_amount: 1000,
        partner_estimate_approved: true,
      })
      
      const result = getEstimateTabStatus(workOrder)
      expect(result).toEqual({
        showBadge: true,
        badgeVariant: 'success',
        badgeText: 'Approved',
        pulseAnimation: false,
      })
    })
  })

  describe('rejected estimate state (partner_estimate_approved = false)', () => {
    it('returns destructive badge with "Rejected" and no pulse animation', () => {
      const workOrder = createWorkOrder({
        internal_estimate_amount: 1000,
        partner_estimate_approved: false,
      })
      
      const result = getEstimateTabStatus(workOrder)
      expect(result).toEqual({
        showBadge: true,
        badgeVariant: 'destructive',
        badgeText: 'Rejected',
        pulseAnimation: false,
      })
    })
  })

  describe('edge cases and validation', () => {
    it('returns { showBadge: false } for unexpected approval states', () => {
      const workOrder = createWorkOrder({
        internal_estimate_amount: 1000,
        // Simulate an unexpected state that doesn't match our conditions
      })
      
      // Manually set an unexpected value (in real scenarios this shouldn't happen)
      const result = getEstimateTabStatus(workOrder)
      expect(result).toEqual({ showBadge: false })
    })

    it('handles missing partner_estimate_approved property', () => {
      const workOrder = {
        internal_estimate_amount: 1000,
        // partner_estimate_approved is undefined
      }
      
      const result = getEstimateTabStatus(workOrder)
      expect(result).toEqual({
        showBadge: true,
        badgeVariant: 'warning',
        badgeText: 'Action Required',
        pulseAnimation: true,
      })
    })

    it('handles very small positive estimate amounts', () => {
      const workOrder = createWorkOrder({
        internal_estimate_amount: 0.01,
        partner_estimate_approved: null,
      })
      
      const result = getEstimateTabStatus(workOrder)
      expect(result).toEqual({
        showBadge: true,
        badgeVariant: 'warning',
        badgeText: 'Action Required',
        pulseAnimation: true,
      })
    })

    it('prioritizes internal estimate check over approval status', () => {
      const workOrder = createWorkOrder({
        internal_estimate_amount: null, // No estimate
        partner_estimate_approved: true, // But somehow approved
      })
      
      const result = getEstimateTabStatus(workOrder)
      expect(result).toBeNull() // Should return null because no estimate exists
    })
  })
})

describe('integration tests', () => {
  describe('type compatibility', () => {
    it('works with minimal workOrder interface', () => {
      const minimalWorkOrder = {
        internal_estimate_amount: 500,
      }
      
      const statusResult = getPartnerFriendlyStatus('estimate_needed', minimalWorkOrder)
      const tabResult = getEstimateTabStatus(minimalWorkOrder)
      
      expect(statusResult).toBe('Pending Your Approval')
      expect(tabResult).toEqual({
        showBadge: true,
        badgeVariant: 'warning',
        badgeText: 'Action Required',
        pulseAnimation: true,
      })
    })

    it('works with full workOrder database type', () => {
      const fullWorkOrder = createWorkOrder({
        id: 'test-id',
        work_order_number: 'WO-001',
        organization_id: 'org-id',
        store_location: 'Test Store',
        internal_estimate_amount: 1500,
        partner_estimate_approved: false,
        subcontractor_estimate_amount: 1200,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      
      const statusResult = getPartnerFriendlyStatus('estimate_needed', fullWorkOrder)
      const tabResult = getEstimateTabStatus(fullWorkOrder)
      
      expect(statusResult).toBe('Pending Your Approval')
      expect(tabResult).toEqual({
        showBadge: true,
        badgeVariant: 'destructive',
        badgeText: 'Rejected',
        pulseAnimation: false,
      })
    })
  })

  describe('real-world scenarios', () => {
    it('handles typical workflow progression', () => {
      const workOrder = createWorkOrder({
        internal_estimate_amount: 1000,
      })

      // Initial state: estimate needed, no approval yet
      workOrder.partner_estimate_approved = null
      expect(getPartnerFriendlyStatus('estimate_needed', workOrder)).toBe('Pending Your Approval')
      expect(getEstimateTabStatus(workOrder)?.badgeVariant).toBe('warning')

      // Partner approves estimate
      workOrder.partner_estimate_approved = true
      expect(getPartnerFriendlyStatus('estimate_approved', workOrder)).toBe('Approved - Ready to Start')
      expect(getEstimateTabStatus(workOrder)?.badgeVariant).toBe('success')

      // Work completed
      expect(getPartnerFriendlyStatus('completed', workOrder)).toBe('Completed')
    })

    it('handles estimate rejection and revision cycle', () => {
      const workOrder = createWorkOrder({
        internal_estimate_amount: 1000,
      })

      // Partner rejects initial estimate
      workOrder.partner_estimate_approved = false
      expect(getEstimateTabStatus(workOrder)?.badgeVariant).toBe('destructive')
      expect(getEstimateTabStatus(workOrder)?.badgeText).toBe('Rejected')

      // New estimate prepared
      workOrder.internal_estimate_amount = 800
      workOrder.partner_estimate_approved = null
      expect(getPartnerFriendlyStatus('estimate_needed', workOrder)).toBe('Pending Your Approval')
      expect(getEstimateTabStatus(workOrder)?.badgeVariant).toBe('warning')
    })
  })

  describe('performance characteristics', () => {
    it('handles large datasets efficiently', () => {
      const workOrders = Array.from({ length: 1000 }, (_, i) => 
        createWorkOrder({
          internal_estimate_amount: i * 100,
          partner_estimate_approved: i % 3 === 0 ? true : i % 3 === 1 ? false : null,
        })
      )

      const startTime = performance.now()
      
      workOrders.forEach((workOrder, i) => {
        getPartnerFriendlyStatus('estimate_needed', workOrder)
        getEstimateTabStatus(workOrder)
      })
      
      const endTime = performance.now()
      const executionTime = endTime - startTime
      
      // Should process 1000 items in under 100ms (very generous threshold)
      expect(executionTime).toBeLessThan(100)
    })

    it('maintains consistent output for identical inputs', () => {
      const workOrder = createWorkOrder({
        internal_estimate_amount: 1000,
        partner_estimate_approved: null,
      })

      const results = Array.from({ length: 100 }, () => ({
        status: getPartnerFriendlyStatus('estimate_needed', workOrder),
        tab: getEstimateTabStatus(workOrder),
      }))

      // All results should be identical
      const firstResult = results[0]
      results.forEach(result => {
        expect(result.status).toBe(firstResult.status)
        expect(result.tab).toEqual(firstResult.tab)
      })
    })
  })
})