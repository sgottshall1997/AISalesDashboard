import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { AiFeedback } from "@/components/ai-feedback";
import { Phone, User, Building, Building2, TrendingUp, MessageCircle, HelpCircle, Loader2 } from "lucide-react";

interface TalkingPoint {
  mainPoint: string;
  subBullets: string[];
}

interface CallPrepResult {
  prospectSnapshot: string;
  personalBackground?: string;
  companyOverview?: string;
  topInterests: string;
  portfolioInsights: string;
  talkingPoints: (string | TalkingPoint)[];
  smartQuestions: string[];
}

export function CallPreparation() {
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

  const generateCallPrepMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/ai/generate-call-prep", {
        prospectName,
        title,
        firmName,
        interests: interests.split(",").map(i => i.trim()).filter(Boolean),
        portfolioHoldings: portfolioHoldings.split(",").map(h => h.trim()).filter(Boolean),
        investmentStyle,
        pastInteractions,
        notes
      });
      return response.json();
    },
    onSuccess: (data) => {
      setCallPrepResult(data);
      toast({
        title: "Call Prep Generated",
        description: "AI-powered call preparation notes ready for your meeting.",
      });
    },
    onError: (error) => {
      toast({
        title: "Generation Failed",
        description: "Failed to generate call prep notes. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleGenerate = () => {
    if (!prospectName.trim()) {
      toast({
        title: "Missing Information",
        description: "Please enter at least the prospect's name.",
        variant: "destructive",
      });
      return;
    }
    generateCallPrepMutation.mutate();
  };

  const clearForm = () => {
    setProspectName("");
    setTitle("");
    setFirmName("");
    setInterests("");
    setPortfolioHoldings("");
    setInvestmentStyle("");
    setPastInteractions("");
    setNotes("");
    setCallPrepResult(null);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Phone className="w-5 h-5 mr-2 text-blue-600" />
            Call Preparation Tool
          </CardTitle>
          <p className="text-sm text-gray-600">
            Generate AI-powered call prep notes based on prospect details and research themes
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="prospect-name">Prospect Name *</Label>
              <Input
                id="prospect-name"
                placeholder="e.g., John Smith"
                value={prospectName}
                onChange={(e) => setProspectName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                placeholder="e.g., Portfolio Manager"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="firm-name">Firm Name</Label>
            <Input
              id="firm-name"
              placeholder="e.g., ABC Capital Management"
              value={firmName}
              onChange={(e) => setFirmName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="interests">Known Interests</Label>
            <Input
              id="interests"
              placeholder="e.g., Commodities, China, Technology, ESG (comma separated)"
              value={interests}
              onChange={(e) => setInterests(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="portfolio-holdings">Portfolio Holdings</Label>
            <Input
              id="portfolio-holdings"
              placeholder="e.g., Apple, Microsoft, Gold ETF, Energy stocks (comma separated)"
              value={portfolioHoldings}
              onChange={(e) => setPortfolioHoldings(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="investment-style">Investment Style</Label>
            <Input
              id="investment-style"
              placeholder="e.g., Value, Growth, Long/Short Equity, Macro"
              value={investmentStyle}
              onChange={(e) => setInvestmentStyle(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="past-interactions">Past Interactions</Label>
            <Textarea
              id="past-interactions"
              placeholder="Brief summary of previous conversations, meetings, or exchanges..."
              value={pastInteractions}
              onChange={(e) => setPastInteractions(e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes</Label>
            <Textarea
              id="notes"
              placeholder="Any other relevant information, preferences, or context..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={handleGenerate}
              disabled={generateCallPrepMutation.isPending || !prospectName.trim()}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {generateCallPrepMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Phone className="w-4 h-4 mr-2" />
                  Generate Call Prep
                </>
              )}
            </Button>
            <Button variant="outline" onClick={clearForm}>
              Clear Form
            </Button>
          </div>
        </CardContent>
      </Card>

      {callPrepResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <User className="w-5 h-5 mr-2 text-green-600" />
              Call Preparation Notes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Prospect Snapshot */}
            <div className="space-y-2">
              <div className="flex items-center">
                <Building className="w-4 h-4 mr-2 text-blue-600" />
                <h3 className="font-semibold">Prospect Snapshot</h3>
              </div>
              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-sm">{callPrepResult.prospectSnapshot}</p>
              </div>
            </div>

            {/* Personal Background */}
            {callPrepResult.personalBackground && (
              <div className="space-y-2">
                <div className="flex items-center">
                  <User className="w-4 h-4 mr-2 text-indigo-600" />
                  <h3 className="font-semibold">Personal Background</h3>
                </div>
                <div className="bg-indigo-50 p-3 rounded-lg">
                  <p className="text-sm">{callPrepResult.personalBackground}</p>
                </div>
              </div>
            )}

            {/* Company Overview */}
            {callPrepResult.companyOverview && (
              <div className="space-y-2">
                <div className="flex items-center">
                  <Building className="w-4 h-4 mr-2 text-cyan-600" />
                  <h3 className="font-semibold">Company Overview</h3>
                </div>
                <div className="bg-cyan-50 p-3 rounded-lg">
                  <p className="text-sm">{callPrepResult.companyOverview}</p>
                </div>
              </div>
            )}

            {/* Top Interests */}
            <div className="space-y-2">
              <div className="flex items-center">
                <TrendingUp className="w-4 h-4 mr-2 text-purple-600" />
                <h3 className="font-semibold">Top Interests</h3>
              </div>
              <div className="bg-purple-50 p-3 rounded-lg">
                <p className="text-sm">{callPrepResult.topInterests}</p>
              </div>
            </div>

            {/* Portfolio Insights */}
            <div className="space-y-2">
              <div className="flex items-center">
                <TrendingUp className="w-4 h-4 mr-2 text-green-600" />
                <h3 className="font-semibold">Portfolio Insights</h3>
              </div>
              <div className="bg-green-50 p-3 rounded-lg">
                <p className="text-sm">{callPrepResult.portfolioInsights}</p>
              </div>
            </div>

            {/* Talking Points */}
            <div className="space-y-2">
              <div className="flex items-center">
                <MessageCircle className="w-4 h-4 mr-2 text-orange-600" />
                <h3 className="font-semibold">Talking Points for Call</h3>
              </div>
              <div className="bg-orange-50 p-3 rounded-lg">
                <div className="space-y-4">
                  {callPrepResult.talkingPoints.map((point: any, index: number) => (
                    <div key={index} className="space-y-2">
                      <div className="flex items-start">
                        <Badge variant="outline" className="mr-2 mt-0.5 text-xs">
                          {index + 1}
                        </Badge>
                        <span className="text-sm font-medium">
                          {typeof point === 'string' ? point : (point?.mainPoint || JSON.stringify(point))}
                        </span>
                      </div>
                      {typeof point === 'object' && point.subBullets && Array.isArray(point.subBullets) && point.subBullets.length > 0 && (
                        <ul className="ml-8 space-y-1">
                          {point.subBullets.map((bullet: any, bulletIndex: number) => (
                            <li key={bulletIndex} className="text-sm text-gray-600 flex items-start">
                              <span className="mr-2">•</span>
                              <span>{typeof bullet === 'string' ? bullet : JSON.stringify(bullet)}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Smart Questions */}
            <div className="space-y-2">
              <div className="flex items-center">
                <HelpCircle className="w-4 h-4 mr-2 text-red-600" />
                <h3 className="font-semibold">Smart Questions to Ask</h3>
              </div>
              <div className="bg-red-50 p-3 rounded-lg">
                <ul className="space-y-2">
                  {callPrepResult.smartQuestions.map((question, index) => (
                    <li key={index} className="flex items-start">
                      <Badge variant="outline" className="mr-2 mt-0.5 text-xs">
                        Q{index + 1}
                      </Badge>
                      <span className="text-sm">{question}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                onClick={() => {
                  let content = `CALL PREPARATION NOTES\n\n`;
                  
                  content += `PROSPECT SNAPSHOT\n${callPrepResult.prospectSnapshot}\n\n`;
                  
                  if (callPrepResult.personalBackground) {
                    content += `PERSONAL BACKGROUND\n${callPrepResult.personalBackground}\n\n`;
                  }
                  
                  if (callPrepResult.companyOverview) {
                    content += `COMPANY OVERVIEW\n${callPrepResult.companyOverview}\n\n`;
                  }
                  
                  content += `TOP INTERESTS\n${callPrepResult.topInterests}\n\n`;
                  content += `PORTFOLIO INSIGHTS\n${callPrepResult.portfolioInsights}\n\n`;
                  
                  // Handle structured talking points
                  content += `TALKING POINTS\n`;
                  callPrepResult.talkingPoints.forEach((point, i) => {
                    if (typeof point === 'string') {
                      content += `${i + 1}. ${point}\n`;
                    } else {
                      content += `${i + 1}. ${point.mainPoint}\n`;
                      if (point.subBullets && point.subBullets.length > 0) {
                        point.subBullets.forEach(bullet => {
                          content += `   • ${bullet}\n`;
                        });
                      }
                    }
                  });
                  content += '\n';
                  
                  content += `SMART QUESTIONS\n${callPrepResult.smartQuestions.map((q, i) => `Q${i + 1}. ${q}`).join('\n')}`;
                  
                  navigator.clipboard.writeText(content);
                  toast({
                    title: "Copied to Clipboard",
                    description: "Call prep notes have been copied to your clipboard",
                  });
                }}
                variant="outline"
              >
                Copy All Notes
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}