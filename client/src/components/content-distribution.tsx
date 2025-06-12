import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  FileText,
  Upload, 
  BookOpen,
  BarChart3,
  Plus,
  Calendar,
  User,
  Trash2
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface ContentReport {
  id: number;
  title: string;
  type: string;
  published_date: string;
  open_rate: string;
  click_rate: string;
  engagement_level: "low" | "medium" | "high";
  tags: string[];
}

interface Client {
  id: number;
  name: string;
  company: string;
  engagement_rate: string;
  click_rate: string;
  interest_tags: string[];
}

interface ReadingHistory {
  id: number;
  client_id: number;
  report_title: string;
  read_date: string;
  engagement_notes: string;
  client: {
    name: string;
    company: string;
  };
}

export default function ContentDistribution() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [readingHistoryForm, setReadingHistoryForm] = useState({
    client_id: "",
    report_title: "",
    read_date: "",
    engagement_notes: ""
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: reports } = useQuery<ContentReport[]>({
    queryKey: ["/api/content-reports"],
  });

  const { data: clients } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const { data: readingHistory } = useQuery<ReadingHistory[]>({
    queryKey: ["/api/reading-history"],
  });

  const uploadReportMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('pdf', file);
      const response = await fetch('/api/upload-pdf', {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) throw new Error('Upload failed');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/content-reports"] });
      setSelectedFile(null);
      toast({
        title: "Report Uploaded",
        description: "PDF report has been uploaded and analyzed successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Upload Failed",
        description: "Failed to upload PDF report. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteReportMutation = useMutation({
    mutationFn: async (reportId: number) => {
      const response = await fetch(`/api/content-reports/${reportId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Delete failed');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/content-reports"] });
      toast({
        title: "Report Deleted",
        description: "Content report has been removed successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Delete Failed",
        description: "Failed to delete report. Please try again.",
        variant: "destructive",
      });
    },
  });

  const addReadingHistoryMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("/api/reading-history", "POST", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reading-history"] });
      setReadingHistoryForm({
        client_id: "",
        report_title: "",
        read_date: "",
        engagement_notes: ""
      });
      toast({
        title: "Reading History Added",
        description: "Client reading history has been recorded successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add reading history. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteReadingHistoryMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest(`/api/reading-history/${id}`, "DELETE", {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reading-history"] });
      toast({
        title: "Reading History Deleted",
        description: "Reading history entry has been removed.",
      });
    },
  });

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file);
    } else {
      toast({
        title: "Invalid File",
        description: "Please select a PDF file.",
        variant: "destructive",
      });
    }
  };

  const handleSubmitReadingHistory = () => {
    if (!readingHistoryForm.client_id || !readingHistoryForm.report_title || !readingHistoryForm.read_date) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    addReadingHistoryMutation.mutate({
      client_id: parseInt(readingHistoryForm.client_id),
      report_title: readingHistoryForm.report_title,
      read_date: readingHistoryForm.read_date,
      engagement_notes: readingHistoryForm.engagement_notes
    });
  };

  const getEngagementColor = (level: string) => {
    switch (level) {
      case "high":
        return "bg-green-100 text-green-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "low":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Content Distribution Tracker</h2>
          <p className="text-gray-600">Upload PDF reports for analysis and track client reading history</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* PDF Report Upload Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5" />
                Upload PDF Reports
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="pdf-upload">Select PDF Report</Label>
                <Input
                  id="pdf-upload"
                  type="file"
                  accept=".pdf"
                  onChange={handleFileUpload}
                  className="mt-1"
                />
              </div>
              
              {selectedFile && (
                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-600" />
                    <span className="text-sm font-medium text-blue-900">{selectedFile.name}</span>
                  </div>
                  <p className="text-xs text-blue-600 mt-1">
                    Size: {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              )}

              <Button 
                onClick={() => selectedFile && uploadReportMutation.mutate(selectedFile)}
                disabled={!selectedFile || uploadReportMutation.isPending}
                className="w-full"
              >
                {uploadReportMutation.isPending ? "Uploading..." : "Upload & Analyze Report"}
              </Button>
            </CardContent>
          </Card>

          {/* Client Reading History Input */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                Add Reading History
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="client-select">Client</Label>
                <Select value={readingHistoryForm.client_id} onValueChange={(value) => 
                  setReadingHistoryForm(prev => ({ ...prev, client_id: value }))
                }>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients?.map((client) => (
                      <SelectItem key={client.id} value={client.id.toString()}>
                        {client.name} - {client.company}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="report-title">Report Title</Label>
                <Input
                  id="report-title"
                  value={readingHistoryForm.report_title}
                  onChange={(e) => setReadingHistoryForm(prev => ({ ...prev, report_title: e.target.value }))}
                  placeholder="Enter report title"
                />
              </div>

              <div>
                <Label htmlFor="read-date">Read Date</Label>
                <Input
                  id="read-date"
                  type="date"
                  value={readingHistoryForm.read_date}
                  onChange={(e) => setReadingHistoryForm(prev => ({ ...prev, read_date: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="engagement-notes">Engagement Notes</Label>
                <Textarea
                  id="engagement-notes"
                  value={readingHistoryForm.engagement_notes}
                  onChange={(e) => setReadingHistoryForm(prev => ({ ...prev, engagement_notes: e.target.value }))}
                  placeholder="Add notes about client engagement..."
                  className="min-h-[80px]"
                />
              </div>

              <Button 
                onClick={handleSubmitReadingHistory}
                disabled={addReadingHistoryMutation.isPending}
                className="w-full"
              >
                <Plus className="w-4 h-4 mr-2" />
                {addReadingHistoryMutation.isPending ? "Adding..." : "Add Reading History"}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Analytics Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Reports</p>
                  <p className="text-2xl font-bold text-gray-900">{reports?.length || 0}</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-full">
                  <FileText className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Reading Entries</p>
                  <p className="text-2xl font-bold text-gray-900">{readingHistory?.length || 0}</p>
                </div>
                <div className="p-3 bg-green-100 rounded-full">
                  <BookOpen className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Clients</p>
                  <p className="text-2xl font-bold text-gray-900">{clients?.length || 0}</p>
                </div>
                <div className="p-3 bg-purple-100 rounded-full">
                  <User className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Reports */}
        {reports && reports.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Recent Reports
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Published</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Engagement</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {reports.slice(0, 5).map((report) => (
                      <tr key={report.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {report.title}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {report.type}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(report.published_date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge className={getEngagementColor(report.engagement_level)}>
                            {report.engagement_level}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deleteReportMutation.mutate(report.id)}
                            disabled={deleteReportMutation.isPending}
                            className="text-red-600 hover:text-red-800 border-red-300 hover:border-red-400"
                          >
                            {deleteReportMutation.isPending ? "Deleting..." : "Delete"}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Reading History */}
        {readingHistory && readingHistory.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Recent Reading History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {readingHistory.slice(0, 10).map((entry) => (
                  <div key={entry.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <User className="w-4 h-4 text-gray-500" />
                          <span className="font-medium">{entry.client.name}</span>
                          <span className="text-gray-500">-</span>
                          <span className="text-gray-600">{entry.client.company}</span>
                        </div>
                        <p className="text-sm font-medium text-gray-900 mb-1">{entry.report_title}</p>
                        <p className="text-sm text-gray-600 mb-2">
                          Read on {new Date(entry.read_date).toLocaleDateString()}
                        </p>
                        {entry.engagement_notes && (
                          <p className="text-sm text-gray-700 italic">"{entry.engagement_notes}"</p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteReadingHistoryMutation.mutate(entry.id)}
                        disabled={deleteReadingHistoryMutation.isPending}
                      >
                        <Trash2 className="w-4 h-4 text-gray-400" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Empty States */}
        {(!reports || reports.length === 0) && (!readingHistory || readingHistory.length === 0) && (
          <Card>
            <CardContent className="p-12 text-center">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Content Data</h3>
              <p className="text-gray-600 mb-6">
                Upload PDF reports and add client reading history to start tracking content distribution analytics.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}