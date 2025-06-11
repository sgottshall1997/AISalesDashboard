import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { BarChart, Calculator, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface RelevanceScore {
  reportTitle: string;
  portfolioHolding: string;
  relevanceScore: number;
  reasoning: string;
  keyFactors: string[];
  riskFactors: string[];
}

export default function PortfolioScorer() {
  const [reportTitle, setReportTitle] = useState("");
  const [portfolioHoldings, setPortfolioHoldings] = useState("");
  const [scores, setScores] = useState<RelevanceScore[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleCalculateRelevance = async () => {
    if (!reportTitle.trim() || !portfolioHoldings.trim()) {
      toast({
        title: "Error",
        description: "Please enter both report title and portfolio holdings",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/relevance-score", {
        method: "POST",
        body: JSON.stringify({ 
          reportTitle: reportTitle.trim(),
          portfolioHoldings: portfolioHoldings.split(',').map(h => h.trim()).filter(h => h)
        }),
        headers: { "Content-Type": "application/json" }
      });
      const data = await response.json();
      setScores(data.scores || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to calculate relevance scores",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "bg-green-100 text-green-800";
    if (score >= 60) return "bg-yellow-100 text-yellow-800";
    if (score >= 40) return "bg-orange-100 text-orange-800";
    return "bg-red-100 text-red-800";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return "High Relevance";
    if (score >= 60) return "Medium Relevance";
    if (score >= 40) return "Low Relevance";
    return "Not Relevant";
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Portfolio Relevance Scorer</h1>
        <p className="text-gray-600 mt-2">
          Score how relevant research content is to specific portfolio holdings
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Calculate Relevance Scores
          </CardTitle>
          <CardDescription>
            Enter a report title and portfolio holdings to get relevance scores
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reportTitle">Report Title</Label>
            <Input
              id="reportTitle"
              value={reportTitle}
              onChange={(e) => setReportTitle(e.target.value)}
              placeholder="e.g., Emerging Markets Technology Outlook"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="holdings">Portfolio Holdings (comma-separated)</Label>
            <Input
              id="holdings"
              value={portfolioHoldings}
              onChange={(e) => setPortfolioHoldings(e.target.value)}
              placeholder="e.g., Apple, Microsoft, Tesla, Amazon"
            />
          </div>
          <Button 
            onClick={handleCalculateRelevance}
            disabled={isLoading || !reportTitle.trim() || !portfolioHoldings.trim()}
            className="flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Calculating...
              </>
            ) : (
              <>
                <BarChart className="h-4 w-4" />
                Calculate Relevance
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {scores.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">
            Relevance Scores for "{reportTitle}"
          </h2>
          
          <div className="grid gap-4">
            {scores.map((score, index) => (
              <Card key={index} className="border-l-4 border-l-primary">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{score.portfolioHolding}</CardTitle>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge className={getScoreColor(score.relevanceScore)}>
                          {score.relevanceScore}% - {getScoreLabel(score.relevanceScore)}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-primary">
                        {score.relevanceScore}
                      </div>
                      <div className="text-sm text-gray-500">Score</div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Reasoning</h4>
                    <p className="text-gray-700 bg-gray-50 p-3 rounded-md">
                      {score.reasoning}
                    </p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Key Factors</h4>
                    <ul className="list-disc list-inside space-y-1">
                      {score.keyFactors.map((factor, idx) => (
                        <li key={idx} className="text-gray-700">{factor}</li>
                      ))}
                    </ul>
                  </div>

                  {score.riskFactors.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">Risk Factors</h4>
                      <ul className="list-disc list-inside space-y-1">
                        {score.riskFactors.map((risk, idx) => (
                          <li key={idx} className="text-red-700">{risk}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {scores.length === 0 && !isLoading && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BarChart className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Calculate Portfolio Relevance</h3>
            <p className="text-gray-600 text-center mb-4">
              Enter a report title and your portfolio holdings to see how relevant the content is to your investments.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}