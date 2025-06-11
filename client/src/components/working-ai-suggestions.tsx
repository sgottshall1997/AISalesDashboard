import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Mail, RefreshCw, TrendingUp, Target, BarChart3, FileText, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Suggestion {
  type: "frequent_theme" | "emerging_trend" | "cross_sector" | "deep_dive";
  title: string;
  description: string;
  emailAngle: string;
  keyPoints: string[];
  supportingReports: string[];
  priority: "low" | "medium" | "high";
}

export function WorkingAISuggestions() {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [generatingFor, setGeneratingFor] = useState<string | null>(null);
  const [generatedEmail, setGeneratedEmail] = useState("");
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadSuggestions();
  }, []);

  const loadSuggestions = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/ai/content-suggestions');
      if (response.ok) {
        const data = await response.json();
        setSuggestions(data);
      }
    } catch (error) {
      console.error('Error loading suggestions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateAIOutput = async (suggestion: Suggestion) => {
    setGeneratingFor(suggestion.title);
    
    try {
      const response = await fetch('/api/ai/generate-theme-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          theme: suggestion.title,
          emailAngle: suggestion.emailAngle,
          description: suggestion.description,
          keyPoints: suggestion.keyPoints,
          supportingReports: suggestion.supportingReports
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate AI output');
      }
      
      const data = await response.json();
      setGeneratedEmail(data.email);
      setEmailDialogOpen(true);
      
      toast({
        title: "AI Output Generated",
        description: "Your personalized content has been created successfully.",
      });
      
    } catch (error) {
      console.error('Error generating AI output:', error);
      toast({
        title: "Error",
        description: "Failed to generate AI output. Please try again.",
        variant: "destructive",
      });
    } finally {
      setGeneratingFor(null);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "frequent_theme": return <TrendingUp className="h-5 w-5" />;
      case "emerging_trend": return <Target className="h-5 w-5" />;
      case "cross_sector": return <BarChart3 className="h-5 w-5" />;
      case "deep_dive": return <FileText className="h-5 w-5" />;
      default: return <TrendingUp className="h-5 w-5" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "frequent_theme": return "#2563eb";
      case "emerging_trend": return "#059669";
      case "cross_sector": return "#7c3aed";
      case "deep_dive": return "#ea580c";
      default: return "#4b5563";
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied",
        description: "Email content copied to clipboard.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy to clipboard.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>AI Content Suggestions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-gray-500" />
            <span className="ml-2 text-gray-500">Loading AI suggestions...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>AI Content Suggestions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {suggestions.length > 0 ? (
            suggestions.map((suggestion, index) => (
              <div key={index} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div 
                    className="flex-shrink-0 text-white p-2 rounded-full"
                    style={{ backgroundColor: getTypeColor(suggestion.type) }}
                  >
                    {getTypeIcon(suggestion.type)}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">{suggestion.title}</h3>
                    <p className="text-sm text-gray-600 mt-1">{suggestion.description}</p>
                    
                    {suggestion.keyPoints && suggestion.keyPoints.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs text-gray-500 font-medium">Key Points:</p>
                        <ul className="text-xs text-gray-600 list-disc list-inside">
                          {suggestion.keyPoints.slice(0, 2).map((point, i) => (
                            <li key={i}>{point}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    <div className="mt-3">
                      <button
                        onClick={() => generateAIOutput(suggestion)}
                        disabled={generatingFor === suggestion.title}
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-md hover:opacity-90 disabled:opacity-50 transition-all"
                        style={{
                          backgroundColor: generatingFor === suggestion.title ? "#6b7280" : getTypeColor(suggestion.type),
                          cursor: generatingFor === suggestion.title ? "not-allowed" : "pointer"
                        }}
                      >
                        {generatingFor === suggestion.title ? (
                          <>
                            <RefreshCw className="h-4 w-4 animate-spin" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <Mail className="h-4 w-4" />
                            Generate AI Output
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-gray-500">
              <FileText className="mx-auto h-12 w-12 text-gray-400 mb-3" />
              <p>No AI suggestions available. Upload more reports to get insights.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Email Generation Dialog */}
      <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Generated AI Content</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <pre className="whitespace-pre-wrap text-sm text-gray-800 font-mono">
                {generatedEmail}
              </pre>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => copyToClipboard(generatedEmail)}
                className="flex items-center gap-2"
              >
                <Copy className="h-4 w-4" />
                Copy to Clipboard
              </Button>
              <Button onClick={() => setEmailDialogOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}