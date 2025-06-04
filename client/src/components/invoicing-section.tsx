import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/queryClient";
import { DollarSign, Clock, Bot, AlertTriangle, Plus, Edit, Send } from "lucide-react";
import { formatEmailBody } from "@/lib/openai";

export default function InvoicingSection() {
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [emailPreview, setEmailPreview] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedSubject, setEditedSubject] = useState("");
  const [editedBody, setEditedBody] = useState("");

  const queryClient = useQueryClient();

  const { data: invoices, isLoading } = useQuery({
    queryKey: ["/api/invoices"],
  });

  const generateEmailMutation = useMutation({
    mutationFn: async (invoiceData: any) => {
      const response = await apiRequest("POST", "/api/ai/generate-email", {
        type: "invoice_reminder",
        clientId: invoiceData.clientId,
        context: {
          amount: invoiceData.amount,
          daysOverdue: invoiceData.daysSince,
          lastContact: "recent",
        },
      });
      return response.json();
    },
    onSuccess: (data) => {
      setEmailPreview(data);
      setEditedSubject(data.subject);
      setEditedBody(data.body);
      setIsEditing(false);
    },
  });

  const handleGenerateEmail = (invoice: any) => {
    setSelectedInvoice(invoice);
    generateEmailMutation.mutate(invoice);
  };

  const handleSaveEdit = () => {
    if (emailPreview) {
      setEmailPreview({
        ...emailPreview,
        subject: editedSubject,
        body: editedBody,
      });
      setIsEditing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return <Badge className="bg-green-100 text-green-800">Paid</Badge>;
      case "overdue":
        return <Badge className="bg-red-100 text-red-800">Overdue</Badge>;
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
          <div className="animate-pulse">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-white h-32 rounded-lg shadow" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const totalOutstanding = invoices?.filter((inv: any) => inv.status !== "paid")
    .reduce((sum: number, inv: any) => sum + parseFloat(inv.amount), 0) || 0;
  const overdueCount = invoices?.filter((inv: any) => inv.status === "overdue").length || 0;
  const aiReminders = 8; // This would come from AI emails sent

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
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
                  <p className="text-2xl font-bold text-gray-900">${totalOutstanding.toLocaleString()}</p>
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
                  <p className="text-2xl font-bold text-red-600">{overdueCount}</p>
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
                  <p className="text-2xl font-bold text-blue-600">{aiReminders}</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-full">
                  <Bot className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Invoice Table */}
        <Card className="mb-8">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Invoices</CardTitle>
            <Button className="bg-blue-600 hover:bg-blue-700">
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
                  {invoices?.map((invoice: any) => (
                    <tr key={invoice.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {invoice.clientName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ${parseFloat(invoice.amount).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(invoice.sentDate).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(invoice.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {invoice.status === "paid" ? "-" : (
                          <span className={invoice.status === "overdue" ? "text-red-600 font-medium" : ""}>
                            {invoice.daysSince} days
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        {invoice.status !== "paid" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100"
                            onClick={() => handleGenerateEmail(invoice)}
                            disabled={generateEmailMutation.isPending}
                          >
                            {generateEmailMutation.isPending ? "Generating..." : "Draft AI Reminder"}
                          </Button>
                        )}
                        <Button size="sm" variant="ghost">
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
        {emailPreview && (
          <Card>
            <CardHeader>
              <CardTitle>AI-Generated Follow-up Email</CardTitle>
              <p className="text-sm text-gray-500">
                Preview automated reminder for {selectedInvoice?.clientName}
              </p>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <div className="mb-4">
                  <Label className="block text-sm font-medium text-gray-700 mb-2">Subject:</Label>
                  {isEditing ? (
                    <Input
                      value={editedSubject}
                      onChange={(e) => setEditedSubject(e.target.value)}
                      className="w-full"
                    />
                  ) : (
                    <div className="bg-white border rounded px-3 py-2 text-sm">
                      {emailPreview.subject}
                    </div>
                  )}
                </div>
                <div>
                  <Label className="block text-sm font-medium text-gray-700 mb-2">Email Body:</Label>
                  {isEditing ? (
                    <Textarea
                      value={editedBody}
                      onChange={(e) => setEditedBody(e.target.value)}
                      className="w-full h-64"
                    />
                  ) : (
                    <div className="bg-white border rounded p-4 text-sm leading-relaxed whitespace-pre-wrap">
                      {formatEmailBody(emailPreview.body)}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex justify-end space-x-3">
                {isEditing ? (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => setIsEditing(false)}
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleSaveEdit}>
                      Save Changes
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => setIsEditing(true)}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Draft
                    </Button>
                    <Button className="bg-blue-600 hover:bg-blue-700">
                      <Send className="h-4 w-4 mr-2" />
                      Send Email
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
