import { useState, useEffect, startTransition } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { FileText, Upload, Bot, RefreshCw, Calendar, TrendingUp, Users, FileBarChart, CheckCircle, Clock, AlertCircle, Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface BulkUploadProgress {
  current: number;
  total: number;
  currentFile: string;
  completedFiles: string[];
}

export function ContentDistribution() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [reportType, setReportType] = useState('auto_detect');
  const [reportSummary, setReportSummary] = useState('');
  const [selectedReport, setSelectedReport] = useState('');
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [isUploadingMultiple, setIsUploadingMultiple] = useState(false);
  const [bulkUploadProgress, setBulkUploadProgress] = useState<BulkUploadProgress | null>(null);
  const [regeneratingSection, setRegeneratingSection] = useState<string | null>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: reports = [] } = useQuery({
    queryKey: ["/api/content-reports"],
    queryFn: () => apiRequest("/api/content-reports", "GET"),
  });

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
    
    const inputElement = event.target as HTMLInputElement;
    const isMultipleUpload = inputElement.multiple;
    
    if (isMultipleUpload || pdfFiles.length > 1) {
      setSelectedFiles(pdfFiles);
      setSelectedFile(null);
      setReportType('auto_detect');
      
      toast({
        title: "Files Selected",
        description: `${pdfFiles.length} PDF files ready for bulk upload.`,
      });
    } else {
      setSelectedFile(pdfFiles[0]);
      setSelectedFiles([]);
      
      toast({
        title: "File Selected",
        description: `Selected: ${pdfFiles[0].name}`,
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
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      setSelectedFile(null);
      queryClient.invalidateQueries({ queryKey: ["/api/content-reports"] });
      
      if (data.parseSuccess) {
        toast({
          title: "Upload Successful",
          description: `PDF uploaded and parsed successfully. Report ID: ${data.reportId}`,
        });
      } else {
        toast({
          title: "Upload Complete",
          description: "PDF uploaded but parsing failed. You can try parsing manually.",
          variant: "destructive"
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Upload Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const regenerateSectionMutation = useMutation({
    mutationFn: async ({ reportId, sectionType }: { reportId: string, sectionType: string }) => {
      const response = await fetch('/api/ai/regenerate-section', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          reportId: parseInt(reportId),
          sectionType: sectionType
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Regeneration failed');
      }

      return response.json();
    },
    onSuccess: (data, variables) => {
      setRegeneratingSection(null);
      
      if (selectedReport) {
        startTransition(() => {
          setReportSummary("");
          
          fetch("/api/report-summaries")
            .then(response => response.json())
            .then((summaries: any[]) => {
              const reportSummary = summaries.find((s: any) => s.content_report_id.toString() === selectedReport);
              if (reportSummary) {
                startTransition(() => {
                  setReportSummary(reportSummary.parsed_summary);
                  console.log('Summary updated after regeneration, new length:', reportSummary.parsed_summary.length);
                });
              }
            })
            .catch(error => {
              console.error('Failed to reload summary:', error);
            });
        });
      }
      
      queryClient.invalidateQueries({ queryKey: ["/api/report-summaries"] });
      
      toast({
        title: "Section Regenerated",
        description: `${variables.sectionType} section has been updated successfully.`,
      });
    },
    onError: (error, variables) => {
      setRegeneratingSection(null);
      toast({
        title: "Regeneration Failed",
        description: `Failed to regenerate ${variables.sectionType} section: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const summarizeReportMutation = useMutation({
    mutationFn: async (reportId: string) => {
      const response = await fetch('/api/ai/summarize-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reportId: parseInt(reportId) }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Summarization failed');
      }
      
      return await response.json();
    },
    onSuccess: (data) => {
      startTransition(() => {
        setReportSummary(data.summary);
      });
      setIsGeneratingSummary(false);
      queryClient.invalidateQueries({ queryKey: ["/api/report-summaries"] });
      toast({
        title: "Report Parsed",
        description: "AI analysis completed successfully!",
      });
    },
    onError: (error) => {
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
        
        const filename = file.name.toLowerCase();
        let parserType = 'wiltw_parser';
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
        title: "Bulk Upload Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const renderRegenerateButton = (sectionType: string, label: string) => {
    const isRegenerating = regeneratingSection === sectionType;
    
    return (
      <Button
        onClick={() => {
          if (selectedReport) {
            setRegeneratingSection(sectionType);
            regenerateSectionMutation.mutate({ 
              reportId: selectedReport, 
              sectionType: sectionType 
            });
          }
        }}
        disabled={!selectedReport || isRegenerating}
        variant="outline"
        size="sm"
        className="flex items-center gap-2"
      >
        {isRegenerating ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <RefreshCw className="w-4 h-4" />
        )}
        {isRegenerating ? "Regenerating..." : `Regenerate`}
      </Button>
    );
  };

  const renderSummarySection = (content: string, title: string, sectionType: string) => {
    if (!content) return null;

    return (
      <div className="mb-6 p-4 border rounded-lg bg-gray-50 dark:bg-gray-800">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
          {renderRegenerateButton(sectionType, title)}
        </div>
        <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
          {content}
        </div>
      </div>
    );
  };

  const parseSummaryContent = (summary: string) => {
    const sections = {
      structured: '',
      detailed: '',
      comprehensive: ''
    };

    const structuredMatch = summary.match(/## Structured Article-by-Article Analysis[\s\S]*?(?=## (?:Detailed|Comprehensive)|$)/);
    if (structuredMatch) {
      sections.structured = structuredMatch[0].replace(/^## Structured Article-by-Article Analysis\s*/, '').trim();
    }

    const detailedMatch = summary.match(/## Detailed (?:Article )?Summary[\s\S]*?(?=## Comprehensive|$)/);
    if (detailedMatch) {
      sections.detailed = detailedMatch[0].replace(/^## Detailed (?:Article )?Summary\s*/, '').trim();
    }

    const comprehensiveMatch = summary.match(/## Comprehensive Analysis[\s\S]*$/);
    if (comprehensiveMatch) {
      sections.comprehensive = comprehensiveMatch[0].replace(/^## Comprehensive Analysis\s*/, '').trim();
    }

    return sections;
  };

  const sections = parseSummaryContent(reportSummary);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Content Distribution</h1>
          <p className="text-muted-foreground">
            Upload and analyze research reports with AI-powered insights
          </p>
        </div>
      </div>

      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-green-700">
            <Upload className="w-5 h-5 mr-2" />
            Document Upload
          </CardTitle>
          <CardDescription>
            Upload individual PDFs or multiple files for bulk processing
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Single File Upload */}
            <div className="space-y-4">
              <h3 className="font-medium">Single File Upload</h3>
              <div className="flex items-center space-x-2">
                <Input
                  type="file"
                  accept=".pdf"
                  onChange={handleFileUpload}
                  className="flex-1"
                />
                <Button
                  onClick={() => selectedFile && uploadMutation.mutate(selectedFile)}
                  disabled={!selectedFile || uploadMutation.isPending}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  {uploadMutation.isPending ? "Uploading..." : "Upload"}
                </Button>
              </div>
              {selectedFile && (
                <div className="text-sm text-gray-600">
                  Selected: {selectedFile.name}
                </div>
              )}
            </div>

            {/* Multiple Files Upload */}
            <div className="space-y-4">
              <h3 className="font-medium">Bulk Upload</h3>
              <div className="flex items-center space-x-2">
                <Input
                  type="file"
                  accept=".pdf"
                  multiple
                  onChange={handleFileUpload}
                  className="flex-1"
                />
                <Button
                  onClick={() => {
                    if (selectedFiles.length > 0) {
                      setIsUploadingMultiple(true);
                      uploadMultiplePdfsMutation.mutate(selectedFiles);
                    }
                  }}
                  disabled={selectedFiles.length === 0 || isUploadingMultiple}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  {isUploadingMultiple ? "Uploading..." : `Upload ${selectedFiles.length} Files`}
                </Button>
              </div>
              {selectedFiles.length > 0 && (
                <div className="space-y-2">
                  <div className="text-sm text-gray-600">
                    {selectedFiles.length} files selected:
                  </div>
                  <div className="max-h-32 overflow-y-auto">
                    {selectedFiles.map((file, index) => (
                      <div key={index} className="text-xs text-gray-500 truncate">
                        {file.name}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Report Parser */}
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
                      {(reports as any[])
                        .filter((report: any) => 
                          report.source_type === 'uploaded_pdf' && 
                          (report.title.includes('WILTW') || !report.title.includes('WATMTU'))
                        )
                        .sort((a: any, b: any) => {
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
                          startTransition(() => {
                            setReportSummary(reportSummary.parsed_summary);
                          });
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
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Market Analysis Reports (WATMTU) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-purple-700">
              <TrendingUp className="w-5 h-5 mr-2" />
              Market Analysis (WATMTU)
            </CardTitle>
            <CardDescription>
              Weekly market analysis and trend reports
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
                      {(reports as any[])
                        .filter((report: any) => 
                          report.source_type === 'uploaded_pdf' && 
                          report.title.includes('WATMTU')
                        )
                        .sort((a: any, b: any) => {
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
                  className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white"
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
                          startTransition(() => {
                            setReportSummary(reportSummary.parsed_summary);
                          });
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
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Report Summary Display */}
      {reportSummary && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileBarChart className="w-5 h-5 mr-2" />
              Report Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {sections.structured && renderSummarySection(
                sections.structured, 
                "Structured Analysis", 
                "structured"
              )}
              
              {sections.detailed && renderSummarySection(
                sections.detailed, 
                "Detailed Summary", 
                "detailed"
              )}
              
              {sections.comprehensive && renderSummarySection(
                sections.comprehensive, 
                "Comprehensive Analysis", 
                "comprehensive"
              )}
              
              {!sections.structured && !sections.detailed && !sections.comprehensive && (
                <div className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-800">
                  <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                    {reportSummary}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}