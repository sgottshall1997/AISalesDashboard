import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle } from "lucide-react";
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
    handleFileSelect(file);
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
    if (!selectedFile) return;
    uploadMutation.mutate({ file: selectedFile, type: uploadType });
  };

  const sampleProspectFormat = [
    "Date,Prospect Name,Contact Name,Contact Role,Type,Key Prospect,Status,Comments,Last Contacted",
    "5/6/2023,Arlington Family Office,Meg Nailen,Executive Assistant,Pardot,Y,Active,Follow up,16-Aug"
  ];

  const sampleInvoiceFormat = [
    "Client Name,Invoice Number,Amount,Sent Date,Payment Status,Notes",
    "Tech Ventures LLC,INV-12345,15000.00,2025-05-15,overdue,Follow up required"
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">CSV Upload</h2>
          <p className="text-muted-foreground">
            Import prospects and invoice data from CSV files
          </p>
        </div>
      </div>

      <Tabs value={uploadType} onValueChange={(value) => setUploadType(value as "prospects" | "invoices")}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="prospects">Prospect Data</TabsTrigger>
          <TabsTrigger value="invoices">Invoice Data</TabsTrigger>
        </TabsList>

        <TabsContent value="prospects" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5" />
                Upload Prospect Data
              </CardTitle>
              <CardDescription>
                Import prospect information to add new leads to your pipeline
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Expected CSV Format:</Label>
                <div className="bg-muted p-3 rounded-md font-mono text-sm">
                  {sampleProspectFormat.map((line, i) => (
                    <div key={i} className={i === 0 ? "font-semibold" : ""}>
                      {line}
                    </div>
                  ))}
                </div>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Prospects will be imported as leads. Existing prospects with the same email will be updated.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invoices" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5" />
                Upload Invoice Data
              </CardTitle>
              <CardDescription>
                Import invoice information to track payments and outstanding amounts
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Expected CSV Format:</Label>
                <div className="bg-muted p-3 rounded-md font-mono text-sm">
                  {sampleInvoiceFormat.map((line, i) => (
                    <div key={i} className={i === 0 ? "font-semibold" : ""}>
                      {line}
                    </div>
                  ))}
                </div>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Invoices will be linked to existing clients. If a client doesn't exist, they will be created automatically.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle>Upload File</CardTitle>
          <CardDescription>
            Select a CSV file to upload or drag and drop it below
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragOver
                ? "border-primary bg-primary/10"
                : "border-muted-foreground/25 hover:border-primary/50"
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <div className="space-y-2">
              <p className="text-lg font-medium">
                {selectedFile ? selectedFile.name : "Drop your CSV file here"}
              </p>
              <p className="text-muted-foreground">
                or{" "}
                <label className="text-primary cursor-pointer hover:underline">
                  browse files
                  <input
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileSelect(file);
                    }}
                  />
                </label>
              </p>
            </div>
          </div>

          {selectedFile && (
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4" />
                <span className="font-medium">{selectedFile.name}</span>
                <span className="text-muted-foreground">
                  ({(selectedFile.size / 1024).toFixed(1)} KB)
                </span>
              </div>
              <Button
                onClick={() => setSelectedFile(null)}
                variant="outline"
                size="sm"
              >
                Remove
              </Button>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              onClick={handleUpload}
              disabled={!selectedFile || uploadMutation.isPending}
              className="flex-1"
            >
              {uploadMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload {uploadType === "prospects" ? "Prospects" : "Invoices"}
                </>
              )}
            </Button>
          </div>

          {uploadMutation.isPending && (
            <div className="space-y-2">
              <Progress value={undefined} className="w-full" />
              <p className="text-sm text-muted-foreground text-center">
                Processing CSV file...
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {uploadResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {uploadResult.success ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <AlertCircle className="h-5 w-5 text-orange-500" />
              )}
              Upload Results
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {uploadResult.processed}
                </div>
                <div className="text-sm text-muted-foreground">Processed</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-orange-600">
                  {uploadResult.duplicates || 0}
                </div>
                <div className="text-sm text-muted-foreground">Duplicates</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-600">
                  {uploadResult.errors.length}
                </div>
                <div className="text-sm text-muted-foreground">Errors</div>
              </div>
            </div>

            {uploadResult.errors.length > 0 && (
              <div className="space-y-2">
                <Label>Errors:</Label>
                <div className="bg-red-50 dark:bg-red-950/20 p-3 rounded-md max-h-32 overflow-y-auto">
                  {uploadResult.errors.map((error, i) => (
                    <div key={i} className="text-sm text-red-700 dark:text-red-400">
                      {error}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}