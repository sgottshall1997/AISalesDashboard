import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { AiFeedback } from "@/components/ai-feedback";
import { 
  Upload,
  Trash2,
  Bot,
  FileText,
  Users,
  Target,
  Mail,
  Copy
} from "lucide-react";

export function ContentDistribution() {
  const [selectedReport, setSelectedReport] = useState<string>("");
  const [reportSummary, setReportSummary] = useState<string>("");
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [reportType, setReportType] = useState<string>("wiltw");
  const [isUploadingMultiple, setIsUploadingMultiple] = useState(false);
  const [bulkUploadProgress, setBulkUploadProgress] = useState<{
    current: number;
    total: number;
    currentFile: string;
    completedFiles: string[];
  } | null>(null);
  const [prospectMatches, setProspectMatches] = useState<any[]>([]);
  const [isMatchingProspects, setIsMatchingProspects] = useState(false);
  const [showProspectDialog, setShowProspectDialog] = useState(false);
  const [generatedEmail, setGeneratedEmail] = useState<string>('');
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [emailProspectName, setEmailProspectName] = useState<string>('');
  const [isGeneratingEmail, setIsGeneratingEmail] = useState(false);

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





  const { data: savedSummaries = [] } = useQuery({
    queryKey: ["/api/report-summaries"],
    queryFn: () => apiRequest("/api/report-summaries", "GET"),
  });







  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const pdfFiles = files.filter(file => file.type === 'application/pdf');
    
    if (pdfFiles.length === 0) {
      toast({
        title: "Invalid Files",
        description: "Please select PDF files only.",
        variant: "destructive",
      });
      return;
    }
    
    // Check if this is the single file input or multiple file input
    const inputElement = event.target as HTMLInputElement;
    const isMultipleUpload = inputElement.multiple;
    
    if (isMultipleUpload || pdfFiles.length > 1) {
      // Multiple files selected or using multiple file input
      setSelectedFiles(pdfFiles);
      setSelectedFile(null);
      setReportType('auto_detect'); // Let server auto-detect for each file
      
      toast({
        title: "Files Selected",
        description: `${pdfFiles.length} PDF files ready for bulk upload.`,
      });
    } else {
      // Single file selected
      setSelectedFile(pdfFiles[0]);
      setSelectedFiles([]);
      // Auto-detect report type based on filename
      if (pdfFiles[0].name.toLowerCase().includes('watmtu')) {
        setReportType('watmtu');
      } else {
        setReportType('wiltw');
      }
    }
    
    if (files.length > pdfFiles.length) {
      toast({
        title: "Some Files Skipped",
        description: `${files.length - pdfFiles.length} non-PDF files were ignored.`,
      });
    }
  };

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('pdf', file);
      formData.append('reportType', reportType);
      formData.append('parserType', 'auto_detect');
      
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

  const processBulkUpload = async (files: File[]) => {
    setIsUploadingMultiple(true);
    setBulkUploadProgress({
      current: 0,
      total: files.length,
      currentFile: '',
      completedFiles: []
    });

    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];
    const completedFiles: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      setBulkUploadProgress(prev => prev ? {
        ...prev,
        current: i + 1,
        currentFile: file.name
      } : null);

      try {
        // Upload file
        const formData = new FormData();
        formData.append('pdf', file);
        formData.append('reportType', reportType);
        
        const uploadResponse = await fetch('/api/upload-pdf', {
          method: 'POST',
          body: formData,
        });
        
        if (!uploadResponse.ok) {
          throw new Error(`Upload failed for ${file.name}`);
        }
        
        const uploadResult = await uploadResponse.json();
        
        // Handle single or multiple uploaded reports
        const uploadedReports = uploadResult.results || [uploadResult.report || uploadResult];
        
        // Parse each uploaded report using AI summarization
        for (const report of uploadedReports) {
          if (report && report.id) {
            console.log(`Starting AI parsing for report ID: ${report.id}, Title: ${report.title}`);
            
            const isWATMTU = report.title.includes("WATMTU") || reportType === "watmtu";
            const promptType = isWATMTU ? "watmtu_parser" : "wiltw_parser";

            const parseResult = await apiRequest("/api/ai/summarize-report", "POST", {
              reportId: report.id.toString(),
              title: report.title,
              promptType: promptType
            });
            
            console.log(`AI parsing completed for ${report.title}, summary length: ${parseResult.summary?.length || 0}`);
          }
        }
        
        successCount++;
        completedFiles.push(file.name);
        
        setBulkUploadProgress(prev => prev ? {
          ...prev,
          completedFiles: [...completedFiles]
        } : null);
        
        toast({
          title: `Parsed: ${file.name}`,
          description: `Successfully uploaded and parsed (${i + 1}/${files.length})`,
        });
        
      } catch (error) {
        errorCount++;
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`${file.name}: ${errorMsg}`);
        
        toast({
          title: `Failed: ${file.name}`,
          description: errorMsg,
          variant: "destructive",
        });
      }
      
      // Refresh data after each file
      queryClient.invalidateQueries({ queryKey: ["/api/content-reports"] });
      queryClient.invalidateQueries({ queryKey: ["/api/report-summaries"] });
    }

    // Final completion
    setBulkUploadProgress(null);
    setIsUploadingMultiple(false);
    setSelectedFiles([]);
    
    toast({
      title: "Bulk Processing Complete",
      description: `${successCount} files processed successfully. ${errorCount > 0 ? `${errorCount} failed.` : ''}`,
    });
    
    if (errors.length > 0) {
      console.error('Processing errors:', errors);
    }
  };

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

      // Use direct fetch with extended timeout for AI summarization
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minutes timeout
      
      const response = await fetch("/api/ai/summarize-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportId: report.id.toString(),
          title: report.title,
          content: report.full_content || report.content_summary,
          promptType: promptType
        }),
        credentials: "include",
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`${response.status}: ${text}`);
      }
      
      return await response.json();
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

  const uploadMultiplePdfsMutation = useMutation({
    mutationFn: async (files: File[]) => {
      const results = [];
      for (const file of files) {
        const formData = new FormData();
        formData.append('pdf', file);
        
        // Determine parser type based on filename
        const filename = file.name.toLowerCase();
        let parserType = 'wiltw_parser'; // default
        if (filename.includes('watmtu')) {
          parserType = 'watmtu_parser';
        }
        formData.append('parserType', parserType);
        
        const response = await fetch('/api/upload-pdf', {
          method: 'POST',
          body: formData,
        });
        
        if (!response.ok) {
          throw new Error(`Failed to upload ${file.name}`);
        }
        
        const result = await response.json();
        results.push({ filename: file.name, result });
      }
      return results;
    },
    onSuccess: (results) => {
      setIsUploadingMultiple(false);
      setSelectedFiles([]);
      queryClient.invalidateQueries({ queryKey: ["/api/content-reports"] });
      queryClient.invalidateQueries({ queryKey: ["/api/report-summaries"] });
      
      const successfulParsing = results.filter(r => r.result.parseSuccess).length;
      const failedParsing = results.length - successfulParsing;
      
      toast({
        title: "PDFs Uploaded",
        description: `${results.length} files uploaded. ${successfulParsing} parsed successfully${failedParsing > 0 ? `, ${failedParsing} parsing failed` : ''}.`,
        variant: failedParsing > 0 ? "destructive" : "default"
      });
    },
    onError: (error) => {
      setIsUploadingMultiple(false);
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload PDFs. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteReportMutation = useMutation({
    mutationFn: async (reportId: number) => {
      const response = await fetch(`/api/content-reports/${reportId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Delete failed');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/content-reports"] });
      queryClient.invalidateQueries({ queryKey: ["/api/report-summaries"] });
      toast({
        title: "Report Deleted",
        description: "Report and associated summaries have been successfully removed.",
      });
    },
    onError: (error) => {
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete report. Please try again.",
        variant: "destructive",
      });
    },
  });

  const prospectMatchMutation = useMutation({
    mutationFn: async (reportSummary: string) => {
      const response = await apiRequest("/api/match-prospect-themes", "POST", {
        reportContent: reportSummary
      });
      return response.json();
    },
    onMutate: () => {
      setIsMatchingProspects(true);
    },
    onSuccess: (data) => {
      setProspectMatches(data.matches || []);
      setShowProspectDialog(true);
      setIsMatchingProspects(false);
      toast({
        title: "Prospect Match Complete",
        description: `Found ${data.matches?.length || 0} prioritized prospects (${data.totalProspects || 0} total leads analyzed)`,
      });
    },
    onError: (error) => {
      setIsMatchingProspects(false);
      console.error("Prospect matching error:", error);
      toast({
        title: "Matching Failed", 
        description: error.message || "Failed to match prospects with content. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Mutation for email generation
  const generateEmailMutation = useMutation({
    mutationFn: async (data: { 
      prospectName: string; 
      reportTitle: string; 
      keyTalkingPoints: string[]; 
      matchReason: string 
    }) => {
      const response = await apiRequest("/api/generate-prospect-email", "POST", data);
      return response.json();
    },
    onMutate: () => {
      setIsGeneratingEmail(true);
    },
    onSuccess: (data) => {
      setGeneratedEmail(data.email);
      setEmailProspectName(data.prospectName);
      setShowEmailDialog(true);
      setIsGeneratingEmail(false);
      toast({
        title: "Email Generated",
        description: `Created personalized email for ${data.prospectName}`,
      });
    },
    onError: (error: any) => {
      setIsGeneratingEmail(false);
      toast({
        title: "Email Generation Failed",
        description: "Failed to generate email. Please try again.",
        variant: "destructive",
      });
    },
  });

  const { data: reports = [], isLoading: reportsLoading } = useQuery({
    queryKey: ["/api/content-reports"],
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
          <div className="space-y-6">
            {/* Single File Upload */}
            <div className="border-b pb-4">
              <h3 className="text-lg font-medium text-gray-900 mb-3">Single File Upload</h3>
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
            </div>

            {/* Multiple Files Upload */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">Bulk Upload & Auto-Parse</h3>
              <div className="space-y-4">
                <div>
                  <label htmlFor="multiple-file-upload" className="block text-sm font-medium text-gray-700 mb-2">
                    Select Multiple PDF Files (Auto-detects WILTW/WATMTU from filename)
                  </label>
                  <input
                    id="multiple-file-upload"
                    type="file"
                    accept=".pdf"
                    multiple
                    onChange={handleFileUpload}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
                  />
                </div>
                
                {selectedFiles.length > 0 && (
                  <div className="mt-4 p-3 bg-green-50 rounded-lg">
                    <p className="text-sm text-green-800 font-medium mb-2">
                      <strong>Selected Files ({selectedFiles.length}):</strong>
                    </p>
                    <div className="space-y-1">
                      {selectedFiles.map((file, index) => (
                        <div key={index} className="text-sm text-green-700 flex items-center gap-2">
                          <FileText className="w-3 h-3" />
                          {file.name}
                          <span className="text-xs text-green-600">
                            ({(file.size / 1024 / 1024).toFixed(2)} MB)
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="flex justify-end">
                  <Button 
                    onClick={() => {
                      if (selectedFiles.length > 0) {
                        processBulkUpload(selectedFiles);
                      }
                    }}
                    disabled={selectedFiles.length === 0 || isUploadingMultiple}
                    className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
                  >
                    <Upload className="w-4 h-4" />
                    {isUploadingMultiple ? `Processing ${selectedFiles.length} files...` : `Upload & Parse ${selectedFiles.length} Files`}
                  </Button>
                </div>
                
                {bulkUploadProgress && (
                  <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <p className="text-sm font-medium text-blue-800">
                        Processing Files ({bulkUploadProgress.current}/{bulkUploadProgress.total})
                      </p>
                      <span className="text-xs text-blue-600">
                        {Math.round((bulkUploadProgress.current / bulkUploadProgress.total) * 100)}%
                      </span>
                    </div>
                    <div className="w-full bg-blue-200 rounded-full h-2 mb-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${(bulkUploadProgress.current / bulkUploadProgress.total) * 100}%` }}
                      ></div>
                    </div>
                    {bulkUploadProgress.currentFile && (
                      <p className="text-sm text-blue-700 mb-1">
                        Currently parsing: <strong>{bulkUploadProgress.currentFile}</strong>
                      </p>
                    )}
                    {bulkUploadProgress.completedFiles.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs text-blue-600 mb-1">Completed:</p>
                        <div className="flex flex-wrap gap-1">
                          {bulkUploadProgress.completedFiles.map((file, index) => (
                            <span key={index} className="inline-block bg-green-100 text-green-700 text-xs px-2 py-1 rounded">
                              {file}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {selectedFiles.length > 0 && !bulkUploadProgress && (
                  <div className="mt-4 p-4 bg-green-50 rounded-lg">
                    <p className="text-sm font-medium text-green-800 mb-2">
                      Selected Files ({selectedFiles.length}):
                    </p>
                    <div className="space-y-1">
                      {selectedFiles.map((file, index) => {
                        const isWiltw = file.name.toLowerCase().includes('wiltw');
                        const isWatmtu = file.name.toLowerCase().includes('watmtu');
                        const parserType = isWatmtu ? 'WATMTU Parser' : 'WILTW Parser';
                        const bgColor = isWatmtu ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800';
                        
                        return (
                          <div key={index} className="flex items-center justify-between text-sm">
                            <span className="text-green-700">{file.name}</span>
                            <Badge className={`${bgColor} text-xs`}>
                              {parserType}
                            </Badge>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Report Parser - Organized by Type */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Thematic Reports (WILTW) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-blue-700">
              <FileText className="w-5 h-5 mr-2" />
              Thematic Reports (WILTW)
            </CardTitle>
            <CardDescription>
              Weekly thematic analysis reports for content insights
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex gap-4 items-end">
                <div className="flex-1">
                  <Select value={selectedReport} onValueChange={setSelectedReport}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Choose a WILTW report..." />
                    </SelectTrigger>
                    <SelectContent>
                      {reports
                        .filter((report: any) => 
                          report.source_type === 'uploaded_pdf' && 
                          (report.title.includes('WILTW') || !report.title.includes('WATMTU'))
                        )
                        .sort((a: any, b: any) => {
                          // Extract date from title (e.g., "WILTW_2025-06-05" -> "2025-06-05")
                          const extractDate = (title: string) => {
                            const match = title.match(/(\d{4}-\d{2}-\d{2})/);
                            return match ? new Date(match[1]) : new Date(0);
                          };
                          
                          const dateA = extractDate(a.title);
                          const dateB = extractDate(b.title);
                          return dateB.getTime() - dateA.getTime();
                        })
                        .map((report: any) => (
                          <SelectItem key={report.id} value={report.id.toString()}>
                            {report.title}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
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
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                  size="sm"
                >
                  <Bot className="w-4 h-4" />
                  {isGeneratingSummary ? "Parsing..." : "Parse Report"}
                </Button>
                <Button 
                  variant="outline"
                  onClick={async () => {
                    if (selectedReport) {
                      try {
                        const summaries = await apiRequest(`/api/report-summaries`, "GET");
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
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  Load Saved
                </Button>
                <Button 
                  variant="destructive"
                  onClick={() => {
                    if (selectedReport && confirm("Are you sure you want to delete this report? This action cannot be undone.")) {
                      deleteReportMutation.mutate(parseInt(selectedReport));
                      setSelectedReport("");
                    }
                  }}
                  disabled={!selectedReport || deleteReportMutation.isPending}
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  {deleteReportMutation.isPending ? "Deleting..." : "Delete"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Technical Reports (WATMTU) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-green-700">
              <FileText className="w-5 h-5 mr-2" />
              Technical Reports (WATMTU)
            </CardTitle>
            <CardDescription>
              Technical market analysis and performance tracking
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex gap-4 items-end">
                <div className="flex-1">
                  <Select value={selectedReport} onValueChange={setSelectedReport}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Choose a WATMTU report..." />
                    </SelectTrigger>
                    <SelectContent>
                      {reports
                        .filter((report: any) => 
                          report.source_type === 'uploaded_pdf' && 
                          report.title.includes('WATMTU')
                        )
                        .sort((a: any, b: any) => {
                          // Extract date from title (e.g., "WATMTU_2025-06-08" -> "2025-06-08")
                          const extractDate = (title: string) => {
                            const match = title.match(/(\d{4}-\d{2}-\d{2})/);
                            return match ? new Date(match[1]) : new Date(0);
                          };
                          
                          const dateA = extractDate(a.title);
                          const dateB = extractDate(b.title);
                          return dateB.getTime() - dateA.getTime();
                        })
                        .map((report: any) => (
                          <SelectItem key={report.id} value={report.id.toString()}>
                            {report.title}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
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
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white"
                  size="sm"
                >
                  <Bot className="w-4 h-4" />
                  {isGeneratingSummary ? "Parsing..." : "Parse Report"}
                </Button>
                <Button 
                  variant="outline"
                  onClick={async () => {
                    if (selectedReport) {
                      try {
                        const summaries = await apiRequest(`/api/report-summaries`, "GET");
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
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  Load Saved
                </Button>
                <Button 
                  variant="destructive"
                  onClick={() => {
                    if (selectedReport && confirm("Are you sure you want to delete this report? This action cannot be undone.")) {
                      deleteReportMutation.mutate(parseInt(selectedReport));
                      setSelectedReport("");
                    }
                  }}
                  disabled={!selectedReport || deleteReportMutation.isPending}
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  {deleteReportMutation.isPending ? "Deleting..." : "Delete"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Parsed Summary Display */}
      {reportSummary && (
        <div className="mb-8 space-y-6">
          {(() => {
            // Parse the combined summary into three parts
            const parseThreeParts = (summary: string) => {
              const parts = {
                structured: '',
                detailed: '',
                comprehensive: ''
              };

              // Look for the three main sections in the summary
              const structuredMatch = summary.match(/## Structured Article Analysis[\s\S]*?(?=## Detailed Summary|$)/);
              const detailedMatch = summary.match(/## Detailed Summary[\s\S]*?(?=## Comprehensive Analysis|$)/);
              const comprehensiveMatch = summary.match(/## Comprehensive Analysis[\s\S]*$/);

              if (structuredMatch) parts.structured = structuredMatch[0].trim();
              if (detailedMatch) parts.detailed = detailedMatch[0].trim();
              if (comprehensiveMatch) parts.comprehensive = comprehensiveMatch[0].trim();

              // If sections aren't found, try alternative parsing
              if (!parts.structured && !parts.detailed && !parts.comprehensive) {
                // Split by common delimiters or fallback to single summary
                const sections = summary.split(/(?=##\s)/);
                if (sections.length >= 3) {
                  parts.structured = sections[0]?.trim() || '';
                  parts.detailed = sections[1]?.trim() || '';
                  parts.comprehensive = sections[2]?.trim() || '';
                } else {
                  // Single summary - show in detailed section
                  parts.detailed = summary;
                }
              }

              return parts;
            };

            const summaryParts = parseThreeParts(reportSummary);

            return (
              <>
                {/* Structured Summary */}
                {summaryParts.structured && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center text-blue-700">
                        <FileText className="w-5 h-5 mr-2" />
                        Structured Analysis
                      </CardTitle>
                      <CardDescription>
                        Organized breakdown of key themes and investment insights
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                        <div className="text-sm text-gray-700 whitespace-pre-wrap max-h-80 overflow-y-auto">
                          {formatCleanSummary(summaryParts.structured)}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Detailed Summary */}
                {summaryParts.detailed && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center text-green-700">
                        <FileText className="w-5 h-5 mr-2" />
                        Detailed Summary
                      </CardTitle>
                      <CardDescription>
                        In-depth analysis with context and market implications
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                        <div className="text-sm text-gray-700 whitespace-pre-wrap max-h-80 overflow-y-auto">
                          {formatCleanSummary(summaryParts.detailed)}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Comprehensive Analysis */}
                {summaryParts.comprehensive && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center text-purple-700">
                        <FileText className="w-5 h-5 mr-2" />
                        Comprehensive Analysis
                      </CardTitle>
                      <CardDescription>
                        Executive summary with strategic insights and recommendations
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                        <div className="text-sm text-gray-700 whitespace-pre-wrap max-h-80 overflow-y-auto">
                          {formatCleanSummary(summaryParts.comprehensive)}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Fallback for single summary */}
                {!summaryParts.structured && !summaryParts.detailed && !summaryParts.comprehensive && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <FileText className="w-5 h-5 mr-2" />
                        Parsed Summary
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="text-sm text-gray-700 whitespace-pre-wrap max-h-96 overflow-y-auto">
                          {formatCleanSummary(reportSummary)}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            );
          })()}

          {/* Prospect Match Button - Show when summary is available */}
          {reportSummary && (
            <div className="mt-6 flex justify-center">
              <Button 
                onClick={() => prospectMatchMutation.mutate(reportSummary)}
                disabled={isMatchingProspects}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isMatchingProspects ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Matching Prospects...
                  </>
                ) : (
                  <>
                    <Target className="w-4 h-4 mr-2" />
                    Prospect Match
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Prospect Match Results Dialog */}
      <Dialog open={showProspectDialog} onOpenChange={setShowProspectDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Users className="w-5 h-5 mr-2" />
              Top 15 Prioritized Prospects
            </DialogTitle>
            <DialogDescription>
              High-likelihood and high-engagement prospects ranked by content relevance
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            {prospectMatches.length > 0 ? (
              <div className="space-y-4">
                {prospectMatches.map((match, index) => (
                  <Card key={index} className="border-l-4 border-l-blue-500">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg">{match.name}</CardTitle>
                          <p className="text-sm text-gray-600">{match.company}</p>
                          <div className="flex gap-2 mt-2">
                            <Badge variant="outline" className="text-xs">
                              {match.likelihoodOfClosing} likelihood
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {match.engagementLevel} engagement
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {match.stage}
                            </Badge>
                          </div>
                        </div>
                        <Badge variant={match.relevanceScore >= 80 ? "default" : match.relevanceScore >= 60 ? "secondary" : "outline"}>
                          {match.relevanceScore}% Match
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div>
                          <h4 className="font-semibold text-sm mb-1">Why This Prospect Matches:</h4>
                          <p className="text-sm text-gray-700 mb-3">{match.reasoning}</p>
                          
                          {match.interestTags && match.interestTags.length > 0 && (
                            <div>
                              <h4 className="font-semibold text-sm mb-1">Interest Tags:</h4>
                              <div className="flex flex-wrap gap-1">
                                {match.interestTags.map((interest: string, i: number) => (
                                  <Badge key={i} variant="outline" className="text-xs">
                                    {interest}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                        
                        <div>
                          <h4 className="font-semibold text-sm mb-1">Suggested Approach:</h4>
                          <p className="text-sm text-gray-700">{match.suggestedApproach}</p>
                        </div>
                        {match.notes && (
                          <div>
                            <h4 className="font-semibold text-sm mb-1">Notes:</h4>
                            <p className="text-sm text-gray-600">{match.notes}</p>
                          </div>
                        )}
                            <h4 className="font-semibold text-sm mb-1">Key Talking Points:</h4>
                            <div className="flex flex-wrap gap-1">
                              {match.keyTalkingPoints.map((point: string, i: number) => (
                                <Badge key={i} variant="secondary" className="text-xs">
                                  {point}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        {match.suggestedApproach && (
                          <div>
                            <h4 className="font-semibold text-sm mb-1">Suggested Approach:</h4>
                            <p className="text-sm text-gray-700">{match.suggestedApproach}</p>
                          </div>
                        )}
                      </div>
                      <div className="pt-3 border-t">
                        <Button
                          onClick={() => {
                            const reportTitle = selectedReport ? 
                              reports.find((r: any) => r.id.toString() === selectedReport)?.title || "Recent Report" :
                              "Recent Report";
                            
                            generateEmailMutation.mutate({
                              prospectName: match.name,
                              reportTitle,
                              keyTalkingPoints: match.keyTalkingPoints || [],
                              matchReason: match.matchReason || match.reasoning || ""
                            });
                          }}
                          disabled={isGeneratingEmail}
                          className="w-full bg-green-600 hover:bg-green-700 text-white"
                          size="sm"
                        >
                          {isGeneratingEmail ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              Generating Email...
                            </>
                          ) : (
                            <>
                              <Mail className="w-4 h-4 mr-2" />
                              Generate Email
                            </>
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No relevant prospects found for this report.</p>
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Generated Email Dialog */}
      <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Mail className="w-5 h-5 mr-2" />
              Generated Email for {emailProspectName}
            </DialogTitle>
            <DialogDescription>
              Personalized prospecting email following the 13D format
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg border">
              <div className="whitespace-pre-wrap text-sm font-mono">
                {generatedEmail}
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  navigator.clipboard.writeText(generatedEmail);
                  toast({
                    title: "Copied to Clipboard",
                    description: "Email content has been copied to your clipboard",
                  });
                }}
                variant="outline"
                className="flex-1"
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy Email
              </Button>
              <Button
                onClick={() => setShowEmailDialog(false)}
                className="flex-1"
              >
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}