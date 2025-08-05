import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Download, RotateCcw, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface AuditLogEntry {
  id: string;
  table_name: string;
  record_id: string;
  action: string;
  old_values: any;
  created_at: string;
}

interface RecoveryStats {
  work_orders: number;
  work_order_assignments: number;
  work_order_reports: number;
  work_order_attachments: number;
}

export function DataRecoveryUtility() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isRecovering, setIsRecovering] = useState(false);
  const [deletedData, setDeletedData] = useState<AuditLogEntry[]>([]);
  const [recoveryStats, setRecoveryStats] = useState<RecoveryStats | null>(null);
  const [hasAnalyzed, setHasAnalyzed] = useState(false);
  const { toast } = useToast();

  const analyzeDeletedData = async () => {
    setIsAnalyzing(true);
    try {
      // Query audit logs for DELETE actions around the incident time
      const { data: auditLogs, error } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('action', 'DELETE')
        .in('table_name', ['work_orders', 'work_order_assignments', 'work_order_reports', 'work_order_attachments'])
        .gte('created_at', '2025-08-05T18:30:00Z')
        .lte('created_at', '2025-08-05T18:35:00Z')
        .order('created_at', { ascending: true });

      if (error) throw error;

      setDeletedData(auditLogs || []);
      
      // Calculate recovery stats
      const stats: RecoveryStats = {
        work_orders: auditLogs?.filter(log => log.table_name === 'work_orders').length || 0,
        work_order_assignments: auditLogs?.filter(log => log.table_name === 'work_order_assignments').length || 0,
        work_order_reports: auditLogs?.filter(log => log.table_name === 'work_order_reports').length || 0,
        work_order_attachments: auditLogs?.filter(log => log.table_name === 'work_order_attachments').length || 0,
      };
      
      setRecoveryStats(stats);
      setHasAnalyzed(true);
      
      toast({
        title: "Analysis Complete",
        description: `Found ${auditLogs?.length || 0} deleted records that can be recovered.`,
      });
    } catch (error: any) {
      toast({
        title: "Analysis Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const recoverData = async () => {
    if (!deletedData.length) return;

    setIsRecovering(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      // Process recovery in the correct order due to foreign key constraints
      const tableOrder = ['work_orders', 'work_order_assignments', 'work_order_reports', 'work_order_attachments'];
      
        for (const tableName of tableOrder) {
        const recordsToRecover = deletedData.filter(log => log.table_name === tableName);
        
        for (const record of recordsToRecover) {
          try {
            if (!record.old_values) continue;
            
            // Clean the old_values data for insertion
            const cleanData = { ...record.old_values };
            delete cleanData.created_at; // Let the DB set new timestamps
            delete cleanData.updated_at;
            
            let insertResult;
            switch (tableName) {
              case 'work_orders':
                insertResult = await supabase.from('work_orders').insert(cleanData);
                break;
              case 'work_order_assignments':
                insertResult = await supabase.from('work_order_assignments').insert(cleanData);
                break;
              case 'work_order_reports':
                insertResult = await supabase.from('work_order_reports').insert(cleanData);
                break;
              case 'work_order_attachments':
                insertResult = await supabase.from('work_order_attachments').insert(cleanData);
                break;
              default:
                continue;
            }
            
            const { error } = insertResult;
              
            if (error) {
              console.error(`Failed to recover ${tableName} record ${record.record_id}:`, error);
              errorCount++;
            } else {
              successCount++;
            }
          } catch (err) {
            console.error(`Error processing ${tableName} record:`, err);
            errorCount++;
          }
        }
      }

      toast({
        title: "Recovery Complete",
        description: `Successfully recovered ${successCount} records. ${errorCount} errors encountered.`,
        variant: successCount > 0 ? "default" : "destructive",
      });

      if (successCount > 0) {
        // Refresh the page to show recovered data
        window.location.reload();
      }
      
    } catch (error: any) {
      toast({
        title: "Recovery Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsRecovering(false);
    }
  };

  const exportAuditData = () => {
    if (!deletedData.length) return;
    
    const dataStr = JSON.stringify(deletedData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `deleted-data-backup-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="h-5 w-5" />
          Data Recovery Utility
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Critical Data Loss Detected:</strong> Work order data was deleted on 2025-08-05 at 18:32:04 UTC. 
            This utility can recover data from audit logs.
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <Button 
            onClick={analyzeDeletedData} 
            disabled={isAnalyzing}
            className="w-full"
          >
            {isAnalyzing ? 'Analyzing...' : 'Analyze Deleted Data'}
          </Button>

          {hasAnalyzed && recoveryStats && (
            <div className="bg-muted p-4 rounded-lg space-y-2">
              <h4 className="font-semibold">Recovery Analysis:</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>Work Orders: {recoveryStats.work_orders}</div>
                <div>Assignments: {recoveryStats.work_order_assignments}</div>
                <div>Reports: {recoveryStats.work_order_reports}</div>
                <div>Attachments: {recoveryStats.work_order_attachments}</div>
              </div>
              <div className="font-medium">
                Total Recoverable Records: {Object.values(recoveryStats).reduce((a, b) => a + b, 0)}
              </div>
            </div>
          )}

          {hasAnalyzed && deletedData.length > 0 && (
            <div className="flex gap-2">
              <Button 
                onClick={recoverData} 
                disabled={isRecovering}
                className="flex-1"
                variant="default"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                {isRecovering ? 'Recovering...' : 'Recover All Data'}
              </Button>
              
              <Button 
                onClick={exportAuditData}
                variant="outline"
                className="flex-1"
              >
                <Download className="h-4 w-4 mr-2" />
                Export Backup
              </Button>
            </div>
          )}

          {hasAnalyzed && deletedData.length === 0 && (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-4 w-4" />
              No deleted data found in the specified time range.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}