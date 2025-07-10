import { useLocation, useParams, Link } from 'react-router-dom';
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Skeleton } from '@/components/ui/skeleton';
import { useWorkOrderDetail } from '@/hooks/useWorkOrderDetail';

interface WorkOrderBreadcrumbProps {
  className?: string;
}

export function WorkOrderBreadcrumb({ className }: WorkOrderBreadcrumbProps) {
  const location = useLocation();
  const params = useParams<{ id: string }>();
  const { data: workOrder, isLoading } = useWorkOrderDetail(params.id || '');

  const isListPage = location.pathname === '/admin/work-orders';
  const isDetailPage = location.pathname === `/admin/work-orders/${params.id}`;
  const isEditPage = location.pathname === `/admin/work-orders/${params.id}/edit`;

  // Show loading skeleton if we're on detail/edit page and work order is loading
  if ((isDetailPage || isEditPage) && isLoading) {
    return (
      <div className={className}>
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/admin/work-orders">Work Orders</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <Skeleton className="h-4 w-32" />
            </BreadcrumbItem>
            {isEditPage && (
              <>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <Skeleton className="h-4 w-16" />
                </BreadcrumbItem>
              </>
            )}
          </BreadcrumbList>
        </Breadcrumb>
      </div>
    );
  }

  return (
    <div className={className}>
      <Breadcrumb>
        <BreadcrumbList>
          {/* Always show Work Orders as first item */}
          <BreadcrumbItem>
            {isListPage ? (
              <BreadcrumbPage>Work Orders</BreadcrumbPage>
            ) : (
              <>
                <BreadcrumbLink asChild>
                  <Link to="/admin/work-orders">Work Orders</Link>
                </BreadcrumbLink>
                <BreadcrumbSeparator />
              </>
            )}
          </BreadcrumbItem>

          {/* Show work order detail if on detail or edit page */}
          {(isDetailPage || isEditPage) && (
            <BreadcrumbItem>
              {isDetailPage ? (
                <BreadcrumbPage>
                  Work Order {workOrder?.work_order_number || `#${params.id?.slice(-8)}`}
                </BreadcrumbPage>
              ) : (
                <>
                  <BreadcrumbLink asChild>
                    <Link to={`/admin/work-orders/${params.id}`}>
                      Work Order {workOrder?.work_order_number || `#${params.id?.slice(-8)}`}
                    </Link>
                  </BreadcrumbLink>
                  <BreadcrumbSeparator />
                </>
              )}
            </BreadcrumbItem>
          )}

          {/* Show edit if on edit page */}
          {isEditPage && (
            <BreadcrumbItem>
              <BreadcrumbPage>Edit</BreadcrumbPage>
            </BreadcrumbItem>
          )}
        </BreadcrumbList>
      </Breadcrumb>
    </div>
  );
}