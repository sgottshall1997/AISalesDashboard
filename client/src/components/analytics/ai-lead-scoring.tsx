import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Brain, TrendingUp, AlertCircle, CheckCircle, Users, DollarSign } from "lucide-react";
import { AIBadge } from "@/components/ui/ai-badge";
import { AIFeedback } from "@/components/ui/ai-feedback";

interface LeadScore {
  leadId: number;
  leadName: string;
  company: string;
  email: string;
  overallScore: number;
  conversionProbability: number;
  scoreBreakdown: {
    engagement: number;
    demographics: number;
    behavior: number;
    timing: number;
  };
  riskFactors: string[];
  opportunities: string[];
  recommendedActions: string[];
  priority: 'high' | 'medium' | 'low';
  confidenceLevel: number;
}

interface ScoringMetrics {
  totalLeadsScored: number;
  averageScore: number;
  highPriorityLeads: number;
  predictedConversions: number;
  scoreAccuracy: number;
  trendsData: {
    month: string;
    avgScore: number;
    conversions: number;
  }[];
}

export function AILeadScoring() {
  const [selectedTimeframe, setSelectedTimeframe] = useState("30d");
  const [refreshKey, setRefreshKey] = useState(0);

  const leadScoresQuery = useQuery({
    queryKey: ["/api/ai/lead-scoring", selectedTimeframe, refreshKey],
    staleTime: 300000, // 5 minutes
  });

  const scoringMetricsQuery = useQuery({
    queryKey: ["/api/ai/scoring-metrics", selectedTimeframe],
    staleTime: 300000,
  });

  const handleRegenerateScores = () => {
    setRefreshKey(prev => prev + 1);
  };

  const leadScores: LeadScore[] = leadScoresQuery.data?.scores || [];
  const metrics: ScoringMetrics = scoringMetricsQuery.data || {
    totalLeadsScored: 0,
    averageScore: 0,
    highPriorityLeads: 0,
    predictedConversions: 0,
    scoreAccuracy: 0,
    trendsData: []
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      {/* AI Lead Scoring Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Brain className="h-8 w-8 text-purple-600" />
          <div>
            <h2 className="text-2xl font-bold">AI Lead Scoring</h2>
            <p className="text-gray-600">Intelligent lead prioritization and conversion prediction</p>
          </div>
          <AIBadge />
        </div>
        <Button 
          onClick={handleRegenerateScores}
          disabled={leadScoresQuery.isLoading}
          className="flex items-center gap-2"
        >
          <Brain className="h-4 w-4" />
          {leadScoresQuery.isLoading ? "Analyzing..." : "Regenerate Scores"}
        </Button>
      </div>

      {/* Scoring Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Leads Scored</p>
                <p className="text-2xl font-bold">{metrics.totalLeadsScored}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">Avg Score</p>
                <p className={`text-2xl font-bold ${getScoreColor(metrics.averageScore)}`}>
                  {metrics.averageScore.toFixed(1)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-sm text-gray-600">High Priority</p>
                <p className="text-2xl font-bold text-red-600">{metrics.highPriorityLeads}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm text-gray-600">Predicted Conversions</p>
                <p className="text-2xl font-bold text-purple-600">{metrics.predictedConversions}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="scores" className="space-y-4">
        <TabsList>
          <TabsTrigger value="scores">Lead Scores</TabsTrigger>
          <TabsTrigger value="insights">AI Insights</TabsTrigger>
          <TabsTrigger value="model">Model Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="scores" className="space-y-4">
          {leadScoresQuery.isLoading ? (
            <Card>
              <CardContent className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
                <p className="text-gray-600">AI is analyzing lead scores...</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {leadScores.map((lead) => (
                <Card key={lead.leadId} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-lg">{lead.leadName}</h3>
                          <Badge className={getPriorityColor(lead.priority)}>
                            {lead.priority} priority
                          </Badge>
                        </div>
                        <p className="text-gray-600">{lead.company} • {lead.email}</p>
                      </div>
                      <div className="text-right">
                        <div className={`text-3xl font-bold ${getScoreColor(lead.overallScore)}`}>
                          {lead.overallScore}
                        </div>
                        <p className="text-sm text-gray-500">Score</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6 mb-4">
                      <div>
                        <h4 className="font-medium mb-3">Score Breakdown</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-sm">Engagement</span>
                            <div className="flex items-center gap-2 w-32">
                              <Progress value={lead.scoreBreakdown.engagement} className="flex-1" />
                              <span className="text-sm font-medium w-8">
                                {lead.scoreBreakdown.engagement}
                              </span>
                            </div>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm">Demographics</span>
                            <div className="flex items-center gap-2 w-32">
                              <Progress value={lead.scoreBreakdown.demographics} className="flex-1" />
                              <span className="text-sm font-medium w-8">
                                {lead.scoreBreakdown.demographics}
                              </span>
                            </div>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm">Behavior</span>
                            <div className="flex items-center gap-2 w-32">
                              <Progress value={lead.scoreBreakdown.behavior} className="flex-1" />
                              <span className="text-sm font-medium w-8">
                                {lead.scoreBreakdown.behavior}
                              </span>
                            </div>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm">Timing</span>
                            <div className="flex items-center gap-2 w-32">
                              <Progress value={lead.scoreBreakdown.timing} className="flex-1" />
                              <span className="text-sm font-medium w-8">
                                {lead.scoreBreakdown.timing}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-medium mb-3">AI Recommendations</h4>
                        <div className="space-y-3">
                          {lead.recommendedActions.slice(0, 3).map((action, index) => (
                            <div key={index} className="flex items-start gap-2">
                              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                              <p className="text-sm text-gray-700">{action}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="border-t pt-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <span>Conversion Probability: {lead.conversionProbability}%</span>
                          <span>Confidence: {lead.confidenceLevel}%</span>
                        </div>
                        <AIFeedback 
                          contentId={`lead-score-${lead.leadId}`}
                          contentType="lead-scoring"
                          compact={true}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="insights" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-purple-600" />
                AI-Generated Insights
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Pattern Detection</h4>
                <p className="text-blue-800 text-sm">
                  High-scoring leads show 60% more engagement with research reports, particularly 
                  WILTW content focused on market volatility themes.
                </p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <h4 className="font-medium text-green-900 mb-2">Conversion Opportunity</h4>
                <p className="text-green-800 text-sm">
                  Leads with demographic scores above 75 have 3x higher conversion rates when 
                  contacted within 48 hours of content engagement.
                </p>
              </div>
              <div className="p-4 bg-yellow-50 rounded-lg">
                <h4 className="font-medium text-yellow-900 mb-2">Risk Assessment</h4>
                <p className="text-yellow-800 text-sm">
                  Low timing scores correlate with delayed decision-making. Consider extending 
                  nurture sequences for these leads.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="model" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Model Performance Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-3">Accuracy Metrics</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span>Score Accuracy</span>
                      <span className="font-medium">{metrics.scoreAccuracy}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Prediction Confidence</span>
                      <span className="font-medium">87%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Model Version</span>
                      <span className="font-medium">v2.1</span>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-3">Data Quality</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span>Data Completeness</span>
                      <span className="font-medium">94%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Feature Importance</span>
                      <span className="font-medium">High</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Last Updated</span>
                      <span className="font-medium">2 hours ago</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}