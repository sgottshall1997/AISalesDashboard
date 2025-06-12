import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Target, Search, Star, FileText } from "lucide-react";

interface MatchedReport {
  id: number;
  title: string;
  summary: string;
  confidence: number;
  matchedThemes: string[];
  publishedDate: string;
}

export function ProspectMatchmaker() {
  const [prospectName, setProspectName] = useState("");
  const [interests, setInterests] = useState("");
  const [additionalContext, setAdditionalContext] = useState("");
  const [matchedReports, setMatchedReports] = useState<MatchedReport[]>([]);
  const { toast } = useToast();

  const matchProspectMutation = useMutation({
    mutationFn: async (data: { prospectName: string; interests: string[]; additionalContext?: string }) => {
      const response = await apiRequest("/api/match-prospect-themes", "POST", data);
      return response.json();
    },
    onSuccess: (data) => {
      setMatchedReports(data.matches || []);
      toast({
        title: "Prospect Matched",
        description: `Found ${data.matches?.length || 0} relevant reports for ${prospectName}`,
      });
    },
    onError: () => {
      toast({
        title: "Matching Failed",
        description: "Failed to match prospect interests. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleMatch = () => {
    if (!prospectName.trim() || !interests.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide both prospect name and interests.",
        variant: "destructive",
      });
      return;
    }

    const interestArray = interests.split(",").map(s => s.trim()).filter(s => s.length > 0);
    matchProspectMutation.mutate({ 
      prospectName, 
      interests: interestArray,
      additionalContext: additionalContext.trim() || undefined
    });
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return "bg-green-100 text-green-800";
    if (confidence >= 60) return "bg-blue-100 text-blue-800";
    if (confidence >= 40) return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  };

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 80) return "High Match";
    if (confidence >= 60) return "Good Match";
    if (confidence >= 40) return "Moderate Match";
    return "Low Match";
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Target className="w-5 h-5 mr-2" />
            Prospect Matchmaker - Theme-to-Client Matching
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Prospect Name
                </label>
                <Input
                  value={prospectName}
                  onChange={(e) => setProspectName(e.target.value)}
                  placeholder="Enter prospect or client name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Interests (comma-separated)
                </label>
                <Input
                  value={interests}
                  onChange={(e) => setInterests(e.target.value)}
                  placeholder="e.g. uranium, inflation, energy, tech"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Additional Context (optional)
              </label>
              <Textarea
                value={additionalContext}
                onChange={(e) => setAdditionalContext(e.target.value)}
                placeholder="Add any additional context about the prospect's investment preferences, risk tolerance, or specific sectors of interest..."
                rows={3}
              />
            </div>

            <Button 
              onClick={handleMatch}
              disabled={matchProspectMutation.isPending}
              className="w-full"
            >
              <Search className="w-4 h-4 mr-2" />
              {matchProspectMutation.isPending ? "Matching..." : "Find Matching Reports"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {matchedReports.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Matched Reports for {prospectName}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {matchedReports.map((report, index) => (
                <div key={report.id} className="border rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{report.title}</h3>
                      <p className="text-sm text-gray-500 mt-1">
                        Published: {new Date(report.publishedDate).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getConfidenceColor(report.confidence)}>
                        <Star className="w-3 h-3 mr-1" />
                        {report.confidence}% - {getConfidenceLabel(report.confidence)}
                      </Badge>
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-700 mb-3">
                    {report.summary.substring(0, 200)}...
                  </p>
                  
                  {report.matchedThemes.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs font-medium text-gray-600 mb-1">Matched Themes:</p>
                      <div className="flex flex-wrap gap-1">
                        {report.matchedThemes.map((theme, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {theme}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <FileText className="w-3 h-3 mr-1" />
                      View Full Report
                    </Button>
                    <Button variant="outline" size="sm">
                      Generate Email
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {matchProspectMutation.isPending && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-500 mt-2">Analyzing prospect interests and matching with reports...</p>
        </div>
      )}
    </div>
  );
}