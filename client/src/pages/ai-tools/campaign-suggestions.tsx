import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, Copy, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

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

export default function CampaignSuggestions() {
  const [suggestions, setSuggestions] = useState<ContentSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleGenerateSuggestions = async () => {
    setIsLoading(true);
    try {
      const response = await apiRequest("/api/ai/content-suggestions", {
        method: "GET",
      });
      setSuggestions(response);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate campaign suggestions",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Content copied to clipboard",
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "bg-red-100 text-red-800";
      case "medium": return "bg-yellow-100 text-yellow-800";
      case "low": return "bg-green-100 text-green-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "frequent_theme": return "bg-blue-100 text-blue-800";
      case "emerging_trend": return "bg-purple-100 text-purple-800";
      case "cross_sector": return "bg-orange-100 text-orange-800";
      case "deep_dive": return "bg-teal-100 text-teal-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Campaign Ideas</h1>
          <p className="text-gray-600 mt-2">
            Generate intelligent campaign suggestions based on content themes and market trends
          </p>
        </div>
        <Button 
          onClick={handleGenerateSuggestions}
          disabled={isLoading}
          className="flex items-center gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Lightbulb className="h-4 w-4" />
              Generate Ideas
            </>
          )}
        </Button>
      </div>

      {suggestions.length > 0 && (
        <div className="grid gap-6">
          {suggestions.map((suggestion, index) => (
            <Card key={index} className="border-l-4 border-l-primary">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <CardTitle className="text-xl">{suggestion.title}</CardTitle>
                    <CardDescription>{suggestion.description}</CardDescription>
                    <div className="flex gap-2">
                      <Badge className={getPriorityColor(suggestion.priority)}>
                        {suggestion.priority} priority
                      </Badge>
                      <Badge className={getTypeColor(suggestion.type)}>
                        {suggestion.type.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(suggestion.emailAngle)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Email Angle</h4>
                  <p className="text-gray-700 bg-gray-50 p-3 rounded-md">
                    {suggestion.emailAngle}
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Key Points</h4>
                  <ul className="list-disc list-inside space-y-1">
                    {suggestion.keyPoints.map((point, idx) => (
                      <li key={idx} className="text-gray-700">{point}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Supporting Insights</h4>
                  <ul className="list-disc list-inside space-y-1">
                    {suggestion.insights.map((insight, idx) => (
                      <li key={idx} className="text-gray-700">{insight}</li>
                    ))}
                  </ul>
                </div>

                {suggestion.supportingReports.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Supporting Reports</h4>
                    <div className="flex flex-wrap gap-2">
                      {suggestion.supportingReports.map((report, idx) => (
                        <Badge key={idx} variant="outline">
                          {report}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {suggestions.length === 0 && !isLoading && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Lightbulb className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Campaign Ideas Yet</h3>
            <p className="text-gray-600 text-center mb-4">
              Click "Generate Ideas" to create intelligent campaign suggestions based on your content themes and market trends.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}