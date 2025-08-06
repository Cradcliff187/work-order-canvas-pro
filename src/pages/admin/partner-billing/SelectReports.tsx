import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { TableSkeleton } from '@/components/admin/shared/TableSkeleton';
import { MobileTableCard } from '@/components/admin/shared/MobileTableCard';
import { OrganizationSelector } from '@/components/admin/OrganizationSelector';
import { usePartnerUnbilledReports } from '@/hooks/usePartnerUnbilledReports';
import { FileBarChart, Building2, DollarSign, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

export default function SelectReports() {
  const [selectedPartnerId, setSelectedPartnerId] = useState<string>();

  const { data: reports, isLoading, error } = usePartnerUnbilledReports(selectedPartnerId);

  const totalSubcontractorCosts = reports?.reduce((sum, report) => sum + (report.subcontractor_costs || 0), 0) || 0;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/admin/dashboard">Dashboard</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Partner Billing</BreadcrumbPage>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Select Reports</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Partner Billing</h1>
          <p className="text-muted-foreground">
            Select approved reports to include in partner invoices
          </p>
        </div>
      </div>

      {/* Partner Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Select Partner Organization
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <OrganizationSelector
              value={selectedPartnerId}
              onChange={setSelectedPartnerId}
              organizationType="partner"
              placeholder="Choose a partner organization..."
              className="w-full max-w-md"
            />
            {selectedPartnerId && (
              <p className="text-sm text-muted-foreground">
                Partner selected. Showing unbilled approved reports below.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Reports Display */}
      {selectedPartnerId && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileBarChart className="w-5 h-5" />
                Unbilled Approved Reports
              </CardTitle>
              {reports && reports.length > 0 && (
                <div className="flex items-center gap-4">
                  <Badge variant="secondary">
                    {reports.length} report{reports.length !== 1 ? 's' : ''}
                  </Badge>
                  <Badge variant="outline" className="flex items-center gap-1">
                    <DollarSign className="w-3 h-3" />
                    ${totalSubcontractorCosts.toLocaleString()} total costs
                  </Badge>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {error ? (
              <EmptyState
                icon={FileBarChart}
                title="Error loading reports"
                description={error.message}
              />
            ) : isLoading ? (
              <TableSkeleton rows={3} columns={2} />
            ) : !reports || reports.length === 0 ? (
              <EmptyState
                icon={FileBarChart}
                title="No unbilled reports found"
                description="All approved reports for this partner have already been billed, or there are no approved reports yet."
              />
            ) : (
              <div className="space-y-3">
                {reports.map((report) => (
                  <MobileTableCard
                    key={report.id}
                    title={`Work Order ${report.work_orders?.work_order_number || 'N/A'}`}
                    subtitle={report.work_orders?.title || 'No title'}
                    status={
                      <div className="flex flex-col items-end gap-1">
                        <Badge variant="outline" className="text-green-600 border-green-600">
                          Approved
                        </Badge>
                        {report.subcontractor_costs && (
                          <Badge variant="secondary" className="text-xs">
                            ${report.subcontractor_costs.toLocaleString()}
                          </Badge>
                        )}
                      </div>
                    }
                  >
                    <div className="space-y-2">
                      {/* Work Order Details */}
                      <div className="text-sm text-muted-foreground">
                        <p className="truncate">
                          {report.work_orders?.description || 'No description'}
                        </p>
                      </div>
                      
                      {/* Dates and Location */}
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span>
                            Submitted: {format(new Date(report.submitted_at), 'MMM d, yyyy')}
                          </span>
                        </div>
                        {report.work_orders?.store_location && (
                          <span className="truncate">
                            {report.work_orders.store_location}
                          </span>
                        )}
                      </div>

                      {/* Subcontractor Info */}
                      {report.subcontractor_organization && (
                        <div className="text-xs">
                          <span className="text-muted-foreground">Completed by: </span>
                          <span className="font-medium">
                            {report.subcontractor_organization.name}
                          </span>
                        </div>
                      )}
                    </div>
                  </MobileTableCard>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}