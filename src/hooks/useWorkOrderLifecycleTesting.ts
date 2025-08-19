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
      // Test 1: Partner can create work order
      updateResult('Partner Work Order Creation', 'running');
      const { data: partnerUser } = await supabase
        .from('profiles')
        .select(`
          id, 
          organization_members!inner(
            organization_id,
            organizations!inner(organization_type)
          )
        `)
        .eq('organization_members.organizations.organization_type', 'partner')
        .limit(1)
        .single();

      if (!partnerUser || !partnerUser.organization_members?.[0]) {
        updateResult('Partner Work Order Creation', 'fail', 'No partner user with organization found');
      } else {
        // Get partner organization
        const { data: partnerOrg } = await supabase
          .from('organizations')
          .select('*')
          .eq('id', partnerUser.organization_members[0].organization_id)
          .single();

        // Create a test work order
        const { data: workOrder, error: createError } = await supabase
          .from('work_orders')
          .insert({
            title: 'Lifecycle Test Work Order',
            description: 'Test work order for lifecycle testing',
            organization_id: partnerOrg.id,
            status: 'received',
            created_by: partnerUser.id,
            store_location: 'Test Location',
            street_address: '123 Test St',
            city: 'Test City',
            state: 'TS',
            zip_code: '12345'
          })
          .select()
          .single();

        if (createError) {
          updateResult('Partner Work Order Creation', 'fail', createError.message);
        } else {
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
          } else {
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
            } else {
              // Create assignment
              const { data: adminUser } = await supabase
                .from('profiles')
                .select(`
                  id,
                  organization_members!inner(
                    role,
                    organizations!inner(organization_type)
                  )
                `)
                .eq('organization_members.organizations.organization_type', 'internal')
                .eq('organization_members.role', 'admin')
                .limit(1)
                .single();

              const { error: assignError } = await supabase
                .from('work_order_assignments')
                .insert({
                  work_order_id: workOrder.id,
                  assigned_to: subcontractorUser.id,
                  assigned_organization_id: subcontractorOrg.id,
                  assignment_type: 'lead',
                  assigned_by: adminUser.id,
                  notes: 'Test assignment for lifecycle testing'
                });

              if (assignError) {
                updateResult('Admin Assignment', 'fail', assignError.message);
              } else {
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
                    notes: 'Test report notes',
                    status: 'submitted'
                  })
                  .select()
                  .single();

                if (reportError) {
                  updateResult('Subcontractor Report Submission', 'fail', reportError.message);
                } else {
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
                      reviewed_by_user_id: adminUser.id,
                      reviewed_at: new Date().toISOString(),
                      review_notes: 'Test review - approved for lifecycle testing'
                    })
                    .eq('id', report.id);

                  if (reviewError) {
                    updateResult('Admin Report Review', 'fail', reviewError.message);
                  } else {
                    updateResult('Admin Report Review', 'pass', 'Report approved successfully');

                    // Test 5: Verify complete lifecycle data integrity
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

                    const hasAssignment = finalWorkOrder.work_order_assignments?.length > 0;
                    const hasReport = finalWorkOrder.work_order_reports?.length > 0;
                    const isCompleted = finalWorkOrder.status === 'completed';

                    if (hasAssignment && hasReport && isCompleted) {
                      updateResult('Data Integrity Check', 'pass', 'All lifecycle data is consistent');
                    } else {
                      updateResult('Data Integrity Check', 'fail', 
                        `Missing data: Assignment=${hasAssignment}, Report=${hasReport}, Completed=${isCompleted}`);
                    }
                  }
                }
              }
            }
          }
        }
      }

      // Test 6: Subcontractor access verification
      updateResult('Subcontractor Access Test', 'running');
      const { data: subcontractorWorkOrders } = await supabase
        .from('work_orders')
        .select('*, work_order_assignments(*)')
        .eq('assigned_organization_id', 'bb2ae131-3ca4-4cec-8e90-bec9d211f12e'); // AKC Contracting

      if (subcontractorWorkOrders && subcontractorWorkOrders.length > 0) {
        updateResult('Subcontractor Access Test', 'pass', 
          `Found ${subcontractorWorkOrders.length} work orders accessible to subcontractor`);
      } else {
        updateResult('Subcontractor Access Test', 'fail', 'No work orders accessible to subcontractor organization');
      }

      // Test 7: File upload integration
      updateResult('File Upload Integration', 'running');
      try {
        // Create a test blob to simulate file upload
        const testBlob = new Blob(['test file content'], { type: 'text/plain' });
        const testFile = new File([testBlob], 'test-file.txt', { type: 'text/plain' });
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('work-order-attachments')
          .upload(`test/${Date.now()}_test-file.txt`, testFile);

        if (uploadError) {
          updateResult('File Upload Integration', 'fail', uploadError.message);
        } else {
          // Clean up test file
          await supabase.storage
            .from('work-order-attachments')
            .remove([uploadData.path]);
          
          updateResult('File Upload Integration', 'pass', 'File upload and cleanup successful');
        }
      } catch (error: any) {
        updateResult('File Upload Integration', 'fail', error.message);
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