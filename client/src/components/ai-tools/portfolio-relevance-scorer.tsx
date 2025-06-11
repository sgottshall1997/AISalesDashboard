import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { BarChart3, Upload, TrendingUp, FileText } from "lucide-react";

interface ScoredReport {
  id: number;
  title: string;
  summary: string;
  relevanceScore: number;
  matchedTickers: string[];
  sectorMatches: string[];
  publishedDate: string;
}

export function PortfolioRelevanceScorer() {
  const [portfolioData, setPortfolioData] = useState("");
  const [scoredReports, setScoredReports] = useState<ScoredReport[]>([]);
  const { toast } = useToast();

  const scorePortfolioMutation = useMutation({
    mutationFn: async (data: { tickers: string[] }) => {
      const response = await apiRequest("POST", "/api/relevance-score", data);
      return response.json();
    },
    onSuccess: (data) => {
      setScoredReports(data.scoredReports || []);
      toast({
        title: "Portfolio Analysis Complete",
        description: `Scored ${data.scoredReports?.length || 0} reports for relevance`,
      });
    },
    onError: () => {
      toast({
        title: "Scoring Failed",
        description: "Failed to score portfolio relevance. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === "text/csv") {
      const reader = new FileReader();
      reader.onload = (e) => {
        const csvContent = e.target?.result as string;
        setPortfolioData(csvContent);
      };
      reader.readAsText(file);
    } else {
      toast({
        title: "Invalid File",
        description: "Please upload a CSV file.",
        variant: "destructive",
      });
    }
  };

  const parsePortfolioData = (data: string): string[] => {
    const lines = data.split('\n');
    const tickers: string[] = [];
    
    lines.forEach(line => {
      const parts = line.split(',');
      parts.forEach(part => {
        const cleaned = part.trim().toUpperCase();
        if (cleaned.match(/^[A-Z]{1,5}$/)) {
          tickers.push(cleaned);
        }
      });
    });
    
    return [...new Set(tickers)];
  };

  const handleAnalyze = () => {
    if (!portfolioData.trim()) {
      toast({
        title: "No Portfolio Data",
        description: "Please provide portfolio tickers or upload a CSV file.",
        variant: "destructive",
      });
      return;
    }

    const tickers = parsePortfolioData(portfolioData);
    if (tickers.length === 0) {
      toast({
        title: "No Valid Tickers",
        description: "Could not find valid ticker symbols in the provided data.",
        variant: "destructive",
      });
      return;
    }

    scorePortfolioMutation.mutate({ tickers });
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "bg-green-500";
    if (score >= 60) return "bg-blue-500";
    if (score >= 40) return "bg-yellow-500";
    return "bg-red-500";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return "Highly Relevant";
    if (score >= 60) return "Moderately Relevant";
    if (score >= 40) return "Somewhat Relevant";
    return "Low Relevance";
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <BarChart3 className="w-5 h-5 mr-2" />
            Portfolio Relevance Scorer
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Portfolio Holdings
              </label>
              <Textarea
                value={portfolioData}
                onChange={(e) => setPortfolioData(e.target.value)}
                placeholder="Enter tickers separated by commas (e.g., AAPL, TSLA, NVDA) or upload CSV file..."
                rows={4}
                className="font-mono text-sm"
              />
            </div>

            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Or Upload CSV File
                </label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
              </div>
              
              <div className="flex items-end">
                <Button 
                  onClick={handleAnalyze}
                  disabled={scorePortfolioMutation.isPending}
                  className="flex items-center gap-2"
                >
                  <TrendingUp className="w-4 h-4" />
                  {scorePortfolioMutation.isPending ? "Analyzing..." : "Score Relevance"}
                </Button>
              </div>
            </div>

            {portfolioData && (
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-sm font-medium text-gray-700 mb-1">Detected Tickers:</p>
                <div className="flex flex-wrap gap-1">
                  {parsePortfolioData(portfolioData).slice(0, 10).map((ticker) => (
                    <Badge key={ticker} variant="outline" className="text-xs">
                      {ticker}
                    </Badge>
                  ))}
                  {parsePortfolioData(portfolioData).length > 10 && (
                    <Badge variant="outline" className="text-xs">
                      +{parsePortfolioData(portfolioData).length - 10} more
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {scoredReports.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Portfolio Relevance Report</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {scoredReports.map((report) => (
                <div key={report.id} className="border rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{report.title}</h3>
                      <p className="text-sm text-gray-500 mt-1">
                        Published: {new Date(report.publishedDate).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-gray-900">{report.relevanceScore}%</div>
                      <div className="text-xs text-gray-500">{getScoreLabel(report.relevanceScore)}</div>
                    </div>
                  </div>

                  <div className="mb-3">
                    <Progress value={report.relevanceScore} className="h-2">
                      <div 
                        className={`h-full rounded-full ${getScoreColor(report.relevanceScore)}`}
                        style={{ width: `${report.relevanceScore}%` }}
                      />
                    </Progress>
                  </div>

                  <p className="text-sm text-gray-700 mb-3">
                    {report.summary.substring(0, 150)}...
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                    {report.matchedTickers.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-gray-600 mb-1">Matched Tickers:</p>
                        <div className="flex flex-wrap gap-1">
                          {report.matchedTickers.map((ticker) => (
                            <Badge key={ticker} className="bg-green-100 text-green-800 text-xs">
                              {ticker}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {report.sectorMatches.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-gray-600 mb-1">Sector Matches:</p>
                        <div className="flex flex-wrap gap-1">
                          {report.sectorMatches.map((sector) => (
                            <Badge key={sector} className="bg-blue-100 text-blue-800 text-xs">
                              {sector}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <FileText className="w-3 h-3 mr-1" />
                      View Report
                    </Button>
                    <Button variant="outline" size="sm">
                      Generate Analysis
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {scorePortfolioMutation.isPending && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-500 mt-2">Analyzing portfolio relevance across all reports...</p>
        </div>
      )}
    </div>
  );
}