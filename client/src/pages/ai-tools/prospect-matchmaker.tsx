import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Search, Target } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface ProspectMatch {
  prospectName: string;
  company: string;
  matchReason: string;
  confidenceScore: number;
  interests: string[];
  relevantThemes: string[];
  suggestedTalkingPoints: string[];
}

export default function ProspectMatchmaker() {
  const [prospectName, setProspectName] = useState("");
  const [interests, setInterests] = useState("");
  const [additionalContext, setAdditionalContext] = useState("");
  const [matches, setMatches] = useState<ProspectMatch[]>([]);
  const { toast } = useToast();

  const matchMutation = useMutation({
    mutationFn: async (data: { prospectName: string; interests: string; additionalContext?: string }) => {
      const response = await apiRequest("POST", "/api/match-prospect-themes", data);
      return response.json();
    },
    onSuccess: (data) => {
      setMatches(data.matches || []);
      toast({
        title: "Matching Complete",
        description: `Found ${data.matches?.length || 0} relevant reports for ${prospectName}`,
      });
    },
    onError: () => {
      toast({
        title: "Matching Failed",
        description: "Failed to find matching reports. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleFindMatches = () => {
    if (!prospectName.trim() || !interests.trim()) {
      toast({
        title: "Missing Information",
        description: "Please enter both prospect name and interests",
        variant: "destructive",
      });
      return;
    }

    matchMutation.mutate({
      prospectName: prospectName.trim(),
      interests: interests.trim(),
      additionalContext: additionalContext.trim() || undefined
    });
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center mb-6">
        <Target className="w-6 h-6 mr-3 text-blue-600" />
        <h1 className="text-2xl font-bold text-gray-900">Prospect Matchmaker - Theme-to-Client Matching</h1>
      </div>

      <Card className="max-w-4xl">
        <CardContent className="p-6">
          <div className="space-y-6">
            {/* Prospect Name */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Prospect Name
              </label>
              <Input
                value={prospectName}
                onChange={(e) => setProspectName(e.target.value)}
                placeholder="Enter prospect or client name"
                className="w-full"
              />
            </div>

            {/* Interests */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Interests (comma-separated)
              </label>
              <Input
                value={interests}
                onChange={(e) => setInterests(e.target.value)}
                placeholder="e.g. uranium, inflation, energy, tech"
                className="w-full"
              />
            </div>

            {/* Additional Context */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Additional Context (optional)
              </label>
              <Textarea
                value={additionalContext}
                onChange={(e) => setAdditionalContext(e.target.value)}
                placeholder="Add any additional context about the prospect's investment preferences, risk tolerance, or specific sectors of interest..."
                className="w-full min-h-[80px]"
                rows={3}
              />
            </div>

            {/* Find Matching Reports Button */}
            <div>
              <Button 
                onClick={handleFindMatches}
                disabled={matchMutation.isPending || !prospectName.trim() || !interests.trim()}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-2"
              >
                {matchMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Finding Matches...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    Find Matching Reports
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Results Area */}
          {matches && matches.length > 0 ? (
            <div className="mt-8 space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Matching Reports for {prospectName}
              </h3>
              {matches.map((match, index) => (
                <Card key={index} className="border border-gray-200">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-semibold text-gray-900">{match.company}</h4>
                        <p className="text-sm text-gray-600">Confidence: {match.confidenceScore}%</p>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <div>
                        <h5 className="font-medium text-gray-900 mb-1">Match Reason</h5>
                        <p className="text-gray-700 text-sm bg-gray-50 p-2 rounded">
                          {match.matchReason}
                        </p>
                      </div>

                      {match.relevantThemes && match.relevantThemes.length > 0 && (
                        <div>
                          <h5 className="font-medium text-gray-900 mb-2">Relevant Themes</h5>
                          <div className="flex flex-wrap gap-2">
                            {match.relevantThemes.map((theme, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                              >
                                {theme}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {match.suggestedTalkingPoints && match.suggestedTalkingPoints.length > 0 && (
                        <div>
                          <h5 className="font-medium text-gray-900 mb-2">Suggested Talking Points</h5>
                          <ul className="text-sm text-gray-700 space-y-1">
                            {match.suggestedTalkingPoints.map((point, idx) => (
                              <li key={idx} className="flex items-start">
                                <span className="text-blue-600 mr-2">•</span>
                                {point}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="mt-8 min-h-[200px] border-2 border-dashed border-gray-200 rounded-lg flex items-center justify-center">
              <div className="text-center text-gray-500">
                <Target className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">Prospect Matching Results</p>
                <p className="text-sm mt-2">
                  Enter prospect details and interests to find relevant reports and talking points
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}