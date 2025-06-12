import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Phone, User, Building2, TrendingUp, MessageCircle, Copy, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import Layout from "@/components/layout";

interface TalkingPoint {
  mainPoint: string;
  subBullets: string[];
}

interface CallPrepResult {
  prospectSnapshot: string;
  personalBackground: string;
  companyOverview: string;
  topInterests: string;
  portfolioInsights: string;
  talkingPoints: TalkingPoint[];
  smartQuestions: string[];
}

export default function CallPreparation() {
  const [prospectName, setProspectName] = useState("");
  const [title, setTitle] = useState("");
  const [firmName, setFirmName] = useState("");
  const [interests, setInterests] = useState("");
  const [portfolioHoldings, setPortfolioHoldings] = useState("");
  const [investmentStyle, setInvestmentStyle] = useState("");
  const [pastInteractions, setPastInteractions] = useState("");
  const [notes, setNotes] = useState("");
  const [callPrepResult, setCallPrepResult] = useState<CallPrepResult | null>(null);
  const { toast } = useToast();

  const callPrepMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/ai/generate-call-prep", data);
      return response.json();
    },
    onSuccess: (data) => {
      setCallPrepResult(data);
      toast({
        title: "Call Prep Complete",
        description: "Generated comprehensive call preparation notes",
      });
    },
    onError: () => {
      toast({
        title: "Generation Failed",
        description: "Failed to generate call prep. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleGenerateCallPrep = () => {
    if (!prospectName.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide at least the prospect name.",
        variant: "destructive",
      });
      return;
    }

    callPrepMutation.mutate({
      prospectName,
      title,
      firmName,
      interests: interests.split(",").map(i => i.trim()).filter(Boolean),
      portfolioHoldings: portfolioHoldings.split(",").map(h => h.trim()).filter(Boolean),
      investmentStyle,
      pastInteractions,
      notes
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Content copied to clipboard",
    });
  };

  const copyAllCallPrep = () => {
    if (!callPrepResult) return;
    
    const fullText = `Call Preparation for ${prospectName}

PROSPECT SNAPSHOT:
${callPrepResult.prospectSnapshot}

TOP INTERESTS:
${callPrepResult.topInterests}

PORTFOLIO INSIGHTS:
${callPrepResult.portfolioInsights}

TALKING POINTS:
${callPrepResult.talkingPoints.map((point, idx) => `${idx + 1}. ${point}`).join('\n')}

SMART QUESTIONS:
${callPrepResult.smartQuestions.map((q, idx) => `${idx + 1}. ${q}`).join('\n')}`;

    copyToClipboard(fullText);
  };

  return (
    <Layout>
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Call Preparation</h1>
            <p className="text-gray-600 mt-2">
              Generate comprehensive call prep notes with talking points and strategic questions
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <User className="w-5 h-5 mr-2" />
              Prospect Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Prospect Name *
                </label>
                <Input
                  value={prospectName}
                  onChange={(e) => setProspectName(e.target.value)}
                  placeholder="John Smith"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Title
                </label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Portfolio Manager"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Firm Name
              </label>
              <Input
                value={firmName}
                onChange={(e) => setFirmName(e.target.value)}
                placeholder="Investment Partners LLC"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Known Interests (comma-separated)
              </label>
              <Input
                value={interests}
                onChange={(e) => setInterests(e.target.value)}
                placeholder="China, Technology, ESG, Commodities"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Portfolio Holdings (comma-separated)
              </label>
              <Input
                value={portfolioHoldings}
                onChange={(e) => setPortfolioHoldings(e.target.value)}
                placeholder="Apple, Tesla, Gold ETF, China Tech"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Investment Style
              </label>
              <Input
                value={investmentStyle}
                onChange={(e) => setInvestmentStyle(e.target.value)}
                placeholder="Growth, Value, Contrarian"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Past Interactions
              </label>
              <Textarea
                value={pastInteractions}
                onChange={(e) => setPastInteractions(e.target.value)}
                placeholder="Previous call notes, email exchanges, meeting outcomes..."
                rows={3}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Additional Notes
              </label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Special considerations, preferences, hot topics..."
                rows={3}
              />
            </div>

            <Button 
              onClick={handleGenerateCallPrep}
              disabled={callPrepMutation.isPending}
              className="w-full"
            >
              {callPrepMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating Call Prep...
                </>
              ) : (
                <>
                  <Phone className="w-4 h-4 mr-2" />
                  Generate Call Prep
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Results Display */}
        {callPrepResult && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Call Preparation Notes</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={copyAllCallPrep}
                className="flex items-center gap-2"
              >
                <Copy className="w-4 h-4" />
                Copy All
              </Button>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-sm">
                  <User className="w-4 h-4 mr-2" />
                  Prospect Snapshot
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-700">{callPrepResult.prospectSnapshot}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-sm">
                  <User className="w-4 h-4 mr-2" />
                  Personal Background
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-700">{callPrepResult.personalBackground}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-sm">
                  <Building2 className="w-4 h-4 mr-2" />
                  Company Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-700">{callPrepResult.companyOverview}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-sm">
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Top Interests
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-700">{callPrepResult.topInterests}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-sm">
                  <Building2 className="w-4 h-4 mr-2" />
                  Portfolio Insights
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-700">{callPrepResult.portfolioInsights}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Key Talking Points</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {callPrepResult.talkingPoints.map((point, index) => (
                    <div key={index} className="border-l-4 border-blue-200 pl-4">
                      <div className="flex items-start mb-2">
                        <Badge variant="outline" className="mr-2 mt-0.5 text-xs">
                          {index + 1}
                        </Badge>
                        <h4 className="text-sm font-semibold text-gray-900 flex-1">
                          {typeof point === 'string' ? point : point.mainPoint}
                        </h4>
                      </div>
                      {typeof point === 'object' && point.subBullets && (
                        <div className="ml-6 space-y-1">
                          {point.subBullets.map((subBullet, subIndex) => (
                            <div key={subIndex} className="flex items-start">
                              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mr-2 mt-2 flex-shrink-0"></span>
                              <p className="text-xs text-gray-600 leading-relaxed">{subBullet}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-sm">
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Smart Questions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {callPrepResult.smartQuestions.map((question, index) => (
                    <div key={index} className="flex items-start">
                      <Badge variant="outline" className="mr-2 mt-0.5 text-xs">
                        Q{index + 1}
                      </Badge>
                      <p className="text-sm text-gray-700 flex-1">{question}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {callPrepMutation.isPending && (
          <div className="flex items-center justify-center p-8">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
              <p className="text-gray-600">Analyzing prospect information and generating call prep notes...</p>
            </div>
          </div>
        )}
        </div>
      </div>
    </Layout>
  );
}