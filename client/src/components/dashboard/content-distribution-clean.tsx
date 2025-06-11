import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Upload,
  Trash2,
  Copy,
  CheckCircle,
  Download,
  Target,
  Layers,
  Bot,
  Lightbulb,
  TrendingUp,
  BarChart3,
  FileText
} from "lucide-react";

export function ContentDistribution() {
  const [selectedReport, setSelectedReport] = useState<string>("");
  const [reportSummary, setReportSummary] = useState<string>("");
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [reportType, setReportType] = useState<string>("wiltw");
  const [generatedEmails, setGeneratedEmails] = useState<{ [key: number]: string }>({});
  const [copiedStates, setCopiedStates] = useState<{ [key: number]: boolean }>({});
  const [loadingStates, setLoadingStates] = useState<{ [key: number]: boolean }>({});
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Function to clean up markdown formatting from parsed summaries
  const formatCleanSummary = (summary: string): string => {
    return summary
      // Remove ### headers
      .replace(/###\s*/g, '')
      // Remove ** bold formatting
      .replace(/\*\*(.*?)\*\*/g, '$1')
      // Remove * italic formatting  
      .replace(/\*(.*?)\*/g, '$1')
      // Clean up extra whitespace
      .replace(/\n\s*\n/g, '\n\n')
      .trim();
  };

  // Function to get display name for report type
  const getReportTypeDisplayName = (type: string): string => {
    switch (type) {
      case 'wiltw':
        return 'Thematic';
      case 'watmtu':
        return 'Technical';
      default:
        return type.toUpperCase();
    }
  };

  const { data: reports = [], isLoading: reportsLoading } = useQuery({
    queryKey: ["/api/content-reports"],
    queryFn: () => apiRequest("GET", "/api/content-reports").then(res => res.json()),
  });

  const { data: suggestions = [], isLoading: suggestionsLoading } = useQuery({
    queryKey: ["/api/ai/content-suggestions"],
    queryFn: () => apiRequest("GET", "/api/ai/content-suggestions").then(res => res.json()),
  });

  const { data: savedSummaries = [] } = useQuery({
    queryKey: ["/api/report-summaries"],
    queryFn: () => apiRequest("GET", "/api/report-summaries").then(res => res.json()),
  });

  const generateEmail = async (suggestion: any, index: number) => {
    setLoadingStates(prev => ({ ...prev, [index]: true }));
    
    try {
      const response = await apiRequest("POST", "/api/ai/generate-theme-email", {
        suggestion: suggestion
      });
      
      const result = await response.json();
      setGeneratedEmails(prev => ({ ...prev, [index]: result.email }));
      
      toast({
        title: "Email Generated",
        description: "AI-powered email has been generated successfully.",
      });
    } catch (error) {
      console.error("Error generating email:", error);
      toast({
        title: "Error",
        description: "Failed to generate email. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoadingStates(prev => ({ ...prev, [index]: false }));
    }
  };

  const copyToClipboard = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedStates(prev => ({ ...prev, [index]: true }));
      
      toast({
        title: "Copied!",
        description: "Email content copied to clipboard.",
      });
      
      setTimeout(() => {
        setCopiedStates(prev => ({ ...prev, [index]: false }));
      }, 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
      toast({
        title: "Error",
        description: "Failed to copy to clipboard.",
        variant: "destructive",
      });
    }
  };

  const downloadSummary = async (theme: any, email: string) => {
    try {
      const response = await apiRequest("POST", "/api/themes/download-summary", {
        theme,
        insights: theme.insights,
        email
      });
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `theme-summary-${Date.now()}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Downloaded!",
        description: "Theme summary has been downloaded.",
      });
    } catch (error) {
      console.error("Failed to download summary:", error);
      toast({
        title: "Error",
        description: "Failed to download summary.",
        variant: "destructive",
      });
    }
  };

  const getSuggestionStyle = (type: string) => {
    switch (type) {
      case "frequent_theme":
        return "border-blue-200 bg-blue-50";
      case "emerging_trend":
        return "border-green-200 bg-green-50";
      case "cross_sector":
        return "border-purple-200 bg-purple-50";
      case "deep_dive":
        return "border-orange-200 bg-orange-50";
      default:
        return "border-gray-200 bg-gray-50";
    }
  };

  const getSuggestionIcon = (type: string) => {
    switch (type) {
      case "frequent_theme":
        return <BarChart3 className="h-5 w-5 text-blue-600" />;
      case "emerging_trend":
        return <TrendingUp className="h-5 w-5 text-green-600" />;
      case "cross_sector":
        return <Target className="h-5 w-5 text-purple-600" />;
      case "deep_dive":
        return <Layers className="h-5 w-5 text-orange-600" />;
      default:
        return <Lightbulb className="h-5 w-5 text-gray-600" />;
    }
  };

  const getSuggestionButtonColor = (type: string) => {
    switch (type) {
      case "frequent_theme":
        return "bg-blue-600 hover:bg-blue-700 text-white";
      case "emerging_trend":
        return "bg-green-600 hover:bg-green-700 text-white";
      case "cross_sector":
        return "bg-purple-600 hover:bg-purple-700 text-white";
      case "deep_dive":
        return "bg-orange-600 hover:bg-orange-700 text-white";
      default:
        return "bg-gray-600 hover:bg-gray-700 text-white";
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file);
      // Auto-detect report type based on filename
      if (file.name.toLowerCase().includes('watmtu')) {
        setReportType('watmtu');
      } else {
        setReportType('wiltw');
      }
    } else {
      toast({
        title: "Invalid File",
        description: "Please select a PDF file.",
        variant: "destructive",
      });
    }
  };

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('pdf', file);
      formData.append('reportType', reportType);
      
      const response = await fetch('/api/upload-pdf', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Upload failed');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Upload Successful",
        description: "PDF has been processed and added to the database.",
      });
      setSelectedFile(null);
      queryClient.invalidateQueries({ queryKey: ["/api/content-reports"] });
    },
    onError: () => {
      toast({
        title: "Upload Failed",
        description: "Failed to process PDF. Please try again.",
        variant: "destructive",
      });
    },
  });

  const summarizeReportMutation = useMutation({
    mutationFn: async (reportId: string) => {
      const response = await apiRequest("POST", "/api/ai/summarize-report", {
        reportId: parseInt(reportId)
      });
      return response.json();
    },
    onSuccess: (data) => {
      setReportSummary(data.summary);
      setIsGeneratingSummary(false);
      queryClient.invalidateQueries({ queryKey: ["/api/report-summaries"] });
      toast({
        title: "Report Parsed",
        description: "Report has been successfully analyzed and summarized.",
      });
    },
    onError: () => {
      setIsGeneratingSummary(false);
      toast({
        title: "Parsing Failed",
        description: "Failed to parse report. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteReportMutation = useMutation({
    mutationFn: async (reportId: number) => {
      const response = await apiRequest("DELETE", `/api/content-reports/${reportId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/content-reports"] });
      toast({
        title: "Report Deleted",
        description: "Report has been successfully removed.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete report. Please try again.",
        variant: "destructive",
      });
    },
  });

  if (reportsLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3 mb-8"></div>
          <div className="grid grid-cols-1 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">AI Content Intelligence</h2>
        <p className="text-gray-600">Transform research reports into compelling client communications</p>
      </div>

      {/* PDF Upload Section */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Upload PDF Reports
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label htmlFor="file-upload" className="block text-sm font-medium text-gray-700 mb-2">
                Select PDF File (Thematic or Technical)
              </label>
              <input
                id="file-upload"
                type="file"
                accept=".pdf"
                onChange={handleFileUpload}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>
            
            <div className="flex items-center gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Report Type</label>
                <Select value={reportType} onValueChange={setReportType}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="wiltw">Thematic</SelectItem>
                    <SelectItem value="watmtu">Technical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex-1 flex justify-end">
                <Button 
                  onClick={() => selectedFile && uploadMutation.mutate(selectedFile)}
                  disabled={!selectedFile || uploadMutation.isPending}
                  className="flex items-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  {uploadMutation.isPending ? "Processing..." : "Upload & Process"}
                </Button>
              </div>
            </div>
            
            {selectedFile && (
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Selected:</strong> {selectedFile.name} ({getReportTypeDisplayName(reportType)})
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Report Summarization */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="w-5 h-5 mr-2" />
            Report Parser
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <label htmlFor="report-select" className="block text-sm font-medium text-gray-700 mb-2">
                  Select Report to Parse
                </label>
                <Select value={selectedReport} onValueChange={setSelectedReport}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choose a report..." />
                  </SelectTrigger>
                  <SelectContent>
                    {reports.map((report: any) => (
                      <SelectItem key={report.id} value={report.id.toString()}>
                        {report.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={() => {
                    if (selectedReport) {
                      setIsGeneratingSummary(true);
                      summarizeReportMutation.mutate(selectedReport);
                    }
                  }}
                  disabled={!selectedReport || isGeneratingSummary}
                  className="flex items-center gap-2"
                >
                  <Bot className="w-4 h-4" />
                  {isGeneratingSummary ? "Parsing..." : "Parse Report"}
                </Button>
                <Button 
                  variant="outline"
                  onClick={async () => {
                    if (selectedReport) {
                      try {
                        const response = await fetch(`/api/report-summaries`);
                        const summaries = await response.json();
                        const reportSummary = summaries.find((s: any) => s.content_report_id.toString() === selectedReport);
                        
                        if (reportSummary) {
                          setReportSummary(reportSummary.parsed_summary);
                          toast({
                            title: "Summary Loaded",
                            description: "Previously saved summary loaded successfully.",
                          });
                        } else {
                          toast({
                            title: "No Saved Summary",
                            description: "No previously saved summary found. Try parsing the report first.",
                            variant: "destructive",
                          });
                        }
                      } catch (error) {
                        toast({
                          title: "Error",
                          description: "Failed to load saved summary.",
                          variant: "destructive",
                        });
                      }
                    }
                  }}
                  disabled={!selectedReport}
                  className="flex items-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  Load Saved Summary
                </Button>
              </div>
            </div>

            {reportSummary && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Parsed Summary:</h4>
                <div className="text-sm text-gray-700 whitespace-pre-wrap max-h-96 overflow-y-auto">
                  {formatCleanSummary(reportSummary)}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* AI Content Suggestions */}
      <Card>
        <CardHeader>
          <CardTitle>AI Content Suggestions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {suggestionsLoading ? (
              <div className="text-center py-8">
                <Bot className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                <p className="text-gray-500">Loading AI suggestions...</p>
              </div>
            ) : suggestions.length > 0 ? (
              suggestions.map((suggestion: any, index: number) => (
                <div key={index} className={`border rounded-lg p-4 transition-all duration-200 hover:shadow-md hover:scale-[1.02] ${getSuggestionStyle(suggestion.type)}`}>
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      {getSuggestionIcon(suggestion.type)}
                    </div>
                    <div className="ml-3 flex-1">
                      <p className="text-sm font-medium text-gray-800">{suggestion.title}</p>
                      <p className="text-sm text-gray-700 mt-1">{suggestion.description}</p>
                      
                      {/* Traceable Insights */}
                      {suggestion.insights && suggestion.insights.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs font-medium text-gray-600 mb-1">Key Insights:</p>
                          <ul className="list-disc list-inside pl-2 text-xs text-gray-600 space-y-0.5">
                            {suggestion.insights.map((insight: string, idx: number) => (
                              <li key={idx}>{insight}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      <div className="mt-3">
                        <Button 
                          size="sm" 
                          onClick={() => generateEmail(suggestion, index)}
                          disabled={loadingStates[index]}
                          className={`text-xs ${getSuggestionButtonColor(suggestion.type)}`}
                        >
                          {loadingStates[index] ? "Generating..." : "Generate Email"}
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  {/* Generated Email Display */}
                  {generatedEmails[index] && (
                    <div className="mt-4 border-t border-gray-200 pt-4">
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="text-sm font-semibold text-gray-900">Generated Email</h4>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyToClipboard(generatedEmails[index], index)}
                            className="flex items-center space-x-1 text-xs hover:bg-gray-50"
                          >
                            {copiedStates[index] ? (
                              <CheckCircle className="h-3 w-3 text-green-600" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                            <span>{copiedStates[index] ? "Copied!" : "Copy Email"}</span>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => downloadSummary(suggestion, generatedEmails[index])}
                            className="flex items-center space-x-1 text-xs hover:bg-gray-50"
                          >
                            <Download className="h-3 w-3" />
                            <span>Download Summary</span>
                          </Button>
                        </div>
                      </div>
                      <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                        <div className="text-sm text-gray-800 leading-relaxed">
                          {generatedEmails[index]}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-center text-gray-500">
                  <Bot className="h-5 w-5 mr-2" />
                  <span className="text-sm">No AI suggestions available yet. Upload and parse reports to generate suggestions.</span>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>


    </div>
  );
}