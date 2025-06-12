import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import { apiRequest } from "@/lib/queryClient";
import { 
  ThumbsUp, 
  ThumbsDown, 
  TrendingUp, 
  BarChart3, 
  MessageSquare,
  Edit3,
  Target
} from "lucide-react";

export function AIAnalytics() {
  const { data: analytics, isLoading } = useQuery({
    queryKey: ["/api/ai/feedback/analytics"],
    queryFn: () => apiRequest("GET", "/api/ai/feedback/analytics").then(res => res.json()),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <PageHeader 
          title="AI Content Analytics"
          subtitle="Monitor AI-generated content performance and quality metrics"
        />
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
          </div>
        </div>
      </div>
    );
  }

  const satisfactionRate = analytics?.avgRating || 0;
  const totalFeedback = analytics?.totalFeedback || 0;
  const thumbsUpCount = analytics?.thumbsUpCount || 0;
  const thumbsDownCount = analytics?.thumbsDownCount || 0;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <PageHeader 
        title="AI Content Analytics"
        subtitle="Monitor AI-generated content performance and quality metrics"
      />
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-end">
          <Badge variant="outline" className="text-sm">
            Live Feedback Data
          </Badge>
        </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Content Generated</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.totalContent || 0}</div>
            <p className="text-xs text-muted-foreground">
              AI-generated emails and content
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Feedback</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalFeedback}</div>
            <p className="text-xs text-muted-foreground">
              User responses collected
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Satisfaction Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{satisfactionRate.toFixed(1)}%</div>
            <Progress value={satisfactionRate} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Feedback Rate</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics?.totalContent > 0 ? ((totalFeedback / analytics.totalContent) * 100).toFixed(1) : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              Content with user feedback
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Feedback Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Feedback Distribution</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <ThumbsUp className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium">Positive Feedback</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-bold">{thumbsUpCount}</span>
                <Badge variant="secondary" className="text-xs">
                  {totalFeedback > 0 ? ((thumbsUpCount / totalFeedback) * 100).toFixed(1) : 0}%
                </Badge>
              </div>
            </div>
            <Progress value={totalFeedback > 0 ? (thumbsUpCount / totalFeedback) * 100 : 0} className="h-2" />

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <ThumbsDown className="h-4 w-4 text-red-600" />
                <span className="text-sm font-medium">Negative Feedback</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-bold">{thumbsDownCount}</span>
                <Badge variant="secondary" className="text-xs">
                  {totalFeedback > 0 ? ((thumbsDownCount / totalFeedback) * 100).toFixed(1) : 0}%
                </Badge>
              </div>
            </div>
            <Progress value={totalFeedback > 0 ? (thumbsDownCount / totalFeedback) * 100 : 0} className="h-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Feedback Types</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {analytics?.feedbackByType && Object.entries(analytics.feedbackByType).map(([type, count]) => (
              <div key={type} className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {type === 'rating' && <MessageSquare className="h-4 w-4 text-blue-600" />}
                  {type === 'suggestion' && <MessageSquare className="h-4 w-4 text-yellow-600" />}
                  {type === 'edit' && <Edit3 className="h-4 w-4 text-purple-600" />}
                  <span className="text-sm font-medium capitalize">{type}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-bold">{count as number}</span>
                  <Badge variant="outline" className="text-xs">
                    {totalFeedback > 0 ? (((count as number) / totalFeedback) * 100).toFixed(1) : 0}%
                  </Badge>
                </div>
              </div>
            ))}
            
            {(!analytics?.feedbackByType || Object.keys(analytics.feedbackByType).length === 0) && (
              <div className="text-center text-gray-500 py-4">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No feedback data available yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Insights and Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle>AI Performance Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-700">{satisfactionRate.toFixed(1)}%</div>
              <div className="text-sm text-green-600">User Satisfaction</div>
              <div className="text-xs text-gray-600 mt-1">
                {satisfactionRate >= 80 ? "Excellent performance" : 
                 satisfactionRate >= 60 ? "Good performance" : "Needs improvement"}
              </div>
            </div>
            
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-700">
                {analytics?.totalContent > 0 ? ((totalFeedback / analytics.totalContent) * 100).toFixed(1) : 0}%
              </div>
              <div className="text-sm text-blue-600">Engagement Rate</div>
              <div className="text-xs text-gray-600 mt-1">
                Users providing feedback
              </div>
            </div>
            
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-700">
                {Object.values(analytics?.feedbackByType || {}).reduce((a: number, b: unknown) => a + (b as number), 0)}
              </div>
              <div className="text-sm text-purple-600">Total Interactions</div>
              <div className="text-xs text-gray-600 mt-1">
                All feedback submissions
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
      </div>
    </div>
  );
}