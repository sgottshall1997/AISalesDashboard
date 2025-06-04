import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle, Trash2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface UploadResult {
  success: boolean;
  processed: number;
  errors: string[];
  duplicates: number;
}

export default function CsvUpload() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadType, setUploadType] = useState<"prospects" | "invoices">("prospects");
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const uploadMutation = useMutation({
    mutationFn: async ({ file, type }: { file: File; type: string }) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', type);
      
      const response = await fetch('/api/upload/csv', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Upload failed');
      }
      
      return response.json();
    },
    onSuccess: (result: UploadResult) => {
      setUploadResult(result);
      if (result.success) {
        toast({
          title: "Upload successful",
          description: `Processed ${result.processed} records successfully`,
        });
        // Invalidate relevant queries
        queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
        queryClient.invalidateQueries({ queryKey: ['/api/leads'] });
        queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
        queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      } else {
        toast({
          title: "Upload completed with errors",
          description: `${result.processed} records processed, ${result.errors.length} errors`,
          variant: "destructive",
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const clearAllMutation = useMutation({
    mutationFn: async ({ type }: { type: string }) => {
      const response = await apiRequest("DELETE", `/api/${type}/all`, {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
      queryClient.invalidateQueries({ queryKey: ['/api/leads'] });
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      toast({
        title: "Success",
        description: "All records have been cleared",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to clear records",
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = (file: File) => {
    if (file && file.type === 'text/csv') {
      setSelectedFile(file);
      setUploadResult(null);
    } else {
      toast({
        title: "Invalid file type",
        description: "Please select a CSV file",
        variant: "destructive",
      });
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleUpload = () => {
    if (selectedFile) {
      uploadMutation.mutate({ file: selectedFile, type: uploadType });
    }
  };

  const sampleProspectFormat = [
    "Name,Email,Company,Phone,Stage,Interest Tags",
    "John Doe,john@example.com,Acme Corp,(555) 123-4567,qualified,technology;fintech",
    "Jane Smith,jane@example.com,Tech Solutions,(555) 987-6543,proposal,healthcare;AI"
  ];

  const sampleInvoiceFormat = [
    "Opportunity Name,Account Name,Invoice Amount,Days Overdue,A/R And Invoicing Note",
    "Q4 Research Project,Acme Corp,5000.00,15,Follow up required",
    "Annual Subscription,Tech Solutions,7500.00,0,Payment received"
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">CSV Data Import</h2>
          <p className="text-gray-600">Upload prospect and invoice data from CSV files</p>
        </div>
        
        {/* Bulk Delete Options */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (confirm("Are you sure you want to delete all clients? This action cannot be undone.")) {
                clearAllMutation.mutate({ type: 'clients' });
              }
            }}
            disabled={clearAllMutation.isPending}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Clear Clients
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (confirm("Are you sure you want to delete all leads? This action cannot be undone.")) {
                clearAllMutation.mutate({ type: 'leads' });
              }
            }}
            disabled={clearAllMutation.isPending}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Clear Leads
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (confirm("Are you sure you want to delete all invoices? This action cannot be undone.")) {
                clearAllMutation.mutate({ type: 'invoices' });
              }
            }}
            disabled={clearAllMutation.isPending}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Clear Invoices
          </Button>
        </div>
      </div>

      <Tabs defaultValue="upload" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="upload">Upload CSV</TabsTrigger>
          <TabsTrigger value="format">CSV Format Guide</TabsTrigger>
        </TabsList>
        
        <TabsContent value="format" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5" />
                  Prospects CSV Format
                </CardTitle>
                <CardDescription>
                  Required columns for prospect data import
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-50 p-4 rounded-lg font-mono text-sm">
                  {sampleProspectFormat.map((line, i) => (
                    <div key={i} className={i === 0 ? "font-bold text-blue-600" : ""}>
                      {line}
                    </div>
                  ))}
                </div>
                <div className="mt-4 space-y-2 text-sm">
                  <p><strong>Name:</strong> Full name of the prospect</p>
                  <p><strong>Email:</strong> Email address (required for deduplication)</p>
                  <p><strong>Company:</strong> Company name</p>
                  <p><strong>Phone:</strong> Contact phone number</p>
                  <p><strong>Stage:</strong> Pipeline stage (new, qualified, proposal, etc.)</p>
                  <p><strong>Interest Tags:</strong> Semicolon-separated tags</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5" />
                  Invoices CSV Format
                </CardTitle>
                <CardDescription>
                  Required columns for invoice data import
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-50 p-4 rounded-lg font-mono text-sm">
                  {sampleInvoiceFormat.map((line, i) => (
                    <div key={i} className={i === 0 ? "font-bold text-blue-600" : ""}>
                      {line}
                    </div>
                  ))}
                </div>
                <div className="mt-4 space-y-2 text-sm">
                  <p><strong>Opportunity Name:</strong> Name of the opportunity/project (used as invoice identifier)</p>
                  <p><strong>Account Name:</strong> Name of the client company</p>
                  <p><strong>Invoice Amount:</strong> Invoice amount (numbers only, no currency symbols)</p>
                  <p><strong>Days Overdue:</strong> Number of days past due (0 for current invoices)</p>
                  <p><strong>A/R And Invoicing Note:</strong> Additional notes about the invoice</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="upload" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Upload CSV File</CardTitle>
              <CardDescription>
                Select the type of data you're uploading and choose your CSV file
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Data Type</Label>
                <Select value={uploadType} onValueChange={(value: "prospects" | "invoices") => setUploadType(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select data type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="prospects">Prospects/Leads</SelectItem>
                    <SelectItem value="invoices">Invoices</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  isDragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-300'
                }`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
              >
                <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <p className="text-lg font-medium text-gray-900 mb-2">
                  Drop your CSV file here, or click to browse
                </p>
                <p className="text-sm text-gray-600 mb-4">
                  Files should be in CSV format and under 10MB
                </p>
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileSelect(file);
                  }}
                  className="hidden"
                  id="csv-upload"
                />
                <label htmlFor="csv-upload">
                  <Button variant="outline" className="cursor-pointer">
                    Choose File
                  </Button>
                </label>
              </div>

              {selectedFile && (
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="w-5 h-5 text-green-600" />
                    <span className="font-medium">{selectedFile.name}</span>
                    <span className="text-sm text-gray-500">
                      ({(selectedFile.size / 1024).toFixed(1)} KB)
                    </span>
                  </div>
                  <Button
                    onClick={handleUpload}
                    disabled={uploadMutation.isPending}
                  >
                    {uploadMutation.isPending ? "Uploading..." : "Upload"}
                  </Button>
                </div>
              )}

              {uploadMutation.isPending && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Processing...</span>
                  </div>
                  <Progress value={75} className="w-full" />
                </div>
              )}
            </CardContent>
          </Card>

          {uploadResult && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {uploadResult.success ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-600" />
                  )}
                  Upload Results
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {uploadResult.processed}
                    </div>
                    <div className="text-sm text-green-700">Records Processed</div>
                  </div>
                  <div className="text-center p-4 bg-red-50 rounded-lg">
                    <div className="text-2xl font-bold text-red-600">
                      {uploadResult.errors.length}
                    </div>
                    <div className="text-sm text-red-700">Errors</div>
                  </div>
                </div>

                {uploadResult.errors.length > 0 && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <div className="space-y-1">
                        <p className="font-medium">Errors encountered:</p>
                        {uploadResult.errors.slice(0, 5).map((error, i) => (
                          <p key={i} className="text-sm">• {error}</p>
                        ))}
                        {uploadResult.errors.length > 5 && (
                          <p className="text-sm">... and {uploadResult.errors.length - 5} more</p>
                        )}
                      </div>
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}