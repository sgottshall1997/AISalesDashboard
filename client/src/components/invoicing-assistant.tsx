import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  AlertTriangle, 
  Clock, 
  Bot, 
  Plus,
  Eye,
  Edit
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

interface InvoiceWithClient {
  id: number;
  client_id: number;
  invoice_number: string;
  amount: string;
  sent_date: string;
  payment_status: "pending" | "paid" | "overdue";
  last_reminder_sent?: string;
  client: {
    id: number;
    name: string;
    company: string;
    email: string;
  };
}

interface AIEmailResponse {
  subject: string;
  body: string;
  bestSendTime?: string;
}

export default function InvoicingAssistant() {
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceWithClient | null>(null);
  const [aiEmail, setAiEmail] = useState<AIEmailResponse | null>(null);
  const [isGeneratingEmail, setIsGeneratingEmail] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: invoices, isLoading } = useQuery<InvoiceWithClient[]>({
    queryKey: ["/api/invoices"],
  });

  const { data: overdueInvoices } = useQuery<InvoiceWithClient[]>({
    queryKey: ["/api/invoices/overdue"],
  });

  const generateEmailMutation = useMutation({
    mutationFn: async (invoiceId: number) => {
      const response = await apiRequest("POST", "/api/ai/generate-invoice-reminder", {
        invoiceId
      });
      return response.json();
    },
    onSuccess: (data) => {
      setAiEmail(data);
      setIsGeneratingEmail(false);
      toast({
        title: "AI Email Generated",
        description: "Follow-up email has been generated successfully.",
      });
    },
    onError: () => {
      setIsGeneratingEmail(false);
      toast({
        title: "Error",
        description: "Failed to generate AI email. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateInvoiceMutation = useMutation({
    mutationFn: async ({ invoiceId, updates }: { invoiceId: number; updates: any }) => {
      const response = await apiRequest("PATCH", `/api/invoices/${invoiceId}`, updates);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices/overdue"] });
      toast({
        title: "Invoice Updated",
        description: "Invoice status has been updated successfully.",
      });
    },
  });

  const clearAllInvoicesMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("DELETE", "/api/invoices/all", {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices/overdue"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Success",
        description: "All invoices have been removed",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to remove invoices",
        variant: "destructive",
      });
    },
  });

  const calculateDaysOverdue = (sentDate: string) => {
    const daysDiff = Math.floor((Date.now() - new Date(sentDate).getTime()) / (1000 * 60 * 60 * 24));
    return daysDiff;
  };

  const handleGenerateEmail = (invoice: InvoiceWithClient) => {
    setSelectedInvoice(invoice);
    setIsGeneratingEmail(true);
    generateEmailMutation.mutate(invoice.id);
  };

  const handleSendReminder = async (invoiceId: number) => {
    updateInvoiceMutation.mutate({
      invoiceId,
      updates: { last_reminder_sent: new Date().toISOString() }
    });
  };

  const getStatusColor = (status: string) => {
    // Extract days from status like "15 days"
    const days = parseInt(status.replace(/\D/g, '')) || 0;
    
    if (days <= 29) {
      return "bg-green-100 text-green-800"; // 0-29 days: green
    } else if (days <= 45) {
      return "bg-yellow-100 text-yellow-800"; // 30-45 days: yellow
    } else if (days <= 60) {
      return "bg-orange-100 text-orange-800"; // 46-60 days: orange
    } else {
      return "bg-red-100 text-red-800"; // 61+ days: red
    }
  };

  const outstandingAmount = invoices?.reduce((sum, inv) => 
    sum + parseFloat(inv.amount), 0
  ) || 0;

  const overdueCount = invoices?.filter(inv => {
    const days = parseInt(inv.payment_status.replace(/\D/g, '')) || 0;
    return days >= 30;
  }).length || 0;

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <div className="mb-8 flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Invoicing Assistant</h2>
            <p className="text-gray-600">Track payments and automate follow-up communications</p>
          </div>
          <Button
            variant="destructive"
            onClick={() => {
              if (confirm("Are you sure you want to delete all invoices? This action cannot be undone.")) {
                clearAllInvoicesMutation.mutate();
              }
            }}
            disabled={clearAllInvoicesMutation.isPending}
          >
            {clearAllInvoicesMutation.isPending ? "Removing..." : "Remove All Invoices"}
          </Button>
        </div>

        {/* Invoice Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Outstanding</p>
                  <p className="text-2xl font-bold text-gray-900">${outstandingAmount.toLocaleString()}</p>
                </div>
                <div className="p-3 bg-red-100 rounded-full">
                  <AlertTriangle className="h-6 w-6 text-destructive" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Overdue Invoices</p>
                  <p className="text-2xl font-bold text-destructive">{overdueCount}</p>
                </div>
                <div className="p-3 bg-red-100 rounded-full">
                  <Clock className="h-6 w-6 text-destructive" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">AI Reminders Sent</p>
                  <p className="text-2xl font-bold text-primary">8</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-full">
                  <Bot className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Invoice Table */}
        <Card className="mb-8">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Invoices</CardTitle>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Invoice
            </Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sent Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Days</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {invoices?.map((invoice) => {
                    const daysOverdue = calculateDaysOverdue(invoice.sent_date);
                    return (
                      <tr key={invoice.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {invoice.client.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          ${parseFloat(invoice.amount).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(invoice.sent_date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge className={getStatusColor(invoice.payment_status)}>
                            {invoice.payment_status}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {invoice.payment_status === "paid" ? (
                            <span className="text-gray-500">-</span>
                          ) : (
                            <span className={daysOverdue > 30 ? "text-red-600 font-medium" : "text-gray-500"}>
                              {daysOverdue} days
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                          {invoice.payment_status !== "paid" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleGenerateEmail(invoice)}
                              disabled={isGeneratingEmail}
                            >
                              <Bot className="h-4 w-4 mr-1" />
                              Draft AI Reminder
                            </Button>
                          )}
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* AI Email Preview */}
        {aiEmail && selectedInvoice && (
          <Card>
            <CardHeader>
              <CardTitle>AI-Generated Follow-up Email</CardTitle>
              <p className="text-sm text-gray-500">Preview automated reminder for {selectedInvoice.client.name}</p>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <div className="mb-4">
                  <Label className="text-sm font-medium text-gray-700 mb-2">Subject:</Label>
                  <Input value={aiEmail.subject} readOnly className="bg-white mt-2" />
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2">Email Body:</Label>
                  <Textarea 
                    value={aiEmail.body} 
                    readOnly 
                    className="bg-white mt-2 min-h-[200px]"
                  />
                </div>
              </div>
              <div className="flex justify-between items-center">
                {aiEmail.bestSendTime && (
                  <div className="flex items-center text-sm text-gray-500">
                    <Clock className="h-4 w-4 mr-2" />
                    Best send time: {aiEmail.bestSendTime}
                  </div>
                )}
                <div className="flex space-x-3">
                  <Button variant="outline">
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Draft
                  </Button>
                  <Button onClick={() => handleSendReminder(selectedInvoice.id)}>
                    Send Email
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
