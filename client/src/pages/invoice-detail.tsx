import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  ArrowLeft, 
  Edit, 
  Save, 
  X, 
  Plus, 
  Bot,
  Mail,
  Clock,
  DollarSign,
  Calendar,
  Building,
  Trash2,
  StickyNote
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
  payment_status: string;
  last_reminder_sent?: string;
  client: {
    id: number;
    name: string;
    company: string;
    email: string;
  };
}

interface EmailHistory {
  id: number;
  invoice_id: number;
  from_email: string;
  to_email: string;
  subject: string;
  content: string;
  sent_date: string;
  email_type: "incoming" | "outgoing";
}

interface AIFollowUpSuggestion {
  subject: string;
  body: string;
  reason: string;
  priority: "low" | "medium" | "high";
}

export default function InvoiceDetail() {
  const [, params] = useRoute("/invoice/:id");
  const invoiceId = parseInt(params?.id || "0");
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<InvoiceWithClient>>({});
  const [newEmail, setNewEmail] = useState({
    subject: "",
    content: "",
    email_type: "incoming" as "incoming" | "outgoing"
  });
  const [showAddEmail, setShowAddEmail] = useState(false);
  const [notes, setNotes] = useState("");
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: invoice, isLoading } = useQuery<InvoiceWithClient>({
    queryKey: [`/api/invoices/${invoiceId}`],
    enabled: !!invoiceId,
  });

  const { data: emailHistory } = useQuery<EmailHistory[]>({
    queryKey: [`/api/invoices/${invoiceId}/emails`],
    enabled: !!invoiceId,
  });

  const { data: aiSuggestion } = useQuery<AIFollowUpSuggestion>({
    queryKey: [`/api/invoices/${invoiceId}/ai-suggestion`],
    enabled: !!invoiceId,
  });

  // Update notes when invoice data loads
  useEffect(() => {
    if (invoice) {
      setNotes(invoice.notes || "");
    }
  }, [invoice]);

  const updateInvoiceMutation = useMutation({
    mutationFn: async (updates: Partial<InvoiceWithClient>) => {
      const response = await apiRequest("PATCH", `/api/invoices/${invoiceId}`, updates);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
      setIsEditing(false);
      toast({
        title: "Invoice Updated",
        description: "Invoice details have been updated successfully.",
      });
    },
  });

  const addEmailMutation = useMutation({
    mutationFn: async (emailData: any) => {
      const response = await apiRequest("POST", `/api/invoices/${invoiceId}/emails`, emailData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/invoices', invoiceId, 'emails'] });
      queryClient.invalidateQueries({ queryKey: ['/api/invoices', invoiceId, 'ai-suggestion'] });
      setNewEmail({ subject: "", content: "", email_type: "incoming" });
      setShowAddEmail(false);
      toast({
        title: "Email Added",
        description: "Email history has been updated.",
      });
    },
  });

  const generateAISuggestionMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/invoices/${invoiceId}/generate-followup`, {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/invoices', invoiceId, 'ai-suggestion'] });
      toast({
        title: "AI Suggestion Generated",
        description: "New follow-up suggestion has been created.",
      });
    },
  });

  const deleteInvoiceMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("DELETE", `/api/invoices/${invoiceId}`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Invoice deleted",
        description: "The invoice has been deleted successfully.",
      });
      // Navigate back to invoices list
      window.location.href = "/";
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete invoice.",
        variant: "destructive",
      });
    },
  });

  const saveNotesMutation = useMutation({
    mutationFn: async (notesText: string) => {
      const response = await apiRequest("PATCH", `/api/invoices/${invoiceId}`, { notes: notesText });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/invoices/${invoiceId}`] });
      setIsEditingNotes(false);
      toast({
        title: "Notes saved",
        description: "Your notes have been saved successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save notes.",
        variant: "destructive",
      });
    },
  });

  const getStatusColor = (status: string) => {
    const days = parseInt(status.replace(/\D/g, '')) || 0;
    
    if (days <= 29) {
      return "bg-green-100 text-green-800";
    } else if (days <= 45) {
      return "bg-yellow-100 text-yellow-800";
    } else if (days <= 60) {
      return "bg-orange-100 text-orange-800";
    } else {
      return "bg-red-100 text-red-800";
    }
  };

  const handleSave = () => {
    updateInvoiceMutation.mutate(editData);
  };

  const handleAddEmail = () => {
    if (!newEmail.subject || !newEmail.content) {
      toast({
        title: "Missing Information",
        description: "Please fill in both subject and content.",
        variant: "destructive",
      });
      return;
    }
    addEmailMutation.mutate(newEmail);
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-64">Loading invoice details...</div>;
  }

  if (!invoice || !invoice.client) {
    return <div className="flex justify-center items-center h-64">Invoice not found</div>;
  }

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="mb-6">
        <Button variant="ghost" onClick={() => window.history.back()} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Invoices
        </Button>
        
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold mb-2">{invoice.invoice_number}</h1>
            <p className="text-gray-600">{invoice.client.name}</p>
          </div>
          
          <div className="flex gap-2">
            {!isEditing ? (
              <Button onClick={() => {
                setIsEditing(true);
                setEditData(invoice);
              }}>
                <Edit className="w-4 h-4 mr-2" />
                Edit Invoice
              </Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => setIsEditing(false)}>
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={updateInvoiceMutation.isPending}>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Invoice Details */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Invoice Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isEditing ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Invoice Number</Label>
                      <Input
                        value={editData.invoice_number || ""}
                        onChange={(e) => setEditData({ ...editData, invoice_number: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Amount</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={editData.amount || ""}
                        onChange={(e) => setEditData({ ...editData, amount: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Payment Status</Label>
                      <Input
                        value={editData.payment_status || ""}
                        onChange={(e) => setEditData({ ...editData, payment_status: e.target.value })}
                        placeholder="e.g., 15 days"
                      />
                    </div>
                    <div>
                      <Label>Sent Date</Label>
                      <Input
                        type="date"
                        value={editData.sent_date?.split('T')[0] || ""}
                        onChange={(e) => setEditData({ ...editData, sent_date: e.target.value })}
                      />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Amount</p>
                      <p className="text-2xl font-bold">${parseFloat(invoice.amount).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Status</p>
                      <Badge className={getStatusColor(invoice.payment_status)}>
                        {invoice.payment_status}
                      </Badge>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Sent Date</p>
                      <p className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        {new Date(invoice.sent_date).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Client</p>
                      <p className="flex items-center gap-2">
                        <Building className="w-4 h-4" />
                        {invoice.client.company}
                      </p>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Email History */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center gap-2">
                  <Mail className="w-5 h-5" />
                  Email History
                </CardTitle>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowAddEmail(true)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Email
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {showAddEmail && (
                <div className="mb-6 p-4 border rounded-lg bg-gray-50">
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <Button
                        variant={newEmail.email_type === "incoming" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setNewEmail({ ...newEmail, email_type: "incoming" })}
                      >
                        Incoming
                      </Button>
                      <Button
                        variant={newEmail.email_type === "outgoing" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setNewEmail({ ...newEmail, email_type: "outgoing" })}
                      >
                        Outgoing
                      </Button>
                    </div>
                    <Input
                      placeholder="Email subject"
                      value={newEmail.subject}
                      onChange={(e) => setNewEmail({ ...newEmail, subject: e.target.value })}
                    />
                    <Textarea
                      placeholder="Email content"
                      value={newEmail.content}
                      onChange={(e) => setNewEmail({ ...newEmail, content: e.target.value })}
                      rows={3}
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleAddEmail} disabled={addEmailMutation.isPending}>
                        Add Email
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setShowAddEmail(false)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                {emailHistory?.length ? (
                  emailHistory.map((email) => (
                    <div key={email.id} className="border rounded-lg p-3">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant={email.email_type === "incoming" ? "default" : "secondary"}>
                            {email.email_type === "incoming" ? "↓ Incoming" : "↑ Outgoing"}
                          </Badge>
                          <span className="font-medium">{email.subject}</span>
                        </div>
                        <span className="text-sm text-gray-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDistanceToNow(new Date(email.sent_date))} ago
                        </span>
                      </div>
                      <p className="text-sm text-gray-700">{email.content}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-center py-4">No email history recorded</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* AI Follow-up Suggestions */}
        <div>
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center gap-2">
                  <Bot className="w-5 h-5" />
                  AI Follow-up
                </CardTitle>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => generateAISuggestionMutation.mutate()}
                  disabled={generateAISuggestionMutation.isPending}
                >
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {aiSuggestion ? (
                <div className="space-y-4">
                  <div>
                    <Badge variant={
                      aiSuggestion.priority === "high" ? "destructive" :
                      aiSuggestion.priority === "medium" ? "default" : "secondary"
                    }>
                      {aiSuggestion.priority} priority
                    </Badge>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">Reason</p>
                    <p className="text-sm">{aiSuggestion.reason}</p>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">Subject</p>
                    <p className="text-sm font-medium">{aiSuggestion.subject}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">Suggested Email</p>
                    <div className="bg-gray-50 p-3 rounded text-sm whitespace-pre-wrap">
                      {aiSuggestion.body}
                    </div>
                  </div>
                  
                  <Button className="w-full" size="sm">
                    Use This Template
                  </Button>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-gray-500 mb-3">No AI suggestions available</p>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => generateAISuggestionMutation.mutate()}
                    disabled={generateAISuggestionMutation.isPending}
                  >
                    Generate Suggestion
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}