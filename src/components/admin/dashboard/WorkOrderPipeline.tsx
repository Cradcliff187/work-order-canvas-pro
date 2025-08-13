import { useState } from 'react';
import { Package, UserCheck, Clock, FileText, CheckCircle } from 'lucide-react';
import { useWorkOrderPipeline, type WorkOrderSummary, type PipelineStage } from '@/hooks/useWorkOrderPipeline';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate } from 'react-router-dom';

const STAGE_ICONS = {
  'New': Package,
  'Assigned': UserCheck,
  'In Progress': Clock,
  'Awaiting Reports': FileText,
  'Completed': CheckCircle,
};

const STAGE_COLORS = {
  'New': 'text-muted-foreground',
  'Assigned': 'text-primary',
  'In Progress': 'text-warning',
  'Awaiting Reports': 'text-warning',
  'Completed': 'text-success',
};

interface PipelineStageCardProps {
  stage: PipelineStage;
  onClick: () => void;
}

function PipelineStageCard({ stage, onClick }: PipelineStageCardProps) {
  const Icon = STAGE_ICONS[stage.stageName as keyof typeof STAGE_ICONS];
  const iconColorClass = STAGE_COLORS[stage.stageName as keyof typeof STAGE_COLORS];

  return (
    <Card 
      className="cursor-pointer hover:shadow-md smooth-transition-colors group border-border/50 hover:border-primary/20"
      onClick={onClick}
    >
      <CardContent className="p-4 space-y-3">
        {/* Header with icon and stage name */}
        <div className="flex items-center gap-2">
          <Icon className={`h-5 w-5 ${iconColorClass} group-hover:text-primary smooth-transition-colors`} />
          <h3 className="font-medium text-sm text-foreground truncate">{stage.stageName}</h3>
        </div>

        {/* Total count - prominent display */}
        <div className="text-center">
          <div className="text-3xl font-bold text-foreground group-hover:text-primary smooth-transition-colors">
            {stage.totalCount}
          </div>
        </div>

        {/* Badges row */}
        <div className="flex justify-center gap-2 min-h-[20px]">
          {stage.recentCount > 0 && (
            <Badge variant="secondary" className="text-xs px-2 py-0.5">
              {stage.recentCount} new
            </Badge>
          )}
          {stage.overdueCount > 0 && (
            <Badge variant="destructive" className="text-xs px-2 py-0.5">
              {stage.overdueCount} overdue
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface WorkOrderModalProps {
  stage: PipelineStage | null;
  isOpen: boolean;
  onClose: () => void;
}

function WorkOrderModal({ stage, isOpen, onClose }: WorkOrderModalProps) {
  const navigate = useNavigate();

  if (!stage) return null;

  const handleWorkOrderClick = (workOrderId: string) => {
    navigate(`/admin/work-orders/${workOrderId}`);
    onClose();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const isOverdue = (dueDateString: string | null) => {
    if (!dueDateString) return false;
    return new Date(dueDateString) < new Date();
  };

  const getPriorityColor = (priority: 'low' | 'standard' | 'high' | 'urgent') => {
    switch (priority) {
      case 'urgent': return 'destructive';
      case 'high': return 'destructive';
      case 'standard': return 'secondary';
      case 'low': return 'outline';
      default: return 'secondary';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-foreground">{stage.stageName}</span>
            <Badge variant="outline" className="ml-2">
              {stage.totalCount} total
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="overflow-y-auto space-y-3 pr-2">
          {stage.workOrders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No work orders in this stage
            </div>
          ) : (
            stage.workOrders.map((workOrder) => (
              <Card 
                key={workOrder.id}
                className="cursor-pointer hover:shadow-sm smooth-transition-colors hover:border-primary/20"
                onClick={() => handleWorkOrderClick(workOrder.id)}
              >
                <CardContent className="p-4">
                  <div className="flex justify-between items-start gap-4">
                    <div className="space-y-2 flex-1 min-w-0">
                      {/* Work order number and title */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground">
                            {workOrder.work_order_number || 'No Number'}
                          </span>
                          <Badge variant={getPriorityColor(workOrder.priority)} className="text-xs">
                            {workOrder.priority}
                          </Badge>
                        </div>
                        <h4 className="font-semibold text-foreground truncate">
                          {workOrder.title}
                        </h4>
                      </div>

                      {/* Organization and location */}
                      <div className="space-y-1 text-sm text-muted-foreground">
                        {workOrder.organization_name && (
                          <div className="truncate">
                            <span className="font-medium">Organization:</span> {workOrder.organization_name}
                          </div>
                        )}
                        {workOrder.store_location && (
                          <div className="truncate">
                            <span className="font-medium">Location:</span> {workOrder.store_location}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right side - dates and status */}
                    <div className="text-right space-y-1 flex-shrink-0">
                      <div className="text-xs text-muted-foreground">
                        Submitted: {formatDate(workOrder.date_submitted)}
                      </div>
                      {workOrder.due_date && (
                        <div className={`text-xs ${isOverdue(workOrder.due_date) ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                          Due: {formatDate(workOrder.due_date)}
                          {isOverdue(workOrder.due_date) && (
                            <Badge variant="destructive" className="ml-1 text-xs">
                              Overdue
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}

          {stage.totalCount > 5 && (
            <div className="text-center py-4 text-sm text-muted-foreground">
              Showing 5 of {stage.totalCount} work orders
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PipelineSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      {Array.from({ length: 5 }).map((_, index) => (
        <Card key={index}>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-5 rounded" />
              <Skeleton className="h-4 w-20" />
            </div>
            <div className="text-center">
              <Skeleton className="h-8 w-12 mx-auto" />
            </div>
            <div className="flex justify-center gap-2">
              <Skeleton className="h-5 w-12 rounded-full" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function WorkOrderPipeline() {
  const { data: pipelineData, isLoading, error } = useWorkOrderPipeline();
  const [selectedStage, setSelectedStage] = useState<PipelineStage | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleStageClick = (stage: PipelineStage) => {
    setSelectedStage(stage);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedStage(null);
  };

  if (isLoading) {
    return <PipelineSkeleton />;
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <div className="text-destructive">
            Failed to load pipeline data. Please try again.
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!pipelineData) {
    return null;
  }

  const stages = [
    pipelineData.new,
    pipelineData.assigned,
    pipelineData.inProgress,
    pipelineData.awaitingReports,
    pipelineData.completed,
  ];

  return (
    <>
      {/* Desktop and tablet grid */}
      <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-5 gap-4">
        {stages.map((stage) => (
          <PipelineStageCard
            key={stage.stageName}
            stage={stage}
            onClick={() => handleStageClick(stage)}
          />
        ))}
      </div>

      {/* Mobile: horizontal scroll */}
      <div className="md:hidden">
        <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
          {stages.map((stage) => (
            <div key={stage.stageName} className="flex-shrink-0 w-40">
              <PipelineStageCard
                stage={stage}
                onClick={() => handleStageClick(stage)}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Modal for work order details */}
      <WorkOrderModal
        stage={selectedStage}
        isOpen={isModalOpen}
        onClose={handleModalClose}
      />
    </>
  );
}