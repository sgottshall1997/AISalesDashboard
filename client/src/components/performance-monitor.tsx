import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Activity, Zap, Database, Clock } from "lucide-react";

interface PerformanceMetrics {
  loadTime: number;
  memoryUsage: number;
  apiResponseTime: number;
  renderTime: number;
  errorRate: number;
}

export function PerformanceMonitor() {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    loadTime: 0,
    memoryUsage: 0,
    apiResponseTime: 0,
    renderTime: 0,
    errorRate: 0
  });

  useEffect(() => {
    const collectMetrics = () => {
      // Page load performance
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const loadTime = navigation ? navigation.loadEventEnd - navigation.loadEventStart : 0;

      // Memory usage (if available)
      const memory = (performance as any).memory;
      const memoryUsage = memory ? (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100 : 0;

      // API response times
      const apiEntries = performance.getEntriesByType('fetch') || [];
      const avgApiTime = apiEntries.length > 0 
        ? apiEntries.reduce((sum, entry) => sum + entry.duration, 0) / apiEntries.length
        : 0;

      // Render performance
      const paintEntries = performance.getEntriesByType('paint');
      const renderTime = paintEntries.find(entry => entry.name === 'first-contentful-paint')?.startTime || 0;

      setMetrics({
        loadTime: Math.round(loadTime),
        memoryUsage: Math.round(memoryUsage),
        apiResponseTime: Math.round(avgApiTime),
        renderTime: Math.round(renderTime),
        errorRate: 0 // Would track actual errors in production
      });
    };

    collectMetrics();
    const interval = setInterval(collectMetrics, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const getPerformanceStatus = (value: number, thresholds: [number, number]): { status: string, color: string } => {
    if (value <= thresholds[0]) return { status: "Excellent", color: "bg-green-500" };
    if (value <= thresholds[1]) return { status: "Good", color: "bg-yellow-500" };
    return { status: "Needs Attention", color: "bg-red-500" };
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Performance Monitor
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Load Time */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium">Page Load Time</span>
            </div>
            <Badge className={getPerformanceStatus(metrics.loadTime, [1000, 3000]).color}>
              {getPerformanceStatus(metrics.loadTime, [1000, 3000]).status}
            </Badge>
          </div>
          <div className="flex items-center gap-3">
            <Progress value={Math.min((metrics.loadTime / 5000) * 100, 100)} className="flex-1" />
            <span className="text-sm text-gray-600 min-w-[60px]">{metrics.loadTime}ms</span>
          </div>
        </div>

        {/* Memory Usage */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium">Memory Usage</span>
            </div>
            <Badge className={getPerformanceStatus(metrics.memoryUsage, [60, 80]).color}>
              {getPerformanceStatus(metrics.memoryUsage, [60, 80]).status}
            </Badge>
          </div>
          <div className="flex items-center gap-3">
            <Progress value={metrics.memoryUsage} className="flex-1" />
            <span className="text-sm text-gray-600 min-w-[60px]">{metrics.memoryUsage.toFixed(1)}%</span>
          </div>
        </div>

        {/* API Response Time */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium">API Response Time</span>
            </div>
            <Badge className={getPerformanceStatus(metrics.apiResponseTime, [500, 1500]).color}>
              {getPerformanceStatus(metrics.apiResponseTime, [500, 1500]).status}
            </Badge>
          </div>
          <div className="flex items-center gap-3">
            <Progress value={Math.min((metrics.apiResponseTime / 3000) * 100, 100)} className="flex-1" />
            <span className="text-sm text-gray-600 min-w-[60px]">{metrics.apiResponseTime}ms</span>
          </div>
        </div>

        {/* Performance Tips */}
        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <h4 className="text-sm font-medium text-blue-800 mb-2">Performance Tips</h4>
          <ul className="text-xs text-blue-700 space-y-1">
            <li>• Clear browser cache if load times are slow</li>
            <li>• Close unused browser tabs to free memory</li>
            <li>• Check network connection for API delays</li>
            <li>• Refresh page if performance degrades</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}