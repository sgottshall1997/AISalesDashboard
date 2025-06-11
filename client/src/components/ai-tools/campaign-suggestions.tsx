import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Lightbulb, TrendingUp, Users, BarChart3, RefreshCw, Mail, Copy, CheckCircle } from "lucide-react";

interface ContentSuggestion {
  type: "frequent_theme" | "emerging_trend" | "cross_sector" | "deep_dive";
  title: string;
  description: string;
  emailAngle: string;
  supportingReports: string[];
  keyPoints: string[];
  insights: string[];
  priority: "low" | "medium" | "high";
}

export function CampaignSuggestions() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [generatedEmail, setGeneratedEmail] = useState<string>("");
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [generatingFor, setGeneratingFor] = useState<string | null>(null);
  const { toast } = useToast();

  const { data: suggestions, isLoading, refetch } = useQuery<ContentSuggestion[]>({
    queryKey: ['/api/ai/content-suggestions', refreshTrigger],
    refetchInterval: 300000, // Auto-refresh every 5 minutes
  });

  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
    refetch();
  };

  const generateEmailMutation = useMutation({
    mutationFn: async (suggestion: ContentSuggestion) => {
      const response = await apiRequest("POST", "/api/ai/generate-campaign-email", {
        suggestion: suggestion,
        emailStyle: "13d_research_style" // Matches the provided example
      });
      return response.json();
    },
    onSuccess: (data) => {
      setGeneratedEmail(data.email);
      setEmailDialogOpen(true);
      setGeneratingFor(null);
      toast({
        title: "Email Generated",
        description: "Professional investment email generated successfully.",
      });
    },
    onError: (error) => {
      setGeneratingFor(null);
      toast({
        title: "Error",
        description: "Failed to generate email. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleGenerateEmail = (suggestion: ContentSuggestion) => {
    setGeneratingFor(suggestion.title);
    generateEmailMutation.mutate(suggestion);
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied",
        description: "Email content copied to clipboard.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy to clipboard.",
        variant: "destructive",
      });
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'frequent_theme':
        return <TrendingUp className="w-4 h-4" />;
      case 'emerging_trend':
        return <Lightbulb className="w-4 h-4" />;
      case 'cross_sector':
        return <BarChart3 className="w-4 h-4" />;
      case 'deep_dive':
        return <Users className="w-4 h-4" />;
      default:
        return <Lightbulb className="w-4 h-4" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'frequent_theme':
        return 'Frequent Theme';
      case 'emerging_trend':
        return 'Emerging Trend';
      case 'cross_sector':
        return 'Cross-Sector';
      case 'deep_dive':
        return 'Deep Dive';
      default:
        return type;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-purple-600" />
                Campaign Suggestions
              </CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                AI-generated content campaign ideas based on your research corpus
              </p>
            </div>
            <Button
              onClick={handleRefresh}
              variant="outline"
              size="sm"
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-full mb-1"></div>
                  <div className="h-3 bg-gray-200 rounded w-5/6"></div>
                </div>
              ))}
            </div>
          ) : suggestions && suggestions.length > 0 ? (
            <div className="space-y-4">
              {suggestions.map((suggestion, index) => (
                <Card key={index} className="border-l-4 border-l-purple-500">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {getTypeIcon(suggestion.type)}
                        <h4 className="font-semibold text-lg">{suggestion.title}</h4>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {getTypeLabel(suggestion.type)}
                        </Badge>
                        <Badge className={`text-xs ${getPriorityColor(suggestion.priority)}`}>
                          {suggestion.priority}
                        </Badge>
                      </div>
                    </div>
                    
                    <p className="text-gray-700 mb-3">{suggestion.description}</p>
                    
                    <div className="mb-3">
                      <h5 className="font-medium text-sm text-gray-900 mb-1">Email Angle:</h5>
                      <p className="text-sm text-gray-600 italic">"{suggestion.emailAngle}"</p>
                    </div>
                    
                    {suggestion.keyPoints && suggestion.keyPoints.length > 0 && (
                      <div className="mb-3">
                        <h5 className="font-medium text-sm text-gray-900 mb-2">Key Points:</h5>
                        <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                          {suggestion.keyPoints.map((point, pointIndex) => (
                            <li key={pointIndex}>{point}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {suggestion.insights && suggestion.insights.length > 0 && (
                      <div className="mb-3">
                        <h5 className="font-medium text-sm text-gray-900 mb-2">Key Insights:</h5>
                        <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                          {suggestion.insights.map((insight, insightIndex) => (
                            <li key={insightIndex}>{insight}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {suggestion.supportingReports && suggestion.supportingReports.length > 0 && (
                      <div className="mb-4">
                        <h5 className="font-medium text-sm text-gray-900 mb-2">Supporting Reports:</h5>
                        <div className="flex flex-wrap gap-1">
                          {suggestion.supportingReports.map((report, reportIndex) => (
                            <Badge key={reportIndex} variant="secondary" className="text-xs">
                              {report}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <div className="mt-4 pt-3 border-t border-gray-200">
                      <Button
                        onClick={() => handleGenerateEmail(suggestion)}
                        disabled={generatingFor === suggestion.title}
                        className="w-full flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        <Mail className="w-4 h-4" />
                        {generatingFor === suggestion.title ? "Generating Email..." : "Generate Professional Email"}
                      </Button>
                      <p className="text-xs text-gray-500 mt-1 text-center">
                        Generates email matching 13D Research professional style
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Lightbulb className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No campaign suggestions available at the moment.</p>
              <p className="text-sm text-gray-500 mt-1">Try refreshing or uploading more research reports.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Email Generation Dialog */}
      <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Generated Professional Email</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <pre className="whitespace-pre-wrap text-sm text-gray-800 font-mono leading-relaxed">
                {generatedEmail}
              </pre>
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => copyToClipboard(generatedEmail)}
                className="flex items-center space-x-2"
              >
                <Copy className="h-4 w-4" />
                <span>Copy to Clipboard</span>
              </Button>
              <Button onClick={() => setEmailDialogOpen(false)}>Close</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}