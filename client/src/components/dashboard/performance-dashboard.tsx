import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Activity, 
  Zap, 
  AlertTriangle, 
  CheckCircle,
  RefreshCw,
  BarChart3,
  TrendingUp,
  Clock,
  Server
} from "lucide-react";

interface PerformanceMetrics {
  totalRequests: number;
  averageResponseTime: number;
  errorCount: number;
  slowEndpoints: Array<{
    endpoint: string;
    averageTime: number;
    count: number;
  }>;
  errorRates: Array<{
    endpoint: string;
    errorRate: number;
    totalRequests: number;
  }>;
  healthStatus: {
    status: 'healthy' | 'warning' | 'critical';
    message: string;
    details: {
      avgResponseTime: number;
      memoryUsagePercent: number;
      errorRate: number;
    };
  };
  systemMetrics: Array<{
    cpuUsage: number;
    memoryUsage: {
      rss: number;
      heapUsed: number;
      heapTotal: number;
      external: number;
    };
    uptime: number;
    requestsPerMinute: number;
    averageResponseTime: number;
    errorRate: number;
  }>;
}

export function PerformanceDashboard() {
  const [refreshing, setRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState(3600000); // 1 hour default

  const { data: metrics, isLoading, refetch } = useQuery<PerformanceMetrics>({
    queryKey: ["/api/admin/performance", timeRange],
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Refresh every minute
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const getHealthStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-50';
      case 'warning': return 'text-yellow-600 bg-yellow-50';
      case 'critical': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Performance Dashboard</h2>
          <Skeleton className="h-10 w-24" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  const health = metrics?.healthStatus;
  const latestSystemMetric = metrics?.systemMetrics?.[metrics.systemMetrics.length - 1];

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Activity className="h-8 w-8 text-primary" />
          <h2 className="text-2xl font-bold">Performance Dashboard</h2>
          {health && (
            <Badge className={getHealthStatusColor(health.status)}>
              {health.status.toUpperCase()}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(Number(e.target.value))}
            className="px-3 py-2 border rounded-md"
          >
            <option value={1800000}>Last 30 min</option>
            <option value={3600000}>Last 1 hour</option>
            <option value={7200000}>Last 2 hours</option>
            <option value={86400000}>Last 24 hours</option>
          </select>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-1"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Health Status Alert */}
      {health && health.status !== 'healthy' && (
        <Card className={`border-l-4 ${
          health.status === 'critical' ? 'border-l-red-500 bg-red-50' : 'border-l-yellow-500 bg-yellow-50'
        }`}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <AlertTriangle className={`h-5 w-5 ${
                health.status === 'critical' ? 'text-red-600' : 'text-yellow-600'
              }`} />
              <span className="font-medium">{health.message}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
            <BarChart3 className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.totalRequests || 0}</div>
            <p className="text-xs text-muted-foreground">
              {latestSystemMetric?.requestsPerMinute || 0}/min current rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
            <Clock className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics?.averageResponseTime ? `${Math.round(metrics.averageResponseTime)}ms` : '0ms'}
            </div>
            <p className="text-xs text-muted-foreground">
              Target: &lt; 2000ms
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {health?.details?.errorRate ? `${health.details.errorRate.toFixed(1)}%` : '0%'}
            </div>
            <p className="text-xs text-muted-foreground">
              {metrics?.errorCount || 0} errors total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Health</CardTitle>
            <Server className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {latestSystemMetric ? formatUptime(latestSystemMetric.uptime) : '0h 0m'}
            </div>
            <p className="text-xs text-muted-foreground">
              Memory: {health?.details?.memoryUsagePercent ? `${health.details.memoryUsagePercent.toFixed(1)}%` : '0%'}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="endpoints" className="space-y-4">
        <TabsList>
          <TabsTrigger value="endpoints">Endpoint Performance</TabsTrigger>
          <TabsTrigger value="system">System Metrics</TabsTrigger>
          <TabsTrigger value="errors">Error Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="endpoints" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Slowest Endpoints
              </CardTitle>
            </CardHeader>
            <CardContent>
              {metrics?.slowEndpoints?.length ? (
                <div className="space-y-3">
                  {metrics.slowEndpoints.slice(0, 10).map((endpoint, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <div className="font-medium text-sm">{endpoint.endpoint}</div>
                        <div className="text-xs text-gray-500">{endpoint.count} requests</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-lg">{Math.round(endpoint.averageTime)}ms</div>
                        <Badge variant={endpoint.averageTime > 2000 ? 'destructive' : 'secondary'}>
                          {endpoint.averageTime > 2000 ? 'Slow' : 'OK'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-500 py-8">No endpoint data available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>System Resource Usage</CardTitle>
            </CardHeader>
            <CardContent>
              {latestSystemMetric ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm">
                        <span>Memory (RSS)</span>
                        <span>{formatBytes(latestSystemMetric.memoryUsage.rss)}</span>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm">
                        <span>Heap Used</span>
                        <span>{formatBytes(latestSystemMetric.memoryUsage.heapUsed)}</span>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm">
                        <span>Heap Total</span>
                        <span>{formatBytes(latestSystemMetric.memoryUsage.heapTotal)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm">
                        <span>Uptime</span>
                        <span>{formatUptime(latestSystemMetric.uptime)}</span>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm">
                        <span>Requests/min</span>
                        <span>{latestSystemMetric.requestsPerMinute}</span>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm">
                        <span>Avg Response</span>
                        <span>{Math.round(latestSystemMetric.averageResponseTime)}ms</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-center text-gray-500 py-8">No system metrics available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="errors" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Error Rate by Endpoint
              </CardTitle>
            </CardHeader>
            <CardContent>
              {metrics?.errorRates?.length ? (
                <div className="space-y-3">
                  {metrics.errorRates
                    .filter(endpoint => endpoint.errorRate > 0)
                    .slice(0, 10)
                    .map((endpoint, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                      <div>
                        <div className="font-medium text-sm">{endpoint.endpoint}</div>
                        <div className="text-xs text-gray-500">{endpoint.totalRequests} total requests</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-lg text-red-600">{endpoint.errorRate.toFixed(1)}%</div>
                        <Badge variant="destructive">
                          High Error Rate
                        </Badge>
                      </div>
                    </div>
                  ))}
                  {metrics.errorRates.filter(e => e.errorRate > 0).length === 0 && (
                    <div className="text-center py-8">
                      <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
                      <p className="text-green-600 font-medium">No errors detected</p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-center text-gray-500 py-8">No error data available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}