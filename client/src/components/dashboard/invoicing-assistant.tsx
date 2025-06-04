import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { dashboardApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { 
  DollarSign, 
  AlertTriangle, 
  Bot, 
  Plus,
  Clock,
  Eye,
  Send,
  Edit
} from "lucide-react";
import type { Invoice } from "@/types/dashboard";

export function InvoicingAssistant() {
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [generatedEmail, setGeneratedEmail] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ["/api/invoices"],
    queryFn: () => dashboardApi.getInvoices(),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["/api/clients"],
    queryFn: () => dashboardApi.getClients(),
  });

  const generateEmailMutation = useMutation({
    mutationFn: dashboardApi.generateEmail,
    onSuccess: (data) => {
      setGeneratedEmail(data);
      setIsGenerating(false);
      toast({
        title: "Email Generated",
        description: "AI has generated a follow-up email for the selected invoice.",
      });
    },
    onError: () => {
      setIsGenerating(false);
      toast({
        title: "Generation Failed",
        description: "Failed to generate email. Please try again.",
        variant: "destructive",
      });
    },
  });

  const sendEmailMutation = useMutation({
    mutationFn: ({ templateId, recipientId }: { templateId: number; recipientId: number }) =>
      dashboardApi.sendEmail(templateId, recipientId, "client"),
    onSuccess: () => {
      toast({
        title: "Email Sent",
        description: "Follow-up email has been sent successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
    },
  });

  const handleGenerateEmail = async (invoice: Invoice) => {
    setIsGenerating(true);
    setSelectedInvoice(invoice);
    
    const client = clients.find(c => c.id === invoice.clientId);
    if (!client) {
      setIsGenerating(false);
      toast({
        title: "Error",
        description: "Client information not found.",
        variant: "destructive",
      });
      return;
    }

    try {
      await generateEmailMutation.mutateAsync({
        type: "overdue",
        recipientName: client.name,
        recipientCompany: client.company,
        context: {
          amount: invoice.amount,
          daysOverdue: invoice.daysOverdue || 0,
          invoiceNumber: `#${invoice.id}`,
        },
      });
    } catch (error) {
      console.error("Failed to generate email:", error);
    }
  };

  const handleSendEmail = async () => {
    if (!selectedInvoice || !generatedEmail) return;

    // Create email template first
    try {
      const template = await dashboardApi.createEmailTemplate({
        type: "overdue",
        subject: generatedEmail.subject,
        body: generatedEmail.body,
        recipientId: selectedInvoice.clientId,
        recipientType: "client",
        aiGenerated: true,
        sent: false,
      });

      await sendEmailMutation.mutateAsync({
        templateId: template.id,
        recipientId: selectedInvoice.clientId,
      });

      setGeneratedEmail(null);
      setSelectedInvoice(null);
    } catch (error) {
      toast({
        title: "Send Failed",
        description: "Failed to send email. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3 mb-8"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const overdueInvoices = invoices.filter(inv => inv.status === "overdue");
  const totalOutstanding = invoices
    .filter(inv => inv.status !== "paid")
    .reduce((sum, inv) => sum + inv.amount, 0);
  const aiRemindersSent = 8; // Mock data

  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case "overdue":
        return "bg-red-100 text-red-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "paid":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Invoicing Assistant</h2>
        <p className="text-gray-600">Track payments and automate follow-up communications</p>
      </div>

      {/* Invoice Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Outstanding</p>
                <p className="text-2xl font-bold text-gray-900">
                  ${totalOutstanding.toLocaleString()}
                </p>
              </div>
              <div className="p-3 bg-red-100 rounded-full">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Overdue Invoices</p>
                <p className="text-2xl font-bold text-red-600">{overdueInvoices.length}</p>
              </div>
              <div className="p-3 bg-red-100 rounded-full">
                <Clock className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">AI Reminders Sent</p>
                <p className="text-2xl font-bold text-primary">{aiRemindersSent}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <Bot className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Invoice Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Invoices</CardTitle>
          <Button className="bg-primary hover:bg-blue-700">
            <Plus className="h-4 w-4 mr-2" />
            New Invoice
          </Button>
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
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sent Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Days
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {invoices.map((invoice) => (
                  <tr key={invoice.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {invoice.clientName || "Unknown"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${invoice.amount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {invoice.sentDate}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge className={getStatusBadgeStyle(invoice.status)}>
                        {invoice.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {invoice.status === "overdue" ? (
                        <span className="text-red-600 font-medium">
                          {invoice.daysOverdue} days
                        </span>
                      ) : invoice.status === "pending" ? (
                        <span className="text-gray-500">{invoice.daysOverdue} days</span>
                      ) : (
                        <span className="text-gray-500">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      {invoice.status !== "paid" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="bg-blue-50 text-primary border-blue-200 hover:bg-blue-100"
                          onClick={() => handleGenerateEmail(invoice)}
                          disabled={isGenerating}
                        >
                          {isGenerating && selectedInvoice?.id === invoice.id ? (
                            "Generating..."
                          ) : (
                            "Draft AI Reminder"
                          )}
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" className="text-gray-600 hover:text-gray-900">
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* AI Email Preview */}
      {generatedEmail && selectedInvoice && (
        <Card>
          <CardHeader>
            <CardTitle>AI-Generated Follow-up Email</CardTitle>
            <p className="text-sm text-gray-500">
              Preview automated reminder for {selectedInvoice.clientName}
            </p>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <div className="mb-4">
                <Label className="text-sm font-medium text-gray-700 mb-2">Subject:</Label>
                <Input 
                  value={generatedEmail.subject} 
                  className="bg-white border mt-2" 
                  readOnly 
                />
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2">Email Body:</Label>
                <Textarea
                  value={generatedEmail.body}
                  className="bg-white border mt-2 min-h-64"
                  readOnly
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3">
              <Button 
                variant="outline" 
                onClick={() => setGeneratedEmail(null)}
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit Draft
              </Button>
              <Button 
                className="bg-primary hover:bg-blue-700"
                onClick={handleSendEmail}
                disabled={sendEmailMutation.isPending}
              >
                <Send className="h-4 w-4 mr-2" />
                {sendEmailMutation.isPending ? "Sending..." : "Send Email"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
