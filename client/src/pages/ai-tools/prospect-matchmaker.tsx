import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Target, Search, Loader2, Copy, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface ProspectMatch {
  clientName: string;
  matchScore: number;
  matchReason: string;
  interests: string[];
  relevantThemes: string[];
  suggestedTalkingPoints: string[];
}

export default function ProspectMatchmaker() {
  const [reportTitle, setReportTitle] = useState("");
  const [matches, setMatches] = useState<ProspectMatch[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleFindMatches = async () => {
    if (!reportTitle.trim()) {
      toast({
        title: "Error",
        description: "Please enter a report title",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/match-prospect-themes", {
        method: "POST",
        body: JSON.stringify({ reportTitle: reportTitle.trim() }),
        headers: { "Content-Type": "application/json" }
      });
      const data = await response.json();
      setMatches(data.matches || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to find prospect matches",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copyTalkingPoints = (points: string[]) => {
    const text = points.join('\n• ');
    navigator.clipboard.writeText(`• ${text}`);
    toast({
      title: "Copied",
      description: "Talking points copied to clipboard",
    });
  };

  const getMatchScoreColor = (score: number) => {
    if (score >= 80) return "bg-green-100 text-green-800";
    if (score >= 60) return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Prospect Match</h1>
        <p className="text-gray-600 mt-2">
          Find the best prospects for your reports based on their interests and investment themes
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Find Matching Prospects
          </CardTitle>
          <CardDescription>
            Enter a report title to find prospects with relevant interests
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reportTitle">Report Title</Label>
            <Input
              id="reportTitle"
              value={reportTitle}
              onChange={(e) => setReportTitle(e.target.value)}
              placeholder="e.g., China's Critical Minerals Supply Chain"
              onKeyDown={(e) => e.key === 'Enter' && handleFindMatches()}
            />
          </div>
          <Button 
            onClick={handleFindMatches}
            disabled={isLoading || !reportTitle.trim()}
            className="flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Finding Matches...
              </>
            ) : (
              <>
                <Search className="h-4 w-4" />
                Find Matches
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {matches.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <Users className="h-5 w-5" />
            Prospect Matches ({matches.length})
          </h2>
          
          <div className="grid gap-4">
            {matches.map((match, index) => (
              <Card key={index} className="border-l-4 border-l-primary">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{match.clientName}</CardTitle>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge className={getMatchScoreColor(match.matchScore)}>
                          {match.matchScore}% Match
                        </Badge>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyTalkingPoints(match.suggestedTalkingPoints)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Match Reason</h4>
                    <p className="text-gray-700 bg-gray-50 p-3 rounded-md">
                      {match.matchReason}
                    </p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Interests</h4>
                    <div className="flex flex-wrap gap-2">
                      {match.interests.map((interest, idx) => (
                        <Badge key={idx} variant="secondary">
                          {interest}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Relevant Themes</h4>
                    <div className="flex flex-wrap gap-2">
                      {match.relevantThemes.map((theme, idx) => (
                        <Badge key={idx} variant="outline" className="border-primary text-primary">
                          {theme}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Suggested Talking Points</h4>
                    <ul className="list-disc list-inside space-y-1">
                      {match.suggestedTalkingPoints.map((point, idx) => (
                        <li key={idx} className="text-gray-700">{point}</li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {matches.length === 0 && !isLoading && reportTitle && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Target className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Matches Found</h3>
            <p className="text-gray-600 text-center">
              No prospects found matching the report "{reportTitle}". Try a different report title or check your client database.
            </p>
          </CardContent>
        </Card>
      )}

      {matches.length === 0 && !isLoading && !reportTitle && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Target className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Find Your Perfect Prospects</h3>
            <p className="text-gray-600 text-center mb-4">
              Enter a report title above to discover which prospects would be most interested in your content.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}