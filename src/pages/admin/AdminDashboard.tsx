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
  DollarSign,
  RefreshCw
} from 'lucide-react';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { PieChart, Pie, Cell, BarChart, Bar, LineChart, Line, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';

import { ExecutiveSummary } from '@/components/admin/dashboard/ExecutiveSummary';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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


      <ExecutiveSummary />
    </div>
  );
};

export default AdminDashboard;