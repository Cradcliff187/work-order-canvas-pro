import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  MessageCircle, 
  MessageSquare, 
  Users, 
  Clock, 
  Activity, 
  Wifi, 
  WifiOff,
  TrendingUp,
  Eye,
  Timer,
  RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMessagingHealth } from '@/hooks/useMessagingHealth';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export const MessagingSystemTab: React.FC = () => {
  const { data: messagingHealth, isLoading, error, refetch } = useMessagingHealth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-destructive">
            Error loading messaging health data
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!messagingHealth) return null;

  const getConnectionStatusColor = (quality: string) => {
    switch (quality) {
      case 'excellent': return 'bg-green-500';
      case 'good': return 'bg-blue-500';
      case 'poor': return 'bg-yellow-500';
      default: return 'bg-red-500';
    }
  };

  const getConnectionStatusVariant = (quality: string) => {
    switch (quality) {
      case 'excellent': return 'default';
      case 'good': return 'secondary';
      case 'poor': return 'warning' as any;
      default: return 'destructive';
    }
  };

  const pieColors = ['hsl(var(--primary))', 'hsl(var(--secondary))'];

  return (
    <div className="space-y-6">
      {/* Header with Refresh Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Messaging System Health</h2>
          <p className="text-sm text-muted-foreground">Real-time messaging performance and health metrics</p>
        </div>
        <Button onClick={() => refetch()} variant="outline" size="sm" disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>
      {/* Message Queue Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Message Queue Status
          </CardTitle>
          <CardDescription>
            Real-time message processing and delivery metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-primary">{messagingHealth.queueStatus.total24h}</div>
              <div className="text-sm text-muted-foreground">Messages (24h)</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{messagingHealth.queueStatus.offlineQueueSize}</div>
              <div className="text-sm text-muted-foreground">Offline Queue</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-red-600">{messagingHealth.queueStatus.failedMessages}</div>
              <div className="text-sm text-muted-foreground">Failed Messages</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-green-600">{messagingHealth.queueStatus.averageDeliveryTime}s</div>
              <div className="text-sm text-muted-foreground">Avg Delivery Time</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Read Receipt Analytics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Read Receipt Analytics
          </CardTitle>
          <CardDescription>
            Message engagement and read status tracking
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Work Orders with Most Unread Messages
              </h4>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Work Order</TableHead>
                    <TableHead className="text-right">Unread</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {messagingHealth.readReceipts.unreadByWorkOrder.slice(0, 5).map((item) => (
                    <TableRow key={item.work_order_id}>
                      <TableCell>{item.work_order_number}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant="secondary">{item.unread_count}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div>
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <Users className="h-4 w-4" />
                Users with Most Unread Messages
              </h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 border rounded">
                  <Timer className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Average time to read</span>
                  <Badge variant="outline">{messagingHealth.readReceipts.averageTimeToRead} min</Badge>
                </div>
                {messagingHealth.readReceipts.usersWithMostUnread.map((user) => (
                  <div key={user.user_id} className="flex items-center justify-between p-2 border rounded">
                    <span className="text-sm">{user.user_name}</span>
                    <Badge variant="secondary">{user.unread_count}</Badge>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Message Volume Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Message Volume Metrics
          </CardTitle>
          <CardDescription>
            Message activity patterns and distribution analysis
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-3">Messages per Hour (Last 24h)</h4>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={messagingHealth.volumeMetrics.hourlyMessages}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hour" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div>
              <h4 className="font-semibold mb-3">Public vs Internal Messages</h4>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Public', value: messagingHealth.volumeMetrics.publicVsInternal.public },
                      { name: 'Internal', value: messagingHealth.volumeMetrics.publicVsInternal.internal }
                    ]}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {[0, 1].map((_, index) => (
                      <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-3 text-center text-sm text-muted-foreground">
                <div className="flex justify-center gap-4">
                  <span className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-primary"></div>
                    Public ({messagingHealth.volumeMetrics.publicVsInternal.public})
                  </span>
                  <span className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-secondary"></div>
                    Internal ({messagingHealth.volumeMetrics.publicVsInternal.internal})
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-6">
            <h4 className="font-semibold mb-3">Most Active Work Orders</h4>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Work Order</TableHead>
                  <TableHead className="text-right">Messages</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {messagingHealth.volumeMetrics.mostActiveWorkOrders.map((item) => (
                  <TableRow key={item.work_order_id}>
                    <TableCell>{item.work_order_number}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline">{item.message_count}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Real-time Health Indicators */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Real-time Health Indicators
          </CardTitle>
          <CardDescription>
            WebSocket connectivity and real-time performance status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-2">
                {messagingHealth.realtimeHealth.websocketConnected ? (
                  <Wifi className="h-5 w-5 text-green-600" />
                ) : (
                  <WifiOff className="h-5 w-5 text-red-600" />
                )}
                <span className="text-sm">WebSocket</span>
              </div>
              <Badge variant={messagingHealth.realtimeHealth.websocketConnected ? 'default' : 'destructive'}>
                {messagingHealth.realtimeHealth.websocketConnected ? 'Connected' : 'Disconnected'}
              </Badge>
            </div>
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-600" />
                <span className="text-sm">Active Subscriptions</span>
              </div>
              <Badge variant="secondary">{messagingHealth.realtimeHealth.activeSubscriptions}</Badge>
            </div>
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-purple-600" />
                <span className="text-sm">Last Message</span>
              </div>
              <Badge variant="outline">
                {messagingHealth.realtimeHealth.lastMessageReceived 
                  ? new Date(messagingHealth.realtimeHealth.lastMessageReceived).toLocaleTimeString()
                  : 'None'
                }
              </Badge>
            </div>
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${getConnectionStatusColor(messagingHealth.realtimeHealth.connectionQuality)}`}></div>
                <span className="text-sm">Connection Quality</span>
              </div>
              <Badge variant={getConnectionStatusVariant(messagingHealth.realtimeHealth.connectionQuality)}>
                {messagingHealth.realtimeHealth.connectionQuality}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};