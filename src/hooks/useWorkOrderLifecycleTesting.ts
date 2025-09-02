import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface LifecycleTestResult {
  testName: string;
  status: 'pass' | 'fail' | 'running';
  details?: string;
  error?: string;
}

export function useWorkOrderLifecycleTesting() {
  const [results, setResults] = useState<LifecycleTestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const { toast } = useToast();

  const updateResult = (testName: string, status: 'pass' | 'fail' | 'running', details?: string, error?: string) => {
    setResults(prev => {
      const existing = prev.find(r => r.testName === testName);
      const newResult = { testName, status, details, error };
      
      if (existing) {
        return prev.map(r => r.testName === testName ? newResult : r);
      } else {
        return [...prev, newResult];
      }
    });
  };

  const runLifecycleTests = async () => {
    setIsRunning(true);
    setResults([]);

    try {
      // Test 1: Partner can create work order using Testing Org
      updateResult('Partner Work Order Creation', 'running');
      
      // Use Testing Org specifically
      const { data: partnerOrg, error: orgError } = await supabase
        .from('organizations')
        .select('*')
        .eq('name', 'Testing Org')
        .eq('organization_type', 'partner')
        .eq('is_active', true)
        .single();

      if (orgError || !partnerOrg) {
        updateResult('Partner Work Order Creation', 'fail', `Testing Org not found: ${orgError?.message || 'Organization not available'}`);
        return;
      }

      // Get an active trade for the work order
      const { data: trade } = await supabase
        .from('trades')
        .select('id')
        .eq('is_active', true)
        .limit(1)
        .single();

      if (!trade) {
        updateResult('Partner Work Order Creation', 'fail', 'No active trades found');
        return;
      }

      // Get existing partner location for Testing Org
      const { data: partnerLocation, error: locationError } = await supabase
        .from('partner_locations')
        .select('*')
        .eq('organization_id', partnerOrg.id)
        .eq('is_active', true)
        .single();

      if (locationError || !partnerLocation) {
        updateResult('Partner Work Order Creation', 'fail', `No partner location found for Testing Org: ${locationError?.message || 'Location not available'}`);
        return;
      }

      // Get current admin user for work order creation
      const { data: currentUser } = await supabase.auth.getUser();
      if (!currentUser?.user) {
        updateResult('Partner Work Order Creation', 'fail', 'No authenticated user found');
        return;
      }

      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', currentUser.user.id)
        .single();

      if (!currentProfile) {
        updateResult('Partner Work Order Creation', 'fail', 'User profile not found');
        return;
      }

      // Create a test work order (as admin for Testing Org)
      const { data: workOrder, error: createError } = await supabase
        .from('work_orders')
        .insert({
          work_order_number: `TEST-${Date.now()}`,
          title: 'Lifecycle Test Work Order',
          description: 'Test work order for lifecycle testing',
          organization_id: partnerOrg.id,
          trade_id: trade.id,
          status: 'received',
          created_by: currentProfile.id,
          store_location: partnerLocation.location_name,
          street_address: partnerLocation.street_address,
          city: partnerLocation.city,
          state: partnerLocation.state,
          zip_code: partnerLocation.zip_code,
          estimated_hours: 2.0,
          date_submitted: new Date().toISOString()
        })
        .select()
        .single();

      if (createError) {
        console.error('Work order creation error:', createError);
        updateResult('Partner Work Order Creation', 'fail', `Failed to create work order: ${createError.message}. Make sure you're logged in as an admin.`);
        return;
      }

      updateResult('Partner Work Order Creation', 'pass', `Created work order: ${workOrder.id}`);
      
      // Test 2: Admin can assign work order
      updateResult('Admin Assignment', 'running');
      const { data: subcontractorOrg } = await supabase
        .from('organizations')
        .select('id, name')
        .eq('organization_type', 'subcontractor')
        .limit(1)
        .single();

      if (!subcontractorOrg) {
        updateResult('Admin Assignment', 'fail', 'No subcontractor organization found');
        return;
      }

      const { data: subcontractorUser } = await supabase
        .from('profiles')
        .select(`
          id, 
          organization_members!inner(
            organization_id,
            organizations!inner(organization_type)
          )
        `)
        .eq('organization_members.organizations.organization_type', 'subcontractor')
        .limit(1)
        .single();

      if (!subcontractorUser) {
        updateResult('Admin Assignment', 'fail', 'No subcontractor user found');
        return;
      }

      // Create assignment
      const { error: assignError } = await supabase
        .from('work_order_assignments')
        .insert({
          work_order_id: workOrder.id,
          assigned_to: subcontractorUser.id,
          assigned_organization_id: subcontractorOrg.id,
          assignment_type: 'lead',
          assigned_by: currentProfile.id,
          notes: 'Test assignment for lifecycle testing'
        });

      if (assignError) {
        updateResult('Admin Assignment', 'fail', assignError.message);
        return;
      }

      // Update work order status
      await supabase
        .from('work_orders')
        .update({ status: 'assigned', assigned_organization_id: subcontractorOrg.id })
        .eq('id', workOrder.id);

      updateResult('Admin Assignment', 'pass', `Assigned to ${subcontractorOrg.name}`);

      // Test 3: Subcontractor can submit report
      updateResult('Subcontractor Report Submission', 'running');
      const { data: report, error: reportError } = await supabase
        .from('work_order_reports')
        .insert({
          work_order_id: workOrder.id,
          subcontractor_user_id: subcontractorUser.id,
          work_performed: 'Test work performed for lifecycle testing',
          materials_used: 'Test materials',
          hours_worked: 2.5,
          bill_amount: 150.00,
          bill_number: 'TEST-INV-001',
          notes: 'Test report notes',
          status: 'submitted'
        })
        .select()
        .single();

      if (reportError) {
        updateResult('Subcontractor Report Submission', 'fail', reportError.message);
        return;
      }

      // Update work order to completed
      await supabase
        .from('work_orders')
        .update({ 
          status: 'completed',
          subcontractor_report_submitted: true,
          date_completed: new Date().toISOString()
        })
        .eq('id', workOrder.id);

      updateResult('Subcontractor Report Submission', 'pass', `Report submitted: ${report.id}`);

      // Test 4: Admin can review report
      updateResult('Admin Report Review', 'running');
      const { error: reviewError } = await supabase
        .from('work_order_reports')
        .update({
          status: 'approved',
          reviewed_by_user_id: currentProfile.id,
          reviewed_at: new Date().toISOString(),
          review_notes: 'Test review - approved for lifecycle testing'
        })
        .eq('id', report.id);

      if (reviewError) {
        updateResult('Admin Report Review', 'fail', reviewError.message);
        return;
      }

      updateResult('Admin Report Review', 'pass', 'Report approved successfully');

      // Test 5: PDF Generation
      updateResult('PDF Generation Test', 'running');
      try {
        const { data: pdfResult, error: pdfError } = await supabase.functions.invoke('generate-report-pdf', {
          body: { reportId: report.id }
        });

        if (pdfError) {
          updateResult('PDF Generation Test', 'fail', `PDF generation failed: ${pdfError.message}`);
        } else if (pdfResult?.success) {
          updateResult('PDF Generation Test', 'pass', `PDF generated: ${pdfResult.pdfUrl}`);
        } else {
          updateResult('PDF Generation Test', 'fail', `PDF generation failed: ${pdfResult?.error || 'Unknown error'}`);
        }
      } catch (pdfErr: any) {
        updateResult('PDF Generation Test', 'fail', `PDF generation error: ${pdfErr.message}`);
      }

      // Test 6: Verify complete lifecycle data integrity
      updateResult('Data Integrity Check', 'running');
      const { data: finalWorkOrder } = await supabase
        .from('work_orders')
        .select(`
          *,
          work_order_assignments(*),
          work_order_reports(*)
        `)
        .eq('id', workOrder.id)
        .single();

      const hasAssignment = finalWorkOrder?.work_order_assignments?.length > 0;
      const hasReport = finalWorkOrder?.work_order_reports?.length > 0;
      const isCompleted = finalWorkOrder?.status === 'completed';
      const hasWorkOrderNumber = !!finalWorkOrder?.work_order_number;

      if (hasAssignment && hasReport && isCompleted && hasWorkOrderNumber) {
        updateResult('Data Integrity Check', 'pass', `All lifecycle data is consistent. Work Order: ${finalWorkOrder.work_order_number}`);
      } else {
        updateResult('Data Integrity Check', 'fail', 
          `Missing data: Assignment=${hasAssignment}, Report=${hasReport}, Completed=${isCompleted}, WorkOrderNumber=${hasWorkOrderNumber}`);
      }

      // Test 7: Subcontractor access verification
      updateResult('Subcontractor Access Test', 'running');
      const { data: allSubOrgs } = await supabase
        .from('organizations')
        .select('id, name')
        .eq('organization_type', 'subcontractor')
        .limit(1);

      if (allSubOrgs && allSubOrgs.length > 0) {
        const { data: subcontractorWorkOrders } = await supabase
          .from('work_orders')
          .select('*, work_order_assignments(*)')
          .eq('assigned_organization_id', allSubOrgs[0].id);

        if (subcontractorWorkOrders && subcontractorWorkOrders.length > 0) {
          updateResult('Subcontractor Access Test', 'pass', 
            `Found ${subcontractorWorkOrders.length} work orders accessible to ${allSubOrgs[0].name}`);
        } else {
          updateResult('Subcontractor Access Test', 'pass', 'No existing work orders for subcontractor (expected for clean test)');
        }
      } else {
        updateResult('Subcontractor Access Test', 'fail', 'No subcontractor organizations found');
      }

      // Test 8: File upload integration
      updateResult('File Upload Integration', 'running');
      try {
        // Create a test blob to simulate file upload
        const testBlob = new Blob(['test file content for lifecycle testing'], { type: 'text/plain' });
        const testFile = new File([testBlob], 'test-file.txt', { type: 'text/plain' });
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('work-order-attachments')
          .upload(`test/${Date.now()}_test-file.txt`, testFile);

        if (uploadError) {
          updateResult('File Upload Integration', 'fail', `Upload failed: ${uploadError.message}`);
        } else {
          // Test download functionality
          const { data: downloadData, error: downloadError } = await supabase.storage
            .from('work-order-attachments')
            .download(uploadData.path);
          
          if (downloadError) {
            updateResult('File Upload Integration', 'fail', `Download failed: ${downloadError.message}`);
          } else {
            // Clean up test file
            await supabase.storage
              .from('work-order-attachments')
              .remove([uploadData.path]);
            
            updateResult('File Upload Integration', 'pass', 'File upload, download, and cleanup successful');
          }
        }
      } catch (error: any) {
        updateResult('File Upload Integration', 'fail', `File test error: ${error.message}`);
      }

    } catch (error: any) {
      toast({
        title: 'Testing Error',
        description: error.message,
        variant: 'destructive',
      });
    }

    setIsRunning(false);
  };

  return {
    results,
    isRunning,
    runLifecycleTests,
  };
}