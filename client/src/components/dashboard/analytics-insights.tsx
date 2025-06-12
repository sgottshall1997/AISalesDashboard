import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  TrendingUp, 
  TrendingDown, 
  Bot, 
  AlertTriangle, 
  CheckCircle,
  RefreshCw,
  Lightbulb
} from "lucide-react";

interface AIInsight {
  id: string;
  type: 'opportunity' | 'risk' | 'trend' | 'action';
  title: string;
  description: string;
  confidence: number;
  priority: 'high' | 'medium' | 'low';
  actionable: boolean;
  created_at: string;
}

interface AnalyticsData {
  insights: AIInsight[];
  metrics: {
    engagement_trend: number;
    conversion_rate: number;
    pipeline_health: number;
    revenue_forecast: number;
  };
}

export function AnalyticsInsights() {
  const [refreshing, setRefreshing] = useState(false);
  
  const { data: analytics, isLoading, refetch } = useQuery<AnalyticsData>({
    queryKey: ["/api/analytics/insights"],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'opportunity': return TrendingUp;
      case 'risk': return AlertTriangle;
      case 'trend': return TrendingDown;
      case 'action': return CheckCircle;
      default: return Lightbulb;
    }
  };

  const getInsightColor = (type: string) => {
    switch (type) {
      case 'opportunity': return 'text-green-600';
      case 'risk': return 'text-red-600';
      case 'trend': return 'text-blue-600';
      case 'action': return 'text-purple-600';
      default: return 'text-gray-600';
    }
  };

  const getPriorityVariant = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'default';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            AI Business Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const insights = analytics?.insights || [];
  const metrics = analytics?.metrics;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            AI Business Insights
            <Badge variant="outline" className="ml-2">
              {insights.length} insights
            </Badge>
          </CardTitle>
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
      </CardHeader>
      <CardContent>
        {insights.length === 0 ? (
          <div className="text-center py-8">
            <Bot className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 mb-2">No AI insights available</p>
            <p className="text-sm text-gray-400">
              Insights will appear as your data grows and patterns emerge
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Performance Metrics Summary */}
            {metrics && (
              <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {metrics.engagement_trend > 0 ? '+' : ''}{metrics.engagement_trend}%
                  </div>
                  <div className="text-sm text-gray-600">Engagement Trend</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {metrics.pipeline_health}%
                  </div>
                  <div className="text-sm text-gray-600">Pipeline Health</div>
                </div>
              </div>
            )}

            {/* AI Insights */}
            <div className="space-y-3">
              {insights.map((insight) => {
                const IconComponent = getInsightIcon(insight.type);
                const iconColor = getInsightColor(insight.type);
                
                return (
                  <div
                    key={insight.id}
                    className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg bg-gray-100 ${iconColor}`}>
                        <IconComponent className="h-4 w-4" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-medium text-gray-900">
                            {insight.title}
                          </h4>
                          <Badge variant={getPriorityVariant(insight.priority)}>
                            {insight.priority}
                          </Badge>
                          {insight.actionable && (
                            <Badge variant="outline" className="text-xs">
                              Actionable
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mb-2">
                          {insight.description}
                        </p>
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>
                            Confidence: {insight.confidence}%
                          </span>
                          <span>
                            {new Date(insight.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* AI Attribution */}
            <div className="text-xs text-gray-500 text-center pt-4 border-t">
              <Bot className="h-3 w-3 inline mr-1" />
              Powered by AI analysis of your business data
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}