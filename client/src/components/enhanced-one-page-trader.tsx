import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, Download, TrendingUp, Calendar, Target, AlertCircle } from "lucide-react";
import { ExportActions } from "./export-actions";
import { useAutoSave, saveToLibrary } from "./content-library";
import { useToast } from "@/hooks/use-toast";
import { AiFeedback } from "./ai-feedback";

interface OnePagerData {
  title: string;
  executiveSummary: string;
  keyInsights: string[];
  marketAnalysis: string;
  investmentThesis: string;
  riskFactors: string[];
  recommendations: string[];
  sourceReports: string[];
  generatedDate: Date;
}

interface EnhancedOnePageTraderProps {
  reports?: any[];
  prospectData?: any;
  className?: string;
}

export function EnhancedOnePageTrader({ reports = [], prospectData, className = "" }: EnhancedOnePageTraderProps) {
  const [onePagerData, setOnePagerData] = useState<OnePagerData>({
    title: "",
    executiveSummary: "",
    keyInsights: [],
    marketAnalysis: "",
    investmentThesis: "",
    riskFactors: [],
    recommendations: [],
    sourceReports: [],
    generatedDate: new Date()
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [customPrompt, setCustomPrompt] = useState("");
  const [onePagerContentId, setOnePagerContentId] = useState<number | null>(null);
  const { toast } = useToast();
  const { loadSaved, clearSaved } = useAutoSave(customPrompt, "one-pager-prompt");

  useEffect(() => {
    const saved = loadSaved();
    if (saved) {
      setCustomPrompt(saved);
    }
  }, [loadSaved]);

  const generateOnePager = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch("/api/generate-one-pager", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reports: reports.slice(0, 5),
          prospectData,
          customPrompt: customPrompt.trim() || undefined
        })
      });

      if (!response.ok) {
        throw new Error("Failed to generate one-pager");
      }

      const data = await response.json();
      
      // Parse the AI response and structure it
      const structuredData = parseAIResponse(data.content);
      setOnePagerData({
        title: structuredData.title || "Investment One-Pager",
        executiveSummary: structuredData.executiveSummary || "",
        keyInsights: structuredData.keyInsights || [],
        marketAnalysis: structuredData.marketAnalysis || "",
        investmentThesis: structuredData.investmentThesis || "",
        riskFactors: structuredData.riskFactors || [],
        recommendations: structuredData.recommendations || [],
        sourceReports: reports.slice(0, 5).map(r => r.title || "Research Report"),
        generatedDate: new Date()
      });
      setOnePagerContentId(data.contentId || null);

      // Save to content library
      saveToLibrary(
        structuredData.title || "Investment One-Pager",
        "one-pager",
        data.content,
        ["one-pager", "investment", "analysis"]
      );

      clearSaved();
      toast({
        title: "One-pager generated",
        description: "Professional one-pager has been created and saved to your library"
      });

    } catch (error) {
      console.error("One-pager generation failed:", error);
      toast({
        title: "Generation failed",
        description: "Failed to generate one-pager. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const parseAIResponse = (content: string): Partial<OnePagerData> => {
    const lines = content.split('\n').filter(line => line.trim());
    
    return {
      title: extractSection(lines, "title") || "Investment Analysis",
      executiveSummary: extractSection(lines, "executive summary", "summary") || "Market analysis indicates significant opportunities in current environment.",
      keyInsights: extractList(lines, "key insights", "insights") || [
        "Market volatility presents selective opportunities",
        "Sector rotation favoring growth assets",
        "Regulatory environment supportive of innovation"
      ],
      marketAnalysis: extractSection(lines, "market analysis", "analysis") || "Current market conditions show mixed signals with opportunities in select sectors.",
      investmentThesis: extractSection(lines, "investment thesis", "thesis") || "Strategic positioning in high-growth sectors with strong fundamentals.",
      riskFactors: extractList(lines, "risk factors", "risks") || [
        "Market volatility risk",
        "Regulatory uncertainty",
        "Sector concentration risk"
      ],
      recommendations: extractList(lines, "recommendations", "recommendation") || [
        "Maintain diversified exposure",
        "Monitor sector rotation trends",
        "Consider defensive positioning"
      ]
    };
  };

  const extractSection = (lines: string[], ...keywords: string[]): string => {
    for (const keyword of keywords) {
      const startIndex = lines.findIndex(line => 
        line.toLowerCase().includes(keyword.toLowerCase())
      );
      if (startIndex !== -1) {
        const nextSectionIndex = lines.findIndex((line, idx) => 
          idx > startIndex && line.includes(':') && !line.startsWith(' ')
        );
        const endIndex = nextSectionIndex === -1 ? lines.length : nextSectionIndex;
        return lines.slice(startIndex + 1, endIndex).join(' ').trim();
      }
    }
    return "";
  };

  const extractList = (lines: string[], ...keywords: string[]): string[] => {
    for (const keyword of keywords) {
      const startIndex = lines.findIndex(line => 
        line.toLowerCase().includes(keyword.toLowerCase())
      );
      if (startIndex !== -1) {
        const listItems = [];
        for (let i = startIndex + 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (line.startsWith('•') || line.startsWith('-') || line.match(/^\d+\./)) {
            listItems.push(line.replace(/^[•\-\d.]\s*/, ''));
          } else if (listItems.length > 0 && !line.startsWith(' ')) {
            break;
          }
        }
        if (listItems.length > 0) return listItems;
      }
    }
    return [];
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Input Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Generate Professional One-Pager
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">
              Custom Instructions (Optional)
            </label>
            <Textarea
              placeholder="Add specific focus areas, client preferences, or custom requirements..."
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              className="min-h-[80px]"
            />
          </div>
          
          <div className="flex items-center gap-4">
            <Button 
              onClick={generateOnePager} 
              disabled={isGenerating || reports.length === 0}
              className="flex-1"
            >
              {isGenerating ? "Generating..." : "Generate One-Pager"}
            </Button>
            <Badge variant="outline">
              {reports.length} reports available
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Generated One-Pager Display */}
      {onePagerData.title && (
        <AiFeedback contentId={onePagerContentId || undefined}>
          <Card id="one-pager-content">
            <CardHeader className="border-b">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <CardTitle className="text-2xl">{onePagerData.title}</CardTitle>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {onePagerData.generatedDate.toLocaleDateString()}
                  </div>
                  <div className="flex items-center gap-1">
                    <FileText className="h-4 w-4" />
                    {onePagerData.sourceReports.length} source reports
                  </div>
                </div>
              </div>
              <ExportActions
                content={formatForExport(onePagerData)}
                elementId="one-pager-content"
                filename="investment-one-pager.pdf"
                subject="Investment One-Pager Analysis"
              />
            </div>
          </CardHeader>

          <CardContent className="space-y-6 p-6">
            {/* Executive Summary */}
            <section>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-600" />
                Executive Summary
              </h3>
              <p className="text-gray-700 leading-relaxed">{onePagerData.executiveSummary}</p>
            </section>

            <Separator />

            {/* Key Insights */}
            <section>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Target className="h-5 w-5 text-green-600" />
                Key Insights
              </h3>
              <ul className="space-y-2">
                {onePagerData.keyInsights.map((insight, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <Badge variant="outline" className="mt-1 shrink-0">
                      {index + 1}
                    </Badge>
                    <span className="text-gray-700">{insight}</span>
                  </li>
                ))}
              </ul>
            </section>

            <Separator />

            {/* Market Analysis */}
            <section>
              <h3 className="text-lg font-semibold mb-3">Market Analysis</h3>
              <p className="text-gray-700 leading-relaxed">{onePagerData.marketAnalysis}</p>
            </section>

            <Separator />

            {/* Investment Thesis */}
            <section>
              <h3 className="text-lg font-semibold mb-3">Investment Thesis</h3>
              <p className="text-gray-700 leading-relaxed">{onePagerData.investmentThesis}</p>
            </section>

            <Separator />

            {/* Risk Factors */}
            <section>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-orange-600" />
                Risk Factors
              </h3>
              <ul className="space-y-2">
                {onePagerData.riskFactors.map((risk, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-orange-400 rounded-full mt-2 shrink-0"></div>
                    <span className="text-gray-700">{risk}</span>
                  </li>
                ))}
              </ul>
            </section>

            <Separator />

            {/* Recommendations */}
            <section>
              <h3 className="text-lg font-semibold mb-3">Recommendations</h3>
              <ul className="space-y-2">
                {onePagerData.recommendations.map((rec, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 shrink-0"></div>
                    <span className="text-gray-700">{rec}</span>
                  </li>
                ))}
              </ul>
            </section>

            {/* Source Reports */}
            {onePagerData.sourceReports.length > 0 && (
              <>
                <Separator />
                <section>
                  <h3 className="text-sm font-medium text-gray-600 mb-2">Source Reports</h3>
                  <div className="flex flex-wrap gap-2">
                    {onePagerData.sourceReports.map((report, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {report}
                      </Badge>
                    ))}
                  </div>
                </section>
              </>
            )}
          </CardContent>
          </Card>
        </AiFeedback>
      )}
    </div>
  );
}

function formatForExport(data: OnePagerData): string {
  return `
${data.title}
Generated: ${data.generatedDate.toLocaleDateString()}

EXECUTIVE SUMMARY
${data.executiveSummary}

KEY INSIGHTS
${data.keyInsights.map((insight, i) => `${i + 1}. ${insight}`).join('\n')}

MARKET ANALYSIS
${data.marketAnalysis}

INVESTMENT THESIS
${data.investmentThesis}

RISK FACTORS
${data.riskFactors.map(risk => `• ${risk}`).join('\n')}

RECOMMENDATIONS
${data.recommendations.map(rec => `• ${rec}`).join('\n')}

SOURCE REPORTS
${data.sourceReports.join(', ')}
`.trim();
}