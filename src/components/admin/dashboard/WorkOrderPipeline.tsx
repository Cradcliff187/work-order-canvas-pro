import { useState } from 'react';
import { Package, UserCheck, Clock, FileText, CheckCircle } from 'lucide-react';
import { useWorkOrderPipeline, type WorkOrderSummary, type PipelineStage } from '@/hooks/useWorkOrderPipeline';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { PipelineStageModal } from './PipelineStageModal';

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
      <PipelineStageModal
        stage={selectedStage}
        isOpen={isModalOpen}
        onClose={handleModalClose}
      />
    </>
  );
}