import { useState } from "react";
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
  Trash2
} from "lucide-react";

export function ContentDistribution() {
  const [selectedReport, setSelectedReport] = useState<string>("");
  const [reportSummary, setReportSummary] = useState<string>("");
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [reportType, setReportType] = useState<string>("wiltw");
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

  const { data: suggestions = [] } = useQuery({
    queryKey: ["/api/ai/content-suggestions"],
    queryFn: () => dashboardApi.getContentSuggestions(),
  });

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
        description: `${reportType.toUpperCase()} report "${data.report.title}" has been processed.`,
      });
      setSelectedFile(null);
      // Refresh reports list
      window.location.reload();
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
      const report = reports.find((r: any) => r.id.toString() === selectedReport);
      const isWATMTU = report?.title.includes("WATMTU") || report?.type === "WATMTU Report";
      toast({
        title: "Report Summarized",
        description: `${isWATMTU ? "WATMTU market analysis" : "WILTW article analysis"} completed successfully.`,
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
  const avgClickRate = reports.reduce((sum, report) => sum + (report.clickRate || 0), 0) / totalReports || 0;
  const aiSuggestionCount = suggestions.length;

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

  const getSuggestionIcon = (type: string) => {
    switch (type) {
      case "high_engagement":
        return <Bot className="h-5 w-5 text-primary" />;
      case "renewal_opportunity":
        return <Lightbulb className="h-5 w-5 text-green-600" />;
      case "low_engagement":
        return <BarChart3 className="h-5 w-5 text-yellow-600" />;
      default:
        return <Bot className="h-5 w-5 text-gray-600" />;
    }
  };

  const getSuggestionStyle = (type: string) => {
    switch (type) {
      case "high_engagement":
        return "bg-blue-50 border-blue-200";
      case "renewal_opportunity":
        return "bg-green-50 border-green-200";
      case "low_engagement":
        return "bg-yellow-50 border-yellow-200";
      default:
        return "bg-gray-50 border-gray-200";
    }
  };

  const getSuggestionButtonStyle = (type: string) => {
    switch (type) {
      case "high_engagement":
        return "bg-primary hover:bg-blue-700 text-white";
      case "renewal_opportunity":
        return "bg-green-600 hover:bg-green-700 text-white";
      case "low_engagement":
        return "bg-yellow-600 hover:bg-yellow-700 text-white";
      default:
        return "bg-gray-600 hover:bg-gray-700 text-white";
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
              <div className="mt-6 p-4 bg-gray-50 rounded-lg border">
                <h4 className="font-medium text-gray-900 mb-3">Structured Article Analysis</h4>
                <div className="text-sm text-gray-800 whitespace-pre-line leading-relaxed">
                  {reportSummary}
                </div>
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

        <Card>
          <CardHeader>
            <CardTitle>AI Content Suggestions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {suggestions.length > 0 ? (
                suggestions.slice(0, 3).map((suggestion, index) => (
                  <div key={index} className={`border rounded-lg p-4 ${getSuggestionStyle(suggestion.type)}`}>
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        {getSuggestionIcon(suggestion.type)}
                      </div>
                      <div className="ml-3 flex-1">
                        <p className="text-sm font-medium text-gray-800">{suggestion.title}</p>
                        <p className="text-sm text-gray-700 mt-1">{suggestion.description}</p>
                        <div className="mt-2">
                          <Button 
                            size="sm" 
                            className={`text-xs ${getSuggestionButtonStyle(suggestion.type)}`}
                          >
                            {suggestion.action}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <Bot className="h-5 w-5 text-primary" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-blue-800">High Interest in Tech Trends</p>
                      <p className="text-sm text-blue-700 mt-1">
                        5 clients clicked multiple links in WILTW #66. Consider creating follow-up content on semiconductor supply chains.
                      </p>
                      <div className="mt-2">
                        <Button size="sm" className="text-xs bg-primary hover:bg-blue-700 text-white">
                          Create Follow-up
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Client Engagement Details */}
      <Card>
        <CardHeader>
          <CardTitle>Client Engagement Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Client
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Open Rate
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Click Rate
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Interest Tags
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Engagement
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    AI Suggestion
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {clients.slice(0, 5).map((client) => (
                  <tr key={client.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {client.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`${
                        (client.engagement_rate || 0) > 70 ? 'text-green-600' :
                        (client.engagement_rate || 0) > 50 ? 'text-primary' :
                        'text-yellow-600'
                      }`}>
                        {client.engagement_rate}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`${
                        (client.engagement_rate || 0) > 70 ? 'text-green-600' :
                        (client.engagement_rate || 0) > 50 ? 'text-primary' :
                        'text-yellow-600'
                      }`}>
                        {Math.round((client.engagement_rate || 0) * 100)}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex space-x-1">
                        {(client.interest_tags || []).slice(0, 2).map((tag: string, index: number) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      WILTW #{66 - client.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-primary">
                      {client.riskLevel === "medium" ? "Renewal opportunity" :
                       client.riskLevel === "high" ? "Re-engage with content" :
                       "Send relevant report"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
