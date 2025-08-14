import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useAdminDashboard } from '@/hooks/useAdminDashboard';
import { 
  FileText, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  TrendingUp, 
  TrendingDown,
  Plus,
  ClipboardList,
  Users as UsersIcon,
  DollarSign
} from 'lucide-react';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { PieChart, Pie, Cell, BarChart, Bar, LineChart, Line, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';

import { ExecutiveSummary } from '@/components/admin/dashboard/ExecutiveSummary';
import { WorkOrderPipeline } from '@/components/admin/dashboard/WorkOrderPipeline';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SmartSearchInput } from '@/components/ui/smart-search-input';

const COLORS = {
  received: 'hsl(var(--primary))',
  assigned: 'hsl(var(--warning))', 
  in_progress: 'hsl(210 95% 56%)',
  completed: 'hsl(var(--success))',
  cancelled: 'hsl(var(--destructive))',
};

const AdminDashboard = () => {
  const navigate = useNavigate();
  const {
    metrics,
    statusDistribution,
    dailySubmissions,
    tradeVolumes,
    recentWorkOrders,
    recentReports,
    isLoading,
    isError
  } = useAdminDashboard();

  const [search, setSearch] = React.useState('');
  const workOrderSuggestions = React.useMemo(
    () => (recentWorkOrders ?? []).map((wo) => ({
      id: wo.id,
      label: wo.work_order_number || wo.title,
      subtitle: wo.title,
    })),
    [recentWorkOrders]
  );

  const navigateToInvoices = (filter?: string) => {
    const params = new URLSearchParams();
    if (filter === 'pending') {
      params.set('status', 'submitted');
    } else if (filter === 'unpaid') {
      params.set('paymentStatus', 'unpaid');
      params.set('status', 'approved');
    } else if (filter === 'paid') {
      params.set('paymentStatus', 'paid');
    }
    navigate(`/admin/invoices?${params.toString()}`);
  };

  return isError ? (
    <div className="container mx-auto px-6 py-8">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-destructive mb-2">Error Loading Dashboard</h1>
        <p className="text-muted-foreground">Please try refreshing the page or check your connection.</p>
      </div>
    </div>
  ) : (
    <div className="space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
        <p className="text-muted-foreground">Monitor system performance and manage work orders</p>
      </div>

      <div className="mb-6 space-y-3" role="search">
        <SmartSearchInput
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search work orders, assignees, locations..."
          storageKey="admin-dashboard-search-recents"
          workOrders={workOrderSuggestions}
          onSearchSubmit={(q) => navigate(`/admin/work-orders?search=${encodeURIComponent(q)}`)}
          onSelectSuggestion={(item) => {
            navigate(`/admin/work-orders?search=${encodeURIComponent(item.label)}`)
          }}
        />
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar" aria-label="Quick filters">
          <Button variant="outline" size="sm" onClick={() => navigate('/admin/work-orders?preset=my')}>My Orders</Button>
          <Button variant="outline" size="sm" onClick={() => navigate('/admin/work-orders?preset=urgent')}>Urgent</Button>
          <Button variant="outline" size="sm" onClick={() => navigate('/admin/work-orders?preset=today')}>Today</Button>
          <Button variant="ghost" size="sm" onClick={() => setSearch('')}>Clear</Button>
        </div>
      </div>

      <Tabs defaultValue="pipeline" className="w-full">
        <div className="overflow-x-auto -mx-4 px-4 no-scrollbar">
          <TabsList className="inline-flex min-w-max mb-8">
            <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
            <TabsTrigger value="executive">Executive Summary</TabsTrigger>
          </TabsList>
        </div>
        
        <TabsContent value="pipeline" className="space-y-6">
          <WorkOrderPipeline />
        </TabsContent>
        
        <TabsContent value="executive" className="space-y-6">
          <ExecutiveSummary />
        </TabsContent>
        
      </Tabs>
    </div>
  );
};

export default AdminDashboard;