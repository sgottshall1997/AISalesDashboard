import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FileEdit, Download, Copy, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface OnePagerResult {
  title: string;
  executiveSummary: string;
  keyPoints: string[];
  recommendations: string[];
  riskFactors: string[];
  conclusion: string;
}

export default function OnePager() {
  const [reportTitle, setReportTitle] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [keyFocus, setKeyFocus] = useState("");
  const [onePager, setOnePager] = useState<OnePagerResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleGenerateOnePager = async () => {
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
      const response = await fetch("/api/generate-one-pager", {
        method: "POST",
        body: JSON.stringify({ 
          reportTitle: reportTitle.trim(),
          targetAudience: targetAudience.trim(),
          keyFocus: keyFocus.trim()
        }),
        headers: { "Content-Type": "application/json" }
      });
      const data = await response.json();
      setOnePager(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate one-pager",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copyOnePager = () => {
    if (!onePager) return;
    
    const text = `${onePager.title}

EXECUTIVE SUMMARY
${onePager.executiveSummary}

KEY POINTS
${onePager.keyPoints.map(point => `• ${point}`).join('\n')}

RECOMMENDATIONS
${onePager.recommendations.map(rec => `• ${rec}`).join('\n')}

RISK FACTORS
${onePager.riskFactors.map(risk => `• ${risk}`).join('\n')}

CONCLUSION
${onePager.conclusion}`;

    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "One-pager copied to clipboard",
    });
  };

  const downloadOnePager = () => {
    if (!onePager) return;
    
    const text = `${onePager.title}

EXECUTIVE SUMMARY
${onePager.executiveSummary}

KEY POINTS
${onePager.keyPoints.map(point => `• ${point}`).join('\n')}

RECOMMENDATIONS
${onePager.recommendations.map(rec => `• ${rec}`).join('\n')}

RISK FACTORS
${onePager.riskFactors.map(risk => `• ${risk}`).join('\n')}

CONCLUSION
${onePager.conclusion}`;

    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${onePager.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_one_pager.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">One-Pager Generator</h1>
        <p className="text-gray-600 mt-2">
          Generate executive summaries and one-page reports from research content
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileEdit className="h-5 w-5" />
            Generate One-Pager
          </CardTitle>
          <CardDescription>
            Create a concise one-page summary of your research report
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reportTitle">Report Title</Label>
            <Input
              id="reportTitle"
              value={reportTitle}
              onChange={(e) => setReportTitle(e.target.value)}
              placeholder="e.g., Q4 Technology Sector Analysis"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="audience">Target Audience (Optional)</Label>
            <Input
              id="audience"
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              placeholder="e.g., Portfolio Managers, Investment Committee"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="focus">Key Focus Areas (Optional)</Label>
            <Textarea
              id="focus"
              value={keyFocus}
              onChange={(e) => setKeyFocus(e.target.value)}
              placeholder="e.g., Growth opportunities, Risk assessment, Market trends"
              rows={2}
            />
          </div>
          <Button 
            onClick={handleGenerateOnePager}
            disabled={isLoading || !reportTitle.trim()}
            className="flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <FileEdit className="h-4 w-4" />
                Generate One-Pager
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {onePager && (
        <Card className="border-l-4 border-l-primary">
          <CardHeader>
            <div className="flex items-start justify-between">
              <CardTitle className="text-xl">{onePager.title}</CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={copyOnePager}>
                  <Copy className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={downloadOnePager}>
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Executive Summary</h3>
              <p className="text-gray-700 bg-gray-50 p-4 rounded-md leading-relaxed">
                {onePager.executiveSummary}
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Key Points</h3>
              <ul className="list-disc list-inside space-y-2">
                {onePager.keyPoints.map((point, idx) => (
                  <li key={idx} className="text-gray-700">{point}</li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Recommendations</h3>
              <ul className="list-disc list-inside space-y-2">
                {onePager.recommendations.map((rec, idx) => (
                  <li key={idx} className="text-gray-700">{rec}</li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Risk Factors</h3>
              <ul className="list-disc list-inside space-y-2">
                {onePager.riskFactors.map((risk, idx) => (
                  <li key={idx} className="text-red-700">{risk}</li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Conclusion</h3>
              <p className="text-gray-700 bg-gray-50 p-4 rounded-md leading-relaxed">
                {onePager.conclusion}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {!onePager && !isLoading && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileEdit className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Create Your One-Pager</h3>
            <p className="text-gray-600 text-center mb-4">
              Enter a report title to generate a concise, executive-ready summary that captures the key insights and recommendations.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}