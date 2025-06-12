import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { FileText, Download, Copy, Wand2 } from "lucide-react";

interface OnePagerRequest {
  topic: string;
  audience: string;
  tone: string;
  keyPoints: string[];
  reportIds: number[];
}

interface GeneratedOnePager {
  id: string;
  title: string;
  content: string;
  keyInsights: string[];
  sourceReports: Array<{
    id: number;
    title: string;
    relevanceScore: number;
  }>;
  generatedAt: string;
}

export function OnePagerGenerator() {
  const [topic, setTopic] = useState("");
  const [audience, setAudience] = useState("");
  const [tone, setTone] = useState("professional");
  const [keyPoints, setKeyPoints] = useState("");
  const [generatedOnePager, setGeneratedOnePager] = useState<GeneratedOnePager | null>(null);
  const { toast } = useToast();

  const generateOnePagerMutation = useMutation({
    mutationFn: async (data: OnePagerRequest) => {
      const response = await apiRequest("/api/generate-one-pager", "POST", data);
      return response.json();
    },
    onSuccess: (data) => {
      setGeneratedOnePager(data.onePager);
      toast({
        title: "One-Pager Generated",
        description: `Created comprehensive analysis based on ${data.onePager?.sourceReports?.length || 0} reports`,
      });
    },
    onError: () => {
      toast({
        title: "Generation Failed",
        description: "Failed to generate one-pager. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleGenerate = () => {
    if (!topic.trim() || !audience.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide both topic and target audience.",
        variant: "destructive",
      });
      return;
    }

    const keyPointsArray = keyPoints
      .split("\n")
      .map(point => point.trim())
      .filter(point => point.length > 0);

    generateOnePagerMutation.mutate({
      topic,
      audience,
      tone,
      keyPoints: keyPointsArray,
      reportIds: [] // Will be determined by the AI based on topic relevance
    });
  };

  const copyToClipboard = () => {
    if (generatedOnePager) {
      navigator.clipboard.writeText(generatedOnePager.content);
      toast({
        title: "Copied to Clipboard",
        description: "One-pager content has been copied to your clipboard.",
      });
    }
  };

  const downloadAsText = () => {
    if (generatedOnePager) {
      const element = document.createElement("a");
      const file = new Blob([generatedOnePager.content], { type: 'text/plain' });
      element.href = URL.createObjectURL(file);
      element.download = `${generatedOnePager.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.txt`;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="w-5 h-5 mr-2" />
            AI One-Pager Generator
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Topic / Investment Theme
                </label>
                <Input
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g., Uranium Market Outlook, Chinese Equities, Energy Transition"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Target Audience
                </label>
                <Input
                  value={audience}
                  onChange={(e) => setAudience(e.target.value)}
                  placeholder="e.g., High-net-worth clients, Institutional investors"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tone & Style
              </label>
              <Select value={tone} onValueChange={setTone}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="professional">Professional & Analytical</SelectItem>
                  <SelectItem value="conversational">Conversational & Accessible</SelectItem>
                  <SelectItem value="technical">Technical & Detailed</SelectItem>
                  <SelectItem value="executive">Executive Summary Style</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Key Points to Include (optional)
              </label>
              <Textarea
                value={keyPoints}
                onChange={(e) => setKeyPoints(e.target.value)}
                placeholder="Enter key points, one per line:&#10;- Recent price movements&#10;- Supply/demand dynamics&#10;- Regulatory changes&#10;- Investment opportunities"
                rows={4}
              />
            </div>

            <Button 
              onClick={handleGenerate}
              disabled={generateOnePagerMutation.isPending}
              className="w-full"
            >
              <Wand2 className="w-4 h-4 mr-2" />
              {generateOnePagerMutation.isPending ? "Generating..." : "Generate One-Pager"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {generatedOnePager && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{generatedOnePager.title}</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={copyToClipboard}>
                <Copy className="w-4 h-4 mr-1" />
                Copy
              </Button>
              <Button variant="outline" size="sm" onClick={downloadAsText}>
                <Download className="w-4 h-4 mr-1" />
                Download
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Key Insights */}
              {generatedOnePager.keyInsights.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Key Insights:</h4>
                  <div className="flex flex-wrap gap-2">
                    {generatedOnePager.keyInsights.map((insight, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {insight}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Generated Content */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="whitespace-pre-wrap text-sm leading-relaxed">
                  {generatedOnePager.content}
                </div>
              </div>

              {/* Source Reports */}
              {generatedOnePager.sourceReports.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">
                    Sources ({generatedOnePager.sourceReports.length} reports):
                  </h4>
                  <div className="space-y-2">
                    {generatedOnePager.sourceReports.map((report) => (
                      <div key={report.id} className="flex items-center justify-between bg-white border rounded p-2">
                        <span className="text-sm text-gray-700">{report.title}</span>
                        <Badge variant="outline" className="text-xs">
                          {report.relevanceScore}% relevant
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="text-xs text-gray-500">
                Generated on {new Date(generatedOnePager.generatedAt).toLocaleString()}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {generateOnePagerMutation.isPending && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-500 mt-2">
            Analyzing reports and generating comprehensive one-pager...
          </p>
        </div>
      )}
    </div>
  );
}