
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { Link, useSearchParams } from 'react-router-dom';

export interface WorkOrderBreadcrumbProps {
  workOrderId?: string;
  currentPage?: string;
}

export function WorkOrderBreadcrumb({ workOrderId, currentPage }: WorkOrderBreadcrumbProps) {
  const [searchParams] = useSearchParams();
  const from = searchParams.get('from');
  
  // Determine the correct path based on context
  const getWorkOrdersPath = () => {
    if (from === 'billing-pipeline') {
      return '/admin/billing-dashboard';
    }
    return '/admin/work-orders';
  };
  
  const getWorkOrdersLabel = () => {
    if (from === 'billing-pipeline') {
      return 'Billing Dashboard';
    }
    return 'Work Orders';
  };

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link to="/admin/dashboard">Dashboard</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link to={getWorkOrdersPath()}>{getWorkOrdersLabel()}</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        {workOrderId && (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to={`/admin/work-orders/${workOrderId}`}>
                  {workOrderId.slice(0, 8)}...
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
          </>
        )}
        {currentPage && (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{currentPage}</BreadcrumbPage>
            </BreadcrumbItem>
          </>
        )}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
