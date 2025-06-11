import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Building2, Search, TrendingUp, AlertCircle } from "lucide-react";

interface FundAnalysis {
  fundName: string;
  strategy: string;
  riskLevel: string;
  relevantReports: Array<{
    id: number;
    title: string;
    relevanceScore: number;
    keyThemes: string[];
    publishedDate: string;
  }>;
  thematicAlignment: Array<{
    theme: string;
    strength: number;
    supportingReports: number;
  }>;
  recommendations: Array<{
    type: 'opportunity' | 'risk' | 'neutral';
    description: string;
    priority: 'high' | 'medium' | 'low';
  }>;
}

export function FundMappingTool() {
  const [fundName, setFundName] = useState("");
  const [strategy, setStrategy] = useState("");
  const [riskProfile, setRiskProfile] = useState("");
  const [analysis, setAnalysis] = useState<FundAnalysis | null>(null);
  const { toast } = useToast();

  const { data: fundStrategies = [], isLoading: strategiesLoading } = useQuery({
    queryKey: ["/api/fund-strategies"],
    queryFn: () => apiRequest("GET", "/api/fund-strategies").then(res => res.json()),
  });

  const mapFundMutation = useMutation({
    mutationFn: async (data: { fundName: string; strategy: string; riskProfile: string }) => {
      const response = await apiRequest("POST", "/api/map-fund-themes", data);
      return response.json();
    },
    onSuccess: (data) => {
      setAnalysis(data.analysis);
      toast({
        title: "Fund Analysis Complete",
        description: `Mapped ${data.analysis?.relevantReports?.length || 0} relevant reports to fund strategy`,
      });
    },
    onError: () => {
      toast({
        title: "Analysis Failed",
        description: "Failed to analyze fund mapping. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleAnalyze = () => {
    if (!fundName.trim() || !strategy || !riskProfile) {
      toast({
        title: "Missing Information",
        description: "Please provide fund name, strategy, and risk profile.",
        variant: "destructive",
      });
      return;
    }

    mapFundMutation.mutate({ fundName, strategy, riskProfile });
  };

  const getRecommendationIcon = (type: string) => {
    switch (type) {
      case 'opportunity': return <TrendingUp className="w-4 h-4 text-green-600" />;
      case 'risk': return <AlertCircle className="w-4 h-4 text-red-600" />;
      default: return <Building2 className="w-4 h-4 text-blue-600" />;
    }
  };

  const getRecommendationColor = (type: string) => {
    switch (type) {
      case 'opportunity': return "bg-green-50 border-green-200";
      case 'risk': return "bg-red-50 border-red-200";
      default: return "bg-blue-50 border-blue-200";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return "bg-red-100 text-red-800";
      case 'medium': return "bg-yellow-100 text-yellow-800";
      default: return "bg-green-100 text-green-800";
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Building2 className="w-5 h-5 mr-2" />
            Fund Strategy Mapping Tool
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fund Name
                </label>
                <Input
                  value={fundName}
                  onChange={(e) => setFundName(e.target.value)}
                  placeholder="Enter fund name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Investment Strategy
                </label>
                <Select value={strategy} onValueChange={setStrategy}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select strategy" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="value">Value Investing</SelectItem>
                    <SelectItem value="growth">Growth Investing</SelectItem>
                    <SelectItem value="momentum">Momentum Strategy</SelectItem>
                    <SelectItem value="contrarian">Contrarian Investing</SelectItem>
                    <SelectItem value="sector-rotation">Sector Rotation</SelectItem>
                    <SelectItem value="thematic">Thematic Investing</SelectItem>
                    <SelectItem value="long-short">Long/Short Equity</SelectItem>
                    <SelectItem value="macro">Global Macro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Risk Profile
                </label>
                <Select value={riskProfile} onValueChange={setRiskProfile}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select risk level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="conservative">Conservative</SelectItem>
                    <SelectItem value="moderate">Moderate</SelectItem>
                    <SelectItem value="aggressive">Aggressive</SelectItem>
                    <SelectItem value="speculative">Speculative</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button 
              onClick={handleAnalyze}
              disabled={mapFundMutation.isPending}
              className="w-full"
            >
              <Search className="w-4 h-4 mr-2" />
              {mapFundMutation.isPending ? "Analyzing..." : "Map Fund to Research Themes"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {analysis && (
        <div className="space-y-6">
          {/* Thematic Alignment */}
          <Card>
            <CardHeader>
              <CardTitle>Thematic Alignment Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analysis.thematicAlignment.map((theme, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{theme.theme}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">
                          {theme.supportingReports} reports
                        </span>
                        <span className="text-sm font-medium">
                          {theme.strength}%
                        </span>
                      </div>
                    </div>
                    <Progress value={theme.strength} className="h-2" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Relevant Reports */}
          <Card>
            <CardHeader>
              <CardTitle>Relevant Research Reports</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analysis.relevantReports.map((report) => (
                  <div key={report.id} className="border rounded-lg p-3 hover:bg-gray-50">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium text-gray-900">{report.title}</h4>
                      <Badge variant="outline">
                        {report.relevanceScore}% match
                      </Badge>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex flex-wrap gap-1">
                        {report.keyThemes.map((theme, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {theme}
                          </Badge>
                        ))}
                      </div>
                      <span className="text-xs text-gray-500">
                        {new Date(report.publishedDate).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recommendations */}
          <Card>
            <CardHeader>
              <CardTitle>Strategic Recommendations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analysis.recommendations.map((rec, index) => (
                  <div key={index} className={`border rounded-lg p-3 ${getRecommendationColor(rec.type)}`}>
                    <div className="flex items-start gap-3">
                      {getRecommendationIcon(rec.type)}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium capitalize">{rec.type}</span>
                          <Badge className={getPriorityColor(rec.priority)} variant="outline">
                            {rec.priority} priority
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-700">{rec.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {mapFundMutation.isPending && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-500 mt-2">
            Analyzing fund strategy and mapping to research themes...
          </p>
        </div>
      )}
    </div>
  );
}