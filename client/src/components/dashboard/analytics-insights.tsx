import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Users, 
  Mail,
  Calendar,
  AlertCircle,
  CheckCircle,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  PieChart,
  Activity
} from "lucide-react";

interface AnalyticsInsight {
  id: string;
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  category: 'revenue' | 'engagement' | 'efficiency' | 'risk';
  value: string;
  change: number;
  actionItems: string[];
  confidence: number;
}

interface AnalyticsData {
  insights: AnalyticsInsight[];
  keyMetrics: {
    totalRevenue: number;
    revenueGrowth: number;
    engagementRate: number;
    engagementChange: number;
    conversionRate: number;
    conversionChange: number;
    riskScore: number;
    riskChange: number;
  };
  trends: {
    revenue: Array<{ month: string; value: number }>;
    engagement: Array<{ month: string; value: number }>;
    conversion: Array<{ month: string; value: number }>;
  };
  opportunities: Array<{
    title: string;
    description: string;
    potential: string;
    effort: 'low' | 'medium' | 'high';
  }>;
}

export function AnalyticsInsights() {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [timeRange, setTimeRange] = useState('30d');

  const { data: analytics, isLoading, error } = useQuery<AnalyticsData>({
    queryKey: ["/api/analytics/insights", timeRange],
    staleTime: 300000, // 5 minutes
    refetchInterval: 600000, // 10 minutes
  });

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'revenue': return <TrendingUp className="h-4 w-4" />;
      case 'engagement': return <Users className="h-4 w-4" />;
      case 'efficiency': return <Target className="h-4 w-4" />;
      case 'risk': return <AlertCircle className="h-4 w-4" />;
      default: return <BarChart3 className="h-4 w-4" />;
    }
  };

  const formatValue = (value: number, type: 'currency' | 'percentage' | 'number' = 'number') => {
    switch (type) {
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(value);
      case 'percentage':
        return `${value.toFixed(1)}%`;
      default:
        return value.toLocaleString();
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Analytics Insights</h2>
          <Skeleton className="h-10 w-32" />
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

  if (error) {
    return (
      <Card className="p-8">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Unable to Load Analytics</h3>
          <p className="text-gray-600">
            There was an error loading the analytics insights. Please try again later.
          </p>
        </div>
      </Card>
    );
  }

  const filteredInsights = analytics?.insights.filter(insight => 
    selectedCategory === 'all' || insight.category === selectedCategory
  ) || [];

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Activity className="h-8 w-8 text-primary" />
          <h2 className="text-2xl font-bold">Analytics Insights</h2>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-3 py-2 border rounded-md"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
          </select>
        </div>
      </div>

      {/* Key Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatValue(analytics?.keyMetrics.totalRevenue || 0, 'currency')}
            </div>
            <div className="flex items-center mt-1">
              {(analytics?.keyMetrics.revenueGrowth || 0) >= 0 ? (
                <ArrowUpRight className="h-4 w-4 text-green-600" />
              ) : (
                <ArrowDownRight className="h-4 w-4 text-red-600" />
              )}
              <span className={`text-xs ml-1 ${
                (analytics?.keyMetrics.revenueGrowth || 0) >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {formatValue(Math.abs(analytics?.keyMetrics.revenueGrowth || 0), 'percentage')} vs last period
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Engagement Rate</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatValue(analytics?.keyMetrics.engagementRate || 0, 'percentage')}
            </div>
            <div className="flex items-center mt-1">
              {(analytics?.keyMetrics.engagementChange || 0) >= 0 ? (
                <ArrowUpRight className="h-4 w-4 text-green-600" />
              ) : (
                <ArrowDownRight className="h-4 w-4 text-red-600" />
              )}
              <span className={`text-xs ml-1 ${
                (analytics?.keyMetrics.engagementChange || 0) >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {formatValue(Math.abs(analytics?.keyMetrics.engagementChange || 0), 'percentage')} vs last period
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <Target className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatValue(analytics?.keyMetrics.conversionRate || 0, 'percentage')}
            </div>
            <div className="flex items-center mt-1">
              {(analytics?.keyMetrics.conversionChange || 0) >= 0 ? (
                <ArrowUpRight className="h-4 w-4 text-green-600" />
              ) : (
                <ArrowDownRight className="h-4 w-4 text-red-600" />
              )}
              <span className={`text-xs ml-1 ${
                (analytics?.keyMetrics.conversionChange || 0) >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {formatValue(Math.abs(analytics?.keyMetrics.conversionChange || 0), 'percentage')} vs last period
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Risk Score</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatValue(analytics?.keyMetrics.riskScore || 0)}
            </div>
            <div className="flex items-center mt-1">
              {(analytics?.keyMetrics.riskChange || 0) <= 0 ? (
                <ArrowDownRight className="h-4 w-4 text-green-600" />
              ) : (
                <ArrowUpRight className="h-4 w-4 text-red-600" />
              )}
              <span className={`text-xs ml-1 ${
                (analytics?.keyMetrics.riskChange || 0) <= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {formatValue(Math.abs(analytics?.keyMetrics.riskChange || 0), 'percentage')} vs last period
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="insights" className="space-y-4">
        <TabsList>
          <TabsTrigger value="insights">AI Insights</TabsTrigger>
          <TabsTrigger value="opportunities">Opportunities</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="insights" className="space-y-4">
          {/* Category Filter */}
          <div className="flex gap-2 mb-4">
            <Button
              variant={selectedCategory === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory('all')}
            >
              All Categories
            </Button>
            <Button
              variant={selectedCategory === 'revenue' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory('revenue')}
            >
              Revenue
            </Button>
            <Button
              variant={selectedCategory === 'engagement' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory('engagement')}
            >
              Engagement
            </Button>
            <Button
              variant={selectedCategory === 'efficiency' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory('efficiency')}
            >
              Efficiency
            </Button>
            <Button
              variant={selectedCategory === 'risk' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory('risk')}
            >
              Risk
            </Button>
          </div>

          {/* Insights Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredInsights.map((insight) => (
              <Card key={insight.id} className="h-fit">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getCategoryIcon(insight.category)}
                      <CardTitle className="text-lg">{insight.title}</CardTitle>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getImpactColor(insight.impact)}>
                        {insight.impact.toUpperCase()}
                      </Badge>
                      <div className="text-xs text-gray-500">
                        {insight.confidence}% confidence
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-gray-600">{insight.description}</p>
                  
                  <div className="flex items-center gap-4">
                    <div>
                      <div className="text-sm text-gray-500">Current Value</div>
                      <div className="text-xl font-bold">{insight.value}</div>
                    </div>
                    <div className="flex items-center">
                      {insight.change >= 0 ? (
                        <ArrowUpRight className="h-4 w-4 text-green-600" />
                      ) : (
                        <ArrowDownRight className="h-4 w-4 text-red-600" />
                      )}
                      <span className={`text-sm ${
                        insight.change >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {Math.abs(insight.change)}%
                      </span>
                    </div>
                  </div>

                  {insight.actionItems.length > 0 && (
                    <div>
                      <div className="text-sm font-medium mb-2">Recommended Actions:</div>
                      <ul className="text-sm text-gray-600 space-y-1">
                        {insight.actionItems.map((action, index) => (
                          <li key={index} className="flex items-center gap-2">
                            <CheckCircle className="h-3 w-3 text-green-600 flex-shrink-0" />
                            {action}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredInsights.length === 0 && (
            <Card className="p-8">
              <div className="text-center">
                <PieChart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Insights Available</h3>
                <p className="text-gray-600">
                  {selectedCategory === 'all' 
                    ? 'No insights are currently available for the selected time period.'
                    : `No ${selectedCategory} insights are currently available for the selected time period.`
                  }
                </p>
              </div>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="opportunities" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {analytics?.opportunities.map((opportunity, index) => (
              <Card key={index}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-blue-600" />
                    {opportunity.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-gray-600">{opportunity.description}</p>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm text-gray-500">Potential Impact</div>
                      <div className="font-semibold text-green-600">{opportunity.potential}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">Implementation Effort</div>
                      <Badge variant={
                        opportunity.effort === 'low' ? 'default' :
                        opportunity.effort === 'medium' ? 'secondary' : 'destructive'
                      }>
                        {opportunity.effort.toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )) || []}
          </div>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <BarChart3 className="h-12 w-12 mx-auto mb-4" />
                  <p>Trend charts will be displayed here</p>
                  <p className="text-sm">Integration with charting library needed</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}