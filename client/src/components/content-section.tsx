import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { Mail, MousePointer, Send, Lightbulb, Bot, TrendingUp, BarChart3, RefreshCw, FileText, Target, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function ContentSection() {
  const { data: reports, isLoading: reportsLoading } = useQuery({
    queryKey: ["/api/content-reports"],
  });

  const { data: clients, isLoading: clientsLoading } = useQuery({
    queryKey: ["/api/clients"],
  });

  const { data: suggestions, isLoading: suggestionsLoading, refetch: refetchSuggestions } = useQuery({
    queryKey: ["/api/ai/content-suggestions"],
    staleTime: 0, // Always fetch fresh data
  });

  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [generatedEmail, setGeneratedEmail] = useState("");
  const [currentSuggestion, setCurrentSuggestion] = useState<any>(null);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [estimatedTime, setEstimatedTime] = useState(0);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const generateEmailMutation = useMutation({
    mutationFn: async (suggestion: any) => {
      // Start loading progress simulation
      const startTime = Date.now();
      setLoadingProgress(0);
      setEstimatedTime(25); // Estimate 25 seconds
      
      const progressInterval = setInterval(() => {
        const elapsed = (Date.now() - startTime) / 1000;
        const progress = Math.min((elapsed / 25) * 100, 95); // Cap at 95% until completion
        const remaining = Math.max(25 - elapsed, 1);
        setLoadingProgress(progress);
        setEstimatedTime(Math.ceil(remaining));
      }, 500);

      try {
        const response = await apiRequest('/api/ai/generate-theme-email', 'POST', {
          theme: suggestion.title,
          emailAngle: suggestion.emailAngle,
          description: suggestion.description,
          keyPoints: suggestion.keyPoints,
          supportingReports: suggestion.supportingReports
        });
        
        clearInterval(progressInterval);
        setLoadingProgress(100);
        setEstimatedTime(0);
        
        return response;
      } catch (error) {
        clearInterval(progressInterval);
        setLoadingProgress(0);
        setEstimatedTime(0);
        throw error;
      }
    },
    onSuccess: (data) => {
      setGeneratedEmail(data.email);
      setEmailDialogOpen(true);
      setLoadingProgress(0);
      setEstimatedTime(0);
    },
    onError: (error: any) => {
      console.error('Email generation error:', error);
      setLoadingProgress(0);
      setEstimatedTime(0);
      toast({
        title: "Error",
        description: error.message || "Failed to generate email",
        variant: "destructive",
      });
    },
  });

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied!",
        description: "Email copied to clipboard",
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to copy to clipboard",
        variant: "destructive",
      });
    }
  };

  if (reportsLoading || clientsLoading) {
    return (
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
          <div className="animate-pulse">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-white h-32 rounded-lg shadow" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const avgOpenRate = reports?.length > 0 
    ? Math.round(reports.reduce((sum: number, report: any) => sum + parseFloat(report.openRate), 0) / reports.length)
    : 0;

  const avgClickRate = reports?.length > 0 
    ? Math.round(reports.reduce((sum: number, report: any) => sum + parseFloat(report.clickRate), 0) / reports.length)
    : 0;

  const totalSent = reports?.reduce((sum: number, report: any) => sum + report.totalSent, 0) || 0;

  const getEngagementBadge = (openRate: string) => {
    const rate = parseFloat(openRate);
    if (rate >= 70) return <Badge className="bg-green-100 text-green-800">High Engagement</Badge>;
    if (rate >= 50) return <Badge className="bg-blue-100 text-blue-800">Good Engagement</Badge>;
    return <Badge className="bg-yellow-100 text-yellow-800">Low Engagement</Badge>;
  };

  const getInterestTags = (client: any) => {
    return client.interestTags?.map((tag: string, index: number) => {
      const colors = ["bg-blue-100 text-blue-800", "bg-green-100 text-green-800", "bg-purple-100 text-purple-800", "bg-orange-100 text-orange-800"];
      return (
        <Badge key={index} className={colors[index % colors.length]}>
          {tag}
        </Badge>
      );
    });
  };

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Content Distribution Tracker</h2>
          <p className="text-gray-600">Monitor WILTW report engagement and optimize client outreach</p>
        </div>

        {/* Engagement Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Open Rate</p>
                  <p className="text-2xl font-bold text-green-600">{avgOpenRate}%</p>
                </div>
                <div className="p-3 bg-green-100 rounded-full">
                  <Mail className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Click Rate</p>
                  <p className="text-2xl font-bold text-blue-600">{avgClickRate}%</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-full">
                  <MousePointer className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Reports Sent</p>
                  <p className="text-2xl font-bold text-gray-900">{totalSent}</p>
                </div>
                <div className="p-3 bg-gray-100 rounded-full">
                  <Send className="h-6 w-6 text-gray-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">AI Suggestions</p>
                  <p className="text-2xl font-bold text-indigo-600">24</p>
                </div>
                <div className="p-3 bg-purple-100 rounded-full">
                  <Lightbulb className="h-6 w-6 text-indigo-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent WILTW Reports */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Recent WILTW Reports</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {reports?.slice(0, 3).map((report: any) => (
                  <div key={report.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-gray-900">{report.title}</h4>
                        <p className="text-sm text-gray-500 mt-1">
                          Published: {new Date(report.publishDate).toLocaleDateString()}
                        </p>
                        <div className="mt-2 flex items-center space-x-4 text-sm">
                          <span className="text-green-600">↗ {report.openRate}% open rate</span>
                          <span className="text-blue-600">↗ {report.clickRate}% click rate</span>
                        </div>
                      </div>
                      {getEngagementBadge(report.openRate)}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>AI Content Suggestions</CardTitle>
              <button
                onClick={() => {
                  queryClient.removeQueries({ queryKey: ["/api/ai/content-suggestions"] });
                  refetchSuggestions();
                }}
                disabled={suggestionsLoading}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium flex items-center gap-2 disabled:opacity-50"
              >
                {suggestionsLoading ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Bot className="h-4 w-4" />
                )}
                {suggestionsLoading ? "Analyzing..." : "Generate Ideas"}
              </button>
            </CardHeader>
            <CardContent>
              {!suggestions && !suggestionsLoading && (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="mx-auto h-12 w-12 text-gray-400 mb-3" />
                  <p>Click "Generate Ideas" to analyze your reports and suggest email topics based on frequent themes.</p>
                </div>
              )}
              
              {suggestionsLoading && (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-20 bg-gray-200 rounded-lg"></div>
                    </div>
                  ))}
                </div>
              )}
              
              {suggestions && suggestions.length > 0 && (
                <div className="space-y-4">
                  {suggestions.map((suggestion: any, index: number) => {
                    console.log('Rendering suggestion:', suggestion.type, suggestion.title);
                    
                    // Force color for testing
                    const testColor = index === 0 ? "#2563eb" : index === 1 ? "#059669" : index === 2 ? "#7c3aed" : "#ea580c";
                    const getTypeIcon = (type: string) => {
                      switch (type) {
                        case "frequent_theme": return <TrendingUp className="h-5 w-5" />;
                        case "emerging_trend": return <Target className="h-5 w-5" />;
                        case "cross_sector": return <BarChart3 className="h-5 w-5" />;
                        case "deep_dive": return <FileText className="h-5 w-5" />;
                        default: return <Bot className="h-5 w-5" />;
                      }
                    };

                    const getTypeStyles = (type: string) => {
                      switch (type) {
                        case "frequent_theme": return {
                          containerClass: "bg-blue-50 border border-blue-200 rounded-lg p-4",
                          iconClass: "flex-shrink-0 text-blue-600",
                          titleClass: "text-sm font-medium text-blue-800",
                          descClass: "text-sm text-blue-700 mb-2",
                          angleClass: "text-xs text-blue-600 mb-2 font-medium",
                          pointsClass: "text-xs text-blue-600 space-y-1",
                          pointsHeaderClass: "text-xs text-blue-600 font-medium mb-1",
                          reportsClass: "text-xs text-blue-600 mb-3",
                          buttonClass: "bg-blue-600 hover:bg-blue-700 text-white"
                        };
                        case "emerging_trend": return {
                          containerClass: "bg-green-50 border border-green-200 rounded-lg p-4",
                          iconClass: "flex-shrink-0 text-green-600",
                          titleClass: "text-sm font-medium text-green-800",
                          descClass: "text-sm text-green-700 mb-2",
                          angleClass: "text-xs text-green-600 mb-2 font-medium",
                          pointsClass: "text-xs text-green-600 space-y-1",
                          pointsHeaderClass: "text-xs text-green-600 font-medium mb-1",
                          reportsClass: "text-xs text-green-600 mb-3",
                          buttonClass: "bg-green-600 hover:bg-green-700 text-white"
                        };
                        case "cross_sector": return {
                          containerClass: "bg-purple-50 border border-purple-200 rounded-lg p-4",
                          iconClass: "flex-shrink-0 text-purple-600",
                          titleClass: "text-sm font-medium text-purple-800",
                          descClass: "text-sm text-purple-700 mb-2",
                          angleClass: "text-xs text-purple-600 mb-2 font-medium",
                          pointsClass: "text-xs text-purple-600 space-y-1",
                          pointsHeaderClass: "text-xs text-purple-600 font-medium mb-1",
                          reportsClass: "text-xs text-purple-600 mb-3",
                          buttonClass: "bg-purple-600 hover:bg-purple-700 text-white"
                        };
                        case "deep_dive": return {
                          containerClass: "bg-orange-50 border border-orange-200 rounded-lg p-4",
                          iconClass: "flex-shrink-0 text-orange-600",
                          titleClass: "text-sm font-medium text-orange-800",
                          descClass: "text-sm text-orange-700 mb-2",
                          angleClass: "text-xs text-orange-600 mb-2 font-medium",
                          pointsClass: "text-xs text-orange-600 space-y-1",
                          pointsHeaderClass: "text-xs text-orange-600 font-medium mb-1",
                          reportsClass: "text-xs text-orange-600 mb-3",
                          buttonClass: "bg-orange-600 hover:bg-orange-700 text-white"
                        };
                        default: return {
                          containerClass: "bg-gray-50 border border-gray-200 rounded-lg p-4",
                          iconClass: "flex-shrink-0 text-gray-600",
                          titleClass: "text-sm font-medium text-gray-800",
                          descClass: "text-sm text-gray-700 mb-2",
                          angleClass: "text-xs text-gray-600 mb-2 font-medium",
                          pointsClass: "text-xs text-gray-600 space-y-1",
                          pointsHeaderClass: "text-xs text-gray-600 font-medium mb-1",
                          reportsClass: "text-xs text-gray-600 mb-3",
                          buttonClass: "bg-gray-600 hover:bg-gray-700 text-white"
                        };
                      }
                    };

                    const styles = getTypeStyles(suggestion.type);
                    
                    return (
                      <div key={index} className={styles.containerClass}>
                        <div className="flex items-start">
                          <div className={styles.iconClass}>
                            {getTypeIcon(suggestion.type)}
                          </div>
                          <div className="ml-3 flex-1">
                            <div className="flex items-center justify-between mb-2">
                              <p className={styles.titleClass}>{suggestion.title}</p>
                              <Badge variant={suggestion.priority === "high" ? "destructive" : suggestion.priority === "medium" ? "default" : "secondary"}>
                                {suggestion.priority}
                              </Badge>
                            </div>
                            <p className={styles.descClass}>
                              {suggestion.description}
                            </p>
                            <p className={styles.angleClass}>
                              Email angle: {suggestion.emailAngle}
                            </p>
                            {suggestion.keyPoints && suggestion.keyPoints.length > 0 && (
                              <div className="mb-3">
                                <p className={styles.pointsHeaderClass}>Key points to cover:</p>
                                <ul className={styles.pointsClass}>
                                  {suggestion.keyPoints.slice(0, 3).map((point: string, idx: number) => (
                                    <li key={idx}>• {point}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {suggestion.supportingReports && suggestion.supportingReports.length > 0 && (
                              <p className={styles.reportsClass}>
                                Supporting reports: {suggestion.supportingReports.slice(0, 2).join(", ")}
                                {suggestion.supportingReports.length > 2 && ` +${suggestion.supportingReports.length - 2} more`}
                              </p>
                            )}
                            <div className="mt-3">
                              <button
                                onClick={async () => {
                                  console.log('AI OUTPUT BUTTON CLICKED for:', suggestion.title);
                                  setCurrentSuggestion(suggestion);
                                  
                                  try {
                                    const response = await fetch('/api/ai/generate-theme-email', {
                                      method: 'POST',
                                      headers: {
                                        'Content-Type': 'application/json',
                                      },
                                      body: JSON.stringify({
                                        theme: suggestion.title,
                                        emailAngle: suggestion.emailAngle,
                                        description: suggestion.description,
                                        keyPoints: suggestion.keyPoints,
                                        supportingReports: suggestion.supportingReports
                                      })
                                    });
                                    
                                    if (response.ok) {
                                      const data = await response.json();
                                      setGeneratedEmail(data.email);
                                      setEmailDialogOpen(true);
                                      toast({
                                        title: "AI Output Generated",
                                        description: "Your personalized content has been created successfully.",
                                      });
                                    }
                                  } catch (error) {
                                    console.error('Error:', error);
                                    toast({
                                      title: "Error",
                                      description: "Failed to generate AI output. Please try again.",
                                      variant: "destructive",
                                    });
                                  }
                                }}
                                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-md hover:opacity-90 transition-all"
                                style={{
                                  backgroundColor: testColor,
                                  border: "none",
                                  cursor: "pointer"
                                }}
                              >
                                <Mail className="h-4 w-4" />
                                Generate AI Output
                              </button>
                              
                              {generateEmailMutation.isPending && currentSuggestion === suggestion && (
                                <div className="bg-gray-50 rounded-md p-3 border">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium text-gray-700">Generating email...</span>
                                    <span className="text-sm text-gray-500">{estimatedTime}s remaining</span>
                                  </div>
                                  <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div 
                                      className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                                      style={{ width: `${loadingProgress}%` }}
                                    ></div>
                                  </div>
                                  <div className="text-xs text-gray-500 mt-1">
                                    Analyzing reports and crafting personalized content...
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              
              {suggestions && suggestions.length === 0 && (
                <div className="text-center py-6 text-gray-500">
                  <Bot className="mx-auto h-12 w-12 text-gray-400 mb-3" />
                  <p>No email themes found. Upload more reports to get better suggestions.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Email Generation Dialog */}
        <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Generated Email</DialogTitle>
              <DialogDescription>
                Review and edit the AI-generated email content before copying or sending.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Textarea
                value={generatedEmail}
                onChange={(e) => setGeneratedEmail(e.target.value)}
                className="min-h-[400px] font-mono text-sm"
                placeholder="Generated email will appear here..."
              />
              <div className="flex gap-2">
                <Button
                  onClick={() => copyToClipboard(generatedEmail)}
                  disabled={!generatedEmail}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Email
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setEmailDialogOpen(false)}
                >
                  Close
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Client Engagement Details */}
        <Card>
          <CardHeader>
            <CardTitle>Client Engagement Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Open Rate</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Click Rate</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Interest Tags</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Engagement</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">AI Suggestion</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {clients?.slice(0, 5).map((client: any) => (
                    <tr key={client.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {client.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                        {client.engagementRate}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600">
                        {Math.round(parseFloat(client.engagementRate) * 0.4)}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex space-x-1">
                          {getInterestTags(client)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        WILTW #{reports?.length > 0 ? reports[0].id : "66"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600">
                        {client.riskLevel === "high" ? "Re-engage with content" : 
                         client.riskLevel === "medium" ? "Renewal opportunity" :
                         "Send latest report"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
