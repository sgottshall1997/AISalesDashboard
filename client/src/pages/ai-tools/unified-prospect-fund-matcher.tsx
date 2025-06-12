import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, Target, Building2, Loader2, TrendingUp, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { AiFeedback } from "@/components/ai-feedback";
import Layout from "@/components/layout";

interface MatchedReport {
  id: number;
  title: string;
  relevanceScore: number;
  keyThemes: string[];
  publishedDate: string;
  type: string;
  matchReason: string;
}

interface ThematicAlignment {
  theme: string;
  strength: number;
  supportingReports: number;
}

interface MatchResults {
  prospectName?: string;
  fundName?: string;
  strategy?: string;
  riskLevel?: string;
  relevantReports: MatchedReport[];
  wiltwReports: MatchedReport[];
  watmtuReports: MatchedReport[];
  thematicAlignment: ThematicAlignment[];
  recommendations: Array<{
    type: 'opportunity' | 'risk' | 'neutral';
    description: string;
    priority: 'high' | 'medium' | 'low';
  }>;
  summary: string;
}

export default function UnifiedProspectFundMatcher() {
  // Form fields from both tools
  const [prospectName, setProspectName] = useState("");
  const [company, setCompany] = useState("");
  const [title, setTitle] = useState("");
  const [interests, setInterests] = useState("");
  const [fundName, setFundName] = useState("");
  const [strategy, setStrategy] = useState("");
  const [riskProfile, setRiskProfile] = useState("");
  const [portfolioHoldings, setPortfolioHoldings] = useState("");
  const [investmentStyle, setInvestmentStyle] = useState("");
  const [additionalContext, setAdditionalContext] = useState("");
  
  const [results, setResults] = useState<MatchResults | null>(null);
  const [matcherContentId, setMatcherContentId] = useState<number | null>(null);
  const { toast } = useToast();

  const matchMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/unified-prospect-fund-match", data);
      return response.json();
    },
    onSuccess: (data) => {
      setResults(data);
      setMatcherContentId(data.contentId || null);
      const entityName = data.prospectName || data.fundName || "Entity";
      toast({
        title: "Matching Complete",
        description: `Found ${data.relevantReports?.length || 0} relevant reports for ${entityName}`,
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
    // Validate required fields
    if (!prospectName.trim() && !fundName.trim()) {
      toast({
        title: "Missing Information",
        description: "Please enter either a prospect name or fund name",
        variant: "destructive",
      });
      return;
    }

    if (!interests.trim() && !strategy) {
      toast({
        title: "Missing Information", 
        description: "Please enter either interests or investment strategy",
        variant: "destructive",
      });
      return;
    }

    const requestData = {
      prospectName: prospectName.trim() || undefined,
      company: company.trim() || undefined,
      title: title.trim() || undefined,
      fundName: fundName.trim() || undefined,
      strategy: strategy || undefined,
      riskProfile: riskProfile || undefined,
      interests: interests.trim() || undefined,
      portfolioHoldings: portfolioHoldings.trim() || undefined,
      investmentStyle: investmentStyle.trim() || undefined,
      additionalContext: additionalContext.trim() || undefined
    };

    matchMutation.mutate(requestData);
  };

  const clearForm = () => {
    setProspectName("");
    setCompany("");
    setTitle("");
    setInterests("");
    setFundName("");
    setStrategy("");
    setRiskProfile("");
    setPortfolioHoldings("");
    setInvestmentStyle("");
    setAdditionalContext("");
    setResults(null);
  };

  return (
    <Layout>
      <div className="space-y-6 p-6">
        <div className="flex items-center mb-6">
          <Target className="w-6 h-6 mr-3 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900">Prospect & Fund Research Matcher</h1>
        </div>

      <Card className="max-w-6xl">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Search className="w-5 h-5 mr-2" />
            Match Prospects or Funds to Research Reports
          </CardTitle>
          <p className="text-sm text-gray-600">
            Find relevant research reports and themes based on prospect interests or fund strategy
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Prospect Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <Target className="w-4 h-4 mr-2" />
                Prospect Information
              </h3>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Prospect Name
                  </label>
                  <Input
                    value={prospectName}
                    onChange={(e) => setProspectName(e.target.value)}
                    placeholder="e.g., John Smith"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Company
                  </label>
                  <Input
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="e.g., ABC Capital Management"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Title
                  </label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., Portfolio Manager"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Investment Interests
                  </label>
                  <Input
                    value={interests}
                    onChange={(e) => setInterests(e.target.value)}
                    placeholder="e.g., uranium, inflation, energy, tech"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Portfolio Holdings
                  </label>
                  <Input
                    value={portfolioHoldings}
                    onChange={(e) => setPortfolioHoldings(e.target.value)}
                    placeholder="e.g., Apple, Microsoft, Gold ETF"
                  />
                </div>
              </div>
            </div>

            {/* Fund Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <Building2 className="w-4 h-4 mr-2" />
                Fund Information
              </h3>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fund Name
                  </label>
                  <Input
                    value={fundName}
                    onChange={(e) => setFundName(e.target.value)}
                    placeholder="e.g., Growth Opportunities Fund"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
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
                      <SelectItem value="balanced">Balanced</SelectItem>
                      <SelectItem value="income">Income Focused</SelectItem>
                      <SelectItem value="sector">Sector Focused</SelectItem>
                      <SelectItem value="global">Global Diversified</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
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
                      <SelectItem value="high">High Risk</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Investment Style
                  </label>
                  <Input
                    value={investmentStyle}
                    onChange={(e) => setInvestmentStyle(e.target.value)}
                    placeholder="e.g., Long/Short Equity, Macro, ESG"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Additional Context */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Additional Context
            </label>
            <Textarea
              value={additionalContext}
              onChange={(e) => setAdditionalContext(e.target.value)}
              placeholder="Add any additional context about investment preferences, risk tolerance, or specific sectors of interest..."
              className="min-h-[80px]"
              rows={3}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button 
              onClick={handleFindMatches}
              disabled={matchMutation.isPending || (!prospectName.trim() && !fundName.trim()) || (!interests.trim() && !strategy)}
              className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
            >
              {matchMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Finding Matches...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  Find Matching Reports
                </>
              )}
            </Button>
            <Button variant="outline" onClick={clearForm}>
              Clear Form
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {results && (
        <div className="space-y-6">
          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="w-5 h-5 mr-2 text-green-600" />
                Analysis Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700">{results.summary}</p>
            </CardContent>
          </Card>

          {/* WILTW Reports */}
          {results.wiltwReports && results.wiltwReports.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="w-5 h-5 mr-2 text-green-600" />
                  WILTW Reports ({results.wiltwReports.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {results.wiltwReports.map((report, index) => (
                    <div key={index} className="border rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-semibold text-gray-900">{report.title}</h4>
                        <Badge variant="outline" className="ml-2">
                          {report.relevanceScore}% match
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{report.matchReason}</p>
                      <div className="flex flex-wrap gap-1 mb-2">
                        {report.keyThemes.map((theme, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {theme}
                          </Badge>
                        ))}
                      </div>
                      <p className="text-xs text-gray-500">
                        {report.type} • Published: {report.publishedDate}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* WATMTU Reports */}
          {results.watmtuReports && results.watmtuReports.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="w-5 h-5 mr-2 text-orange-600" />
                  WATMTU Reports ({results.watmtuReports.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {results.watmtuReports.map((report, index) => (
                    <div key={index} className="border rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-semibold text-gray-900">{report.title}</h4>
                        <Badge variant="outline" className="ml-2">
                          {report.relevanceScore}% match
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{report.matchReason}</p>
                      <div className="flex flex-wrap gap-1 mb-2">
                        {report.keyThemes.map((theme, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {theme}
                          </Badge>
                        ))}
                      </div>
                      <p className="text-xs text-gray-500">
                        {report.type} • Published: {report.publishedDate}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Thematic Alignment */}
          {results.thematicAlignment && results.thematicAlignment.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Thematic Alignment</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {results.thematicAlignment.map((theme, index) => (
                      <div key={index} className="space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">{theme.theme}</span>
                          <span className="text-xs text-gray-500">
                            {theme.supportingReports} reports
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ width: `${theme.strength}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Recommendations */}
              {results.recommendations && results.recommendations.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Recommendations</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {results.recommendations.map((rec, index) => (
                        <div key={index} className="flex items-start space-x-3">
                          <Badge 
                            variant={rec.priority === 'high' ? 'destructive' : rec.priority === 'medium' ? 'default' : 'secondary'}
                            className="mt-0.5"
                          >
                            {rec.priority}
                          </Badge>
                          <p className="text-sm text-gray-700 flex-1">{rec.description}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      )}

      {matchMutation.isPending && (
        <div className="flex items-center justify-center p-8">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
            <p className="text-gray-600">Analyzing and matching against research reports...</p>
          </div>
        </div>
      )}
      </div>
    </Layout>
  );
}