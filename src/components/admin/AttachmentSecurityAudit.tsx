import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Shield, AlertTriangle, Eye, EyeOff, Download, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface AttachmentAuditItem {
  id: string;
  work_order_id: string;
  work_order_number?: string;
  file_name: string;
  is_internal: boolean;
  uploaded_by_user_id: string;
  uploader_name: string;
  uploader_org_type: string;
  uploaded_at: string;
  security_risk_level: 'low' | 'medium' | 'high' | 'critical';
  visibility_notes: string[];
}

interface SecurityStats {
  totalAttachments: number;
  internalAttachments: number;
  publicAttachments: number;
  partnerUploads: number;
  subcontractorUploads: number;
  adminUploads: number;
  riskDistribution: Record<string, number>;
}

export function AttachmentSecurityAudit() {
  const [auditData, setAuditData] = useState<AttachmentAuditItem[]>([]);
  const [securityStats, setSecurityStats] = useState<SecurityStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastAuditTime, setLastAuditTime] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'internal' | 'high-risk'>('all');

  const runSecurityAudit = async () => {
    setIsLoading(true);
    
    try {
      // Fetch all attachments with work order and uploader details
      const { data: attachments, error } = await supabase
        .from('work_order_attachments')
        .select(`
          id,
          work_order_id,
          file_name,
          is_internal,
          uploaded_by_user_id,
          uploaded_at,
          work_orders!inner(
            work_order_number,
            organization_id,
            organizations(name, organization_type)
          ),
          uploaded_by_user:profiles!work_order_attachments_uploaded_by_user_id_fkey(
            id,
            first_name,
            last_name
          )
        `)
        .order('uploaded_at', { ascending: false });

      if (error) {
        console.error('Audit query error:', error);
        return;
      }

      // Get organization data for uploaders
      const uploaderIds = attachments?.map(a => a.uploaded_by_user_id) || [];
      const { data: orgData } = await supabase
        .from('organization_members')
        .select(`
          user_id,
          organizations!organization_id(
            name,
            organization_type
          )
        `)
        .in('user_id', uploaderIds);

      // Process audit data
      const auditItems: AttachmentAuditItem[] = attachments?.map(attachment => {
        const uploaderOrg = orgData?.find(org => org.user_id === attachment.uploaded_by_user_id);
        const uploaderOrgType = uploaderOrg?.organizations?.organization_type || 'unknown';
        const uploaderName = attachment.uploaded_by_user ? 
          `${attachment.uploaded_by_user.first_name} ${attachment.uploaded_by_user.last_name}` : 
          'Unknown User';

        // Calculate security risk
        let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
        const visibilityNotes: string[] = [];

        if (attachment.is_internal) {
          if (uploaderOrgType === 'partner') {
            riskLevel = 'critical';
            visibilityNotes.push('⚠️ Internal file uploaded by partner organization');
          } else if (uploaderOrgType === 'internal') {
            riskLevel = 'medium';
            visibilityNotes.push('🔒 Internal file - restricted visibility');
          }
        } else {
          if (uploaderOrgType === 'partner') {
            riskLevel = 'low';
            visibilityNotes.push('👥 Public file from partner - visible to all');
          } else if (uploaderOrgType === 'subcontractor') {
            riskLevel = 'low';
            visibilityNotes.push('🔧 Public file from subcontractor');
          } else {
            riskLevel = 'low';
            visibilityNotes.push('📋 Public file from admin');
          }
        }

        // Add visibility rules
        if (attachment.is_internal) {
          visibilityNotes.push('❌ Hidden from partners');
          visibilityNotes.push('✅ Visible to subcontractors');
          visibilityNotes.push('✅ Visible to admins');
        } else {
          visibilityNotes.push('✅ Visible to all user types');
        }

        return {
          id: attachment.id,
          work_order_id: attachment.work_order_id,
          work_order_number: attachment.work_orders?.work_order_number,
          file_name: attachment.file_name,
          is_internal: attachment.is_internal || false,
          uploaded_by_user_id: attachment.uploaded_by_user_id,
          uploader_name: uploaderName,
          uploader_org_type: uploaderOrgType,
          uploaded_at: attachment.uploaded_at,
          security_risk_level: riskLevel,
          visibility_notes: visibilityNotes
        };
      }) || [];

      // Calculate security statistics
      const stats: SecurityStats = {
        totalAttachments: auditItems.length,
        internalAttachments: auditItems.filter(item => item.is_internal).length,
        publicAttachments: auditItems.filter(item => !item.is_internal).length,
        partnerUploads: auditItems.filter(item => item.uploader_org_type === 'partner').length,
        subcontractorUploads: auditItems.filter(item => item.uploader_org_type === 'subcontractor').length,
        adminUploads: auditItems.filter(item => item.uploader_org_type === 'internal').length,
        riskDistribution: {
          low: auditItems.filter(item => item.security_risk_level === 'low').length,
          medium: auditItems.filter(item => item.security_risk_level === 'medium').length,
          high: auditItems.filter(item => item.security_risk_level === 'high').length,
          critical: auditItems.filter(item => item.security_risk_level === 'critical').length,
        }
      };

      setAuditData(auditItems);
      setSecurityStats(stats);
      setLastAuditTime(new Date().toLocaleString());
      
    } catch (error) {
      console.error('Security audit failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    runSecurityAudit();
  }, []);

  const filteredData = auditData.filter(item => {
    switch (filter) {
      case 'internal':
        return item.is_internal;
      case 'high-risk':
        return ['high', 'critical'].includes(item.security_risk_level);
      default:
        return true;
    }
  });

  const getRiskBadgeVariant = (risk: string) => {
    switch (risk) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'default';
      default: return 'secondary';
    }
  };

  const exportAuditData = () => {
    const csvContent = [
      ['File Name', 'Work Order', 'Internal', 'Uploader', 'Org Type', 'Risk Level', 'Upload Date'].join(','),
      ...filteredData.map(item => [
        item.file_name,
        item.work_order_number || item.work_order_id,
        item.is_internal ? 'Yes' : 'No',
        item.uploader_name,
        item.uploader_org_type,
        item.security_risk_level,
        new Date(item.uploaded_at).toLocaleDateString()
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attachment-security-audit-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Attachment Security Audit
          </CardTitle>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Review attachment visibility and security compliance
            </p>
            <div className="flex gap-2">
              <Button 
                onClick={exportAuditData}
                variant="outline"
                size="sm"
                disabled={filteredData.length === 0}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Export
              </Button>
              <Button 
                onClick={runSecurityAudit}
                disabled={isLoading}
                size="sm"
                className="gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        
        {securityStats && (
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold">{securityStats.totalAttachments}</p>
                <p className="text-sm text-muted-foreground">Total Files</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-amber-600">{securityStats.internalAttachments}</p>
                <p className="text-sm text-muted-foreground">Internal Files</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{securityStats.publicAttachments}</p>
                <p className="text-sm text-muted-foreground">Public Files</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-red-600">{securityStats.riskDistribution.critical}</p>
                <p className="text-sm text-muted-foreground">Critical Risk</p>
              </div>
            </div>
            
            {securityStats.riskDistribution.critical > 0 && (
              <Alert className="mt-4 border-red-200 bg-red-50">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">
                  🚨 {securityStats.riskDistribution.critical} critical security risk(s) detected! Review immediately.
                </AlertDescription>
              </Alert>
            )}
            
            {lastAuditTime && (
              <p className="text-xs text-muted-foreground mt-4">
                Last audit: {lastAuditTime}
              </p>
            )}
          </CardContent>
        )}
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-2">
            <Button 
              variant={filter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('all')}
            >
              All Files ({auditData.length})
            </Button>
            <Button 
              variant={filter === 'internal' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('internal')}
            >
              Internal Only ({auditData.filter(item => item.is_internal).length})
            </Button>
            <Button 
              variant={filter === 'high-risk' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('high-risk')}
            >
              High Risk ({auditData.filter(item => ['high', 'critical'].includes(item.security_risk_level)).length})
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Audit Results */}
      <Card>
        <CardContent className="p-0">
          <ScrollArea className="h-[600px]">
            <div className="p-6 space-y-4">
              {filteredData.map((item) => (
                <Card key={item.id} className={`border-l-4 ${
                  item.security_risk_level === 'critical' ? 'border-l-red-500' :
                  item.security_risk_level === 'high' ? 'border-l-orange-500' :
                  item.security_risk_level === 'medium' ? 'border-l-yellow-500' :
                  'border-l-green-500'
                }`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {item.is_internal ? 
                          <EyeOff className="h-4 w-4 text-amber-600" /> : 
                          <Eye className="h-4 w-4 text-green-600" />
                        }
                        <h4 className="font-medium">{item.file_name}</h4>
                      </div>
                      <Badge variant={getRiskBadgeVariant(item.security_risk_level)}>
                        {item.security_risk_level.toUpperCase()}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="font-medium">Work Order:</p>
                        <p className="text-muted-foreground">{item.work_order_number || item.work_order_id}</p>
                      </div>
                      <div>
                        <p className="font-medium">Uploaded by:</p>
                        <p className="text-muted-foreground">{item.uploader_name}</p>
                        <Badge variant="outline" className="text-xs">
                          {item.uploader_org_type}
                        </Badge>
                      </div>
                      <div>
                        <p className="font-medium">Upload Date:</p>
                        <p className="text-muted-foreground">
                          {new Date(item.uploaded_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-sm font-medium mb-1">Visibility Rules:</p>
                      <div className="space-y-1">
                        {item.visibility_notes.map((note, index) => (
                          <p key={index} className="text-xs text-muted-foreground">
                            {note}
                          </p>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {filteredData.length === 0 && !isLoading && (
                <div className="text-center py-8">
                  <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No files match the current filter</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}