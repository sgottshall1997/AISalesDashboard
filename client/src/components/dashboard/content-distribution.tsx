import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { dashboardApi } from "@/lib/api";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Mail, 
  MousePointer, 
  Send, 
  Lightbulb,
  Bot,
  TrendingUp,
  BarChart3,
  Users,
  FileText,
  ChevronDown,
  Upload,
  Trash2,
  Copy,
  CheckCircle,
  Target,
  Layers
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export function ContentDistribution() {
  const [selectedReport, setSelectedReport] = useState<string>("");
  const [reportSummary, setReportSummary] = useState<string>("");
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [reportType, setReportType] = useState<string>("wiltw");
  const [generatedEmail, setGeneratedEmail] = useState<string>("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [copiedStates, setCopiedStates] = useState<{ [key: number]: boolean }>({});
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: reports = [], isLoading: reportsLoading } = useQuery({
    queryKey: ["/api/content-reports"],
    queryFn: () => apiRequest("GET", "/api/content-reports").then(res => res.json()),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["/api/clients"],
    queryFn: () => dashboardApi.getClients(),
  });



  const { data: savedSummaries = [] } = useQuery({
    queryKey: ["/api/report-summaries"],
    queryFn: () => apiRequest("GET", "/api/report-summaries").then(res => res.json()),
  });



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
      if (file.name.includes('WATMTU')) {
        setReportType('watmtu');
      } else if (file.name.includes('WILTW')) {
        setReportType('wiltw');
      }
    } else {
      toast({
        title: "Invalid file",
        description: "Please select a PDF file.",
        variant: "destructive",
      });
    }
  };

  const uploadReportMutation = useMutation({
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
    onSuccess: (data) => {
      toast({
        title: "Report uploaded successfully",
        description: `${reportType.toUpperCase()} report "${data.report.title}" uploaded with ${data.report.contentLength.toLocaleString()} characters stored.`,
      });
      setSelectedFile(null);
      queryClient.invalidateQueries({ queryKey: ["/api/content-reports"] });
    },
    onError: (error) => {
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    },
  });

  const summarizeReportMutation = useMutation({
    mutationFn: async (reportId: string) => {
      const report = reports.find((r: any) => r.id.toString() === reportId);
      if (!report) throw new Error("Report not found");

      // Automatically detect report type and use appropriate parser
      const isWATMTU = report.title.includes("WATMTU") || report.type === "WATMTU Report";
      const promptType = isWATMTU ? "watmtu_parser" : "wiltw_parser";

      console.log('Frontend debug - sending summarization request:', {
        reportId: report.id,
        reportIdType: typeof report.id,
        title: report.title,
        promptType: promptType
      });

      const response = await apiRequest("POST", "/api/ai/summarize-report", {
        reportId: report.id.toString(),
        title: report.title,
        content: report.full_content || report.content_summary,
        promptType: promptType
      });
      return response.json();
    },
    onSuccess: (data) => {
      setReportSummary(data.summary);
      setIsGeneratingSummary(false);
      queryClient.invalidateQueries({ queryKey: ["/api/report-summaries"] });
      const report = reports.find((r: any) => r.id.toString() === selectedReport);
      const isWATMTU = report?.title.includes("WATMTU") || report?.type === "WATMTU Report";
      toast({
        title: "Report Parsed & Saved",
        description: `${isWATMTU ? "WATMTU market analysis" : "WILTW article analysis"} completed and saved to database.`,
      });
    },
    onError: () => {
      setIsGeneratingSummary(false);
      toast({
        title: "Error",
        description: "Failed to summarize report. Please try again.",
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
        description: "Report has been successfully deleted.",
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

  const loadSavedSummary = () => {
    if (!selectedReport) return;

    const savedSummary = savedSummaries.find((summary: any) => 
      summary.content_report_id.toString() === selectedReport
    );

    if (savedSummary) {
      setReportSummary(savedSummary.parsed_summary);
      const report = reports.find((r: any) => r.id.toString() === selectedReport);
      const isWATMTU = report?.title.includes("WATMTU") || report?.type === "WATMTU Report";
      toast({
        title: "Saved Summary Loaded",
        description: `Previously parsed ${isWATMTU ? "WATMTU" : "WILTW"} summary loaded successfully.`,
      });
    } else {
      toast({
        title: "No Saved Summary",
        description: "No parsed summary found for this report. Please parse it first.",
        variant: "destructive",
      });
    }
  };

  if (reportsLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3 mb-8"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Calculate overall metrics
  const totalReports = reports.length;
  const avgOpenRate = reports.reduce((sum, report) => sum + (report.openRate || 0), 0) / totalReports || 0;
  const avgClickRate = reports.reduce((sum: any, report: any) => sum + (report.clickRate || 0), 0) / totalReports || 0;
  const aiSuggestionCount = 4; // Fixed count since we have a separate working component

  const getEngagementBadge = (level: string) => {
    switch (level) {
      case "high":
        return "bg-green-100 text-green-800";
      case "medium":
        return "bg-blue-100 text-blue-800";
      case "low":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };





  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Content Distribution Tracker</h2>
        <p className="text-gray-600">Monitor WILTW & WATMTU report engagement and optimize client outreach</p>
      </div>

      {/* PDF Upload Section */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Upload PDF Reports
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="report-type" className="block text-sm font-medium mb-2">
                Report Type
              </label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select report type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="wiltw">WILTW - What I Learned This Week</SelectItem>
                  <SelectItem value="watmtu">WATMTU - What Are The Markets Telling Us</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label htmlFor="pdf-upload" className="block text-sm font-medium mb-2">
                Select PDF Report
              </label>
              <input
                id="pdf-upload"
                type="file"
                accept=".pdf"
                onChange={handleFileUpload}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {selectedFile && (
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">{selectedFile.name}</span>
              </div>
              <p className="text-xs text-blue-600 mt-1">
                Size: {(selectedFile.size / 1024 / 1024).toFixed(2)} MB | Type: {reportType.toUpperCase()}
              </p>
            </div>
          )}

          <Button 
            onClick={() => selectedFile && uploadReportMutation.mutate(selectedFile)}
            disabled={!selectedFile || uploadReportMutation.isPending}
            className="w-full"
          >
            {uploadReportMutation.isPending ? "Uploading..." : "Upload & Process Report"}
          </Button>
        </CardContent>
      </Card>

      {/* Engagement Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Open Rate</p>
                <p className="text-2xl font-bold text-green-600">{Math.round(avgOpenRate)}%</p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <Mail className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Click Rate</p>
                <p className="text-2xl font-bold text-primary">{Math.round(avgClickRate)}%</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <MousePointer className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Reports Sent</p>
                <p className="text-2xl font-bold text-gray-900">{totalReports * 52}</p>
              </div>
              <div className="p-3 bg-gray-100 rounded-full">
                <Send className="h-6 w-6 text-gray-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">AI Suggestions</p>
                <p className="text-2xl font-bold text-secondary">{aiSuggestionCount}</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <Lightbulb className="h-6 w-6 text-secondary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Report Summarization */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="w-5 h-5 mr-2" />
            WILTW Article Parser
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <label htmlFor="report-select" className="block text-sm font-medium text-gray-700 mb-2">
                  Select Report to Summarize
                </label>
                <Select value={selectedReport} onValueChange={setSelectedReport}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choose a WILTW report..." />
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

                        console.log('Load saved summary debug:', {
                          selectedReport,
                          selectedReportType: typeof selectedReport,
                          foundSummary: reportSummary ? {
                            id: reportSummary.id,
                            content_report_id: reportSummary.content_report_id,
                            summaryLength: reportSummary.parsed_summary?.length,
                            summaryPreview: reportSummary.parsed_summary?.substring(0, 200),
                            summaryEnd: reportSummary.parsed_summary?.substring(-100)
                          } : null,
                          allSummaries: summaries.map((s: any) => ({
                            id: s.id,
                            content_report_id: s.content_report_id,
                            summaryLength: s.parsed_summary?.length,
                            preview: s.parsed_summary?.substring(0, 100)
                          }))
                        });

                        if (reportSummary) {
                          console.log('Setting summary content:', {
                            summaryId: reportSummary.id,
                            contentLength: reportSummary.parsed_summary?.length,
                            firstLine: reportSummary.parsed_summary?.split('\n')[0]
                          });
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
              <div className="mt-6 space-y-6">
                {(() => {
                  // Parse WILTW three-part summaries
                  const parts = reportSummary.split('---').map(part => part.trim());
                  
                  if (parts.length >= 3) {
                    // WILTW report with three sections
                    return (
                      <>
                        <div className="p-4 bg-gray-50 rounded-lg border">
                          <h4 className="font-medium text-gray-900 mb-3">Structured Article Analysis</h4>
                          <div className="text-sm text-gray-800 whitespace-pre-line leading-relaxed">
                            {parts[0]}
                          </div>
                        </div>
                        
                        <div className="p-4 bg-blue-50 rounded-lg border">
                          <h4 className="font-medium text-gray-900 mb-3">Detailed Article Analysis</h4>
                          <div className="text-sm text-gray-800 whitespace-pre-line leading-relaxed">
                            {parts[1]}
                          </div>
                        </div>
                        
                        <div className="p-4 bg-green-50 rounded-lg border">
                          <h4 className="font-medium text-gray-900 mb-3">Comprehensive Investment Summary</h4>
                          <div className="text-sm text-gray-800 whitespace-pre-line leading-relaxed">
                            {parts[2]}
                          </div>
                        </div>
                      </>
                    );
                  } else {
                    // Single summary (WATMTU or single-part WILTW)
                    return (
                      <div className="p-4 bg-gray-50 rounded-lg border">
                        <h4 className="font-medium text-gray-900 mb-3">Report Analysis</h4>
                        <div className="text-sm text-gray-800 whitespace-pre-line leading-relaxed">
                          {reportSummary}
                        </div>
                      </div>
                    );
                  }
                })()}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recent WILTW Reports & AI Suggestions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Recent WILTW Reports</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {reports.slice(0, 3).map((report) => (
                <div key={report.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-gray-900">{report.title}</h4>
                      <p className="text-sm text-gray-500 mt-1">Published: {new Date(report.published_date).toLocaleDateString()}</p>
                      <div className="mt-2 flex items-center space-x-4 text-sm">
                        <span className="text-green-600">↗ {report.open_rate || '0'}% open rate</span>
                        <span className="text-primary">↗ {report.click_rate || '0'}% click rate</span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {(report.tags || []).map((topic: string, index: number) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {topic}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getEngagementBadge(report.engagement_level)}>
                        {report.engagement_level} Engagement
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (window.confirm('Are you sure you want to delete this report? This action cannot be undone.')) {
                            deleteReportMutation.mutate(report.id);
                          }
                        }}
                        disabled={deleteReportMutation.isPending}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>



      </div>



      {/* Email Generation Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Generated AI Email</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <pre className="whitespace-pre-wrap text-sm text-gray-800 font-mono">
                {generatedEmail}
              </pre>
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => copyToClipboard(generatedEmail, 0)}
                className="flex items-center space-x-2"
              >
                {copiedStates[0] ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
                <span>{copiedStates[0] ? "Copied!" : "Copy to Clipboard"}</span>
              </Button>
              <Button onClick={() => setIsDialogOpen(false)}>Close</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}