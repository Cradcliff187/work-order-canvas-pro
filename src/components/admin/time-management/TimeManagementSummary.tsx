import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, DollarSign, Users, AlertCircle, TrendingUp, Timer } from 'lucide-react';
import { SummaryStats } from '@/hooks/useTimeManagement';

interface TimeManagementSummaryProps {
  stats: SummaryStats;
}

export function TimeManagementSummary({ stats }: TimeManagementSummaryProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatHours = (hours: number) => {
    return `${hours.toFixed(1)}h`;
  };

  const summaryCards = [
    {
      title: 'Total Hours',
      value: formatHours(stats.totalHours),
      icon: Clock,
      description: 'All tracked hours',
      color: 'text-blue-600',
    },
    {
      title: 'Labor Cost',
      value: formatCurrency(stats.totalLaborCost),
      icon: DollarSign,
      description: 'Total labor expenses',
      color: 'text-green-600',
    },
    {
      title: 'Materials Cost',
      value: formatCurrency(stats.totalMaterialsCost),
      icon: TrendingUp,
      description: 'Attached receipts',
      color: 'text-purple-600',
    },
    {
      title: 'Pending Approval',
      value: stats.pendingApproval.toString(),
      icon: AlertCircle,
      description: 'Entries awaiting review',
      color: 'text-orange-600',
    },
    {
      title: 'Avg Hours/Employee',
      value: formatHours(stats.avgHoursPerEmployee),
      icon: Users,
      description: 'Average per employee',
      color: 'text-cyan-600',
    },
    {
      title: 'Overtime Hours',
      value: formatHours(stats.overtimeHours),
      icon: Timer,
      description: 'Hours over 8 per day',
      color: 'text-red-600',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {summaryCards.map((card, index) => {
        const Icon = card.icon;
        return (
          <Card key={index} className="relative overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {card.title}
              </CardTitle>
              <Icon className={`h-4 w-4 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
              <p className="text-xs text-muted-foreground">
                {card.description}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}