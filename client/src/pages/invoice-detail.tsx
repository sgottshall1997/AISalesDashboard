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
  due_date: string;
  payment_status: string;
  last_reminder_sent?: string;
  notes?: string;
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
  const [conversationText, setConversationText] = useState("");
  const [showConversationParser, setShowConversationParser] = useState(false);
  const [notes, setNotes] = useState("");
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [emailSummary, setEmailSummary] = useState<string | null>(null);
  
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
      // Invalidate both the specific invoice and the invoice list
      queryClient.invalidateQueries({ queryKey: [`/api/invoices/${invoiceId}`] });
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

  const generateSummaryMutation = useMutation({
    mutationFn: async (conversationText: string) => {
      const response = await apiRequest("POST", `/api/invoices/${invoiceId}/summary`, { conversation: conversationText });
      return response.json();
    },
    onSuccess: (data) => {
      setEmailSummary(data.summary);
      toast({
        title: "Summary Generated",
        description: "AI summary of the conversation has been created.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to generate conversation summary.",
        variant: "destructive",
      });
    },
  });

  const deleteEmailMutation = useMutation({
    mutationFn: async (emailId: number) => {
      const response = await apiRequest("DELETE", `/api/invoices/${invoiceId}/emails/${emailId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/invoices/${invoiceId}/emails`] });
      queryClient.invalidateQueries({ queryKey: [`/api/invoices/${invoiceId}/ai-suggestion`] });
      toast({
        title: "Email Deleted",
        description: "Email removed from history.",
      });
    },
  });

  const deleteAllEmailsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("DELETE", `/api/invoices/${invoiceId}/emails`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/invoices/${invoiceId}/emails`] });
      queryClient.invalidateQueries({ queryKey: [`/api/invoices/${invoiceId}/ai-suggestion`] });
      setEmailSummary("");
      toast({
        title: "All Emails Deleted",
        description: "Email history cleared.",
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

  const calculateDaysOverdue = (dueDate: string) => {
    const currentDate = new Date();
    const due = new Date(dueDate);
    const timeDiff = currentDate.getTime() - due.getTime();
    const days = Math.floor(timeDiff / (1000 * 3600 * 24));
    return Math.max(0, days);
  };

  const getStatusColor = (daysOverdue: number) => {
    if (daysOverdue <= 29) {
      return "bg-green-100 text-green-800";
    } else if (daysOverdue <= 45) {
      return "bg-yellow-100 text-yellow-800";
    } else if (daysOverdue <= 60) {
      return "bg-orange-100 text-orange-800";
    } else {
      return "bg-red-100 text-red-800";
    }
  };

  const handleSave = () => {
    updateInvoiceMutation.mutate(editData);
  };

  const parseEmailConversation = (conversation: string) => {
    const lines = conversation.split('\n');
    const emails = [];
    let currentEmail = null;
    let isInSignature = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Skip empty lines
      if (!line) continue;
      
      // Detect email signature separators
      if (line.includes('_________________________') || line.match(/^[-_=]{5,}$/)) {
        isInSignature = true;
        continue;
      }
      
      // Detect "From:" headers (start of new email)
      if (line.startsWith('From:') && line.includes('<') && line.includes('>')) {
        if (currentEmail) {
          emails.push(currentEmail);
        }
        
        const emailMatch = line.match(/From:\s*(.+?)\s*<(.+?)>/);
        const senderName = emailMatch ? emailMatch[1].trim() : 'Unknown';
        const senderEmail = emailMatch ? emailMatch[2].trim() : '';
        
        currentEmail = {
          from_email: senderEmail,
          to_email: invoice?.client?.email || '',
          subject: 'Email Conversation',
          content: '',
          email_type: senderEmail.includes(invoice?.client?.email || '') ? 'incoming' : 'outgoing',
          senderName
        };
        isInSignature = false;
        continue;
      }
      
      // Detect "Sent:" timestamp lines
      if (line.startsWith('Sent:')) {
        continue;
      }
      
      // Detect "Subject:" lines
      if (line.startsWith('Subject:')) {
        if (currentEmail) {
          currentEmail.subject = line.replace('Subject:', '').replace('[External]', '').trim();
        }
        continue;
      }
      
      // Detect "To:" lines
      if (line.startsWith('To:')) {
        if (currentEmail) {
          const toMatch = line.match(/To:\s*(.+?)\s*<(.+?)>/);
          if (toMatch) {
            currentEmail.to_email = toMatch[2].trim();
          }
        }
        continue;
      }
      
      // Skip signature content
      if (isInSignature) {
        if (line.includes('Tel:') || line.includes('Email:') || line.includes('NOTICE:') || line.includes('Fax:')) {
          continue;
        }
      }
      
      // Add content to current email
      if (currentEmail && !isInSignature) {
        if (currentEmail.content) {
          currentEmail.content += '\n' + line;
        } else {
          currentEmail.content = line;
        }
      } else if (!currentEmail) {
        // First email in conversation (no "From:" header)
        if (!currentEmail) {
          currentEmail = {
            from_email: invoice?.client?.email || '',
            to_email: 'spencer@13d.com',
            subject: 'Email Conversation',
            content: line,
            email_type: 'incoming',
            senderName: invoice?.client?.name || 'Client'
          };
        }
      }
    }
    
    // Add the last email
    if (currentEmail) {
      emails.push(currentEmail);
    }
    
    return emails.reverse(); // Show oldest first
  };

  const handleParseConversation = () => {
    if (!conversationText.trim()) {
      toast({
        title: "Missing Conversation",
        description: "Please paste the email conversation to parse.",
        variant: "destructive",
      });
      return;
    }
    
    const parsedEmails = parseEmailConversation(conversationText);
    
    if (parsedEmails.length === 0) {
      toast({
        title: "No Emails Found",
        description: "Could not parse any emails from the conversation.",
        variant: "destructive",
      });
      return;
    }
    
    // Add all parsed emails
    parsedEmails.forEach((email, index) => {
      setTimeout(() => {
        addEmailMutation.mutate({
          subject: email.subject,
          content: email.content,
          email_type: email.email_type,
          from_email: email.from_email || '',
          to_email: email.to_email || ''
        });
      }, index * 500); // Stagger the requests
    });
    
    // Generate AI summary after a delay to ensure all emails are added
    setTimeout(() => {
      generateSummaryMutation.mutate(conversationText);
    }, parsedEmails.length * 500 + 1000);
    
    setConversationText('');
    setShowConversationParser(false);
    
    toast({
      title: "Conversation Parsed",
      description: `Added ${parsedEmails.length} emails and generating AI summary.`,
    });
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
              <>
                <Button 
                  variant="destructive" 
                  onClick={() => {
                    if (confirm('Are you sure you want to delete this invoice? This action cannot be undone.')) {
                      deleteInvoiceMutation.mutate();
                    }
                  }}
                  disabled={deleteInvoiceMutation.isPending}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
                <Button onClick={() => {
                  setIsEditing(true);
                  // Only include editable fields, exclude notes and other sensitive data
                  setEditData({
                    invoice_number: invoice.invoice_number,
                    amount: invoice.amount,
                    payment_status: invoice.payment_status,
                    due_date: invoice.due_date,
                    last_reminder_sent: invoice.last_reminder_sent
                  });
                }}>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Invoice
                </Button>
              </>
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
                      <Label>Due Date</Label>
                      <Input
                        type="date"
                        value={editData.due_date?.split('T')[0] || ""}
                        onChange={(e) => setEditData({ ...editData, due_date: e.target.value })}
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
                      <Badge className={getStatusColor(calculateDaysOverdue(invoice.due_date))}>
                        {calculateDaysOverdue(invoice.due_date)} days overdue
                      </Badge>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Due Date</p>
                      <p className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        {new Date(invoice.due_date).toLocaleDateString()}
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

          {/* Quick Notes */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center gap-2">
                  <StickyNote className="w-5 h-5" />
                  Quick Notes
                </CardTitle>
                {!isEditingNotes ? (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setIsEditingNotes(true)}
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit Notes
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        setIsEditingNotes(false);
                        setNotes(invoice?.notes || "");
                      }}
                    >
                      <X className="w-4 h-4 mr-2" />
                      Cancel
                    </Button>
                    <Button 
                      size="sm"
                      onClick={() => saveNotesMutation.mutate(notes)}
                      disabled={saveNotesMutation.isPending}
                    >
                      <Save className="w-4 h-4 mr-2" />
                      Save
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {!isEditingNotes ? (
                <div className="min-h-[100px] p-4 bg-gray-50 rounded-lg">
                  {notes ? (
                    <p className="whitespace-pre-wrap text-gray-700">{notes}</p>
                  ) : (
                    <p className="text-gray-500 italic">No notes added yet. Click "Edit Notes" to add some.</p>
                  )}
                </div>
              ) : (
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add your notes about this invoice..."
                  rows={6}
                  className="w-full"
                />
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
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setShowConversationParser(true)}
                  >
                    <Bot className="w-4 h-4 mr-2" />
                    Parse Conversation
                  </Button>
                  {emailHistory && emailHistory.length > 0 && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => deleteAllEmailsMutation.mutate()}
                      disabled={deleteAllEmailsMutation.isPending}
                      className="text-red-600 hover:text-red-700 border-red-200"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete All
                    </Button>
                  )}
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setShowAddEmail(true)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Email
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {showConversationParser && (
                <div className="mb-6 p-4 border rounded-lg bg-blue-50">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 mb-3">
                      <Bot className="w-5 h-5 text-blue-600" />
                      <h4 className="font-medium text-blue-900">Parse Email Conversation</h4>
                    </div>
                    <p className="text-sm text-blue-700 mb-3">
                      Paste a full email conversation below. The system will automatically detect individual messages, 
                      extract sender information, and add them to the email history.
                    </p>
                    <Textarea
                      placeholder="Paste the full email conversation here..."
                      value={conversationText}
                      onChange={(e) => setConversationText(e.target.value)}
                      rows={10}
                      className="w-full"
                    />
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        onClick={handleParseConversation} 
                        disabled={addEmailMutation.isPending}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <Bot className="w-4 h-4 mr-2" />
                        Parse Conversation
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setShowConversationParser(false)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              )}

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

              {emailHistory && emailHistory.length > 0 && (
                <div className="mb-6 p-4 border rounded-lg bg-blue-50">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Bot className="w-5 h-5 text-blue-600" />
                      <h4 className="font-medium text-blue-900">AI Conversation Analysis</h4>
                    </div>
                    <Button 
                      size="sm" 
                      onClick={() => {
                        const conversationText = emailHistory?.map(email => 
                          `${email.email_type === 'incoming' ? 'From' : 'To'}: ${email.from_email}\nSubject: ${email.subject}\n${email.content}`
                        ).join('\n\n---\n\n') || '';
                        generateSummaryMutation.mutate(conversationText);
                      }}
                      disabled={generateSummaryMutation.isPending}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {generateSummaryMutation.isPending ? "Analyzing..." : "Generate Summary"}
                    </Button>
                  </div>
                  {emailSummary && (
                    <div className="text-sm text-blue-800 whitespace-pre-wrap">
                      {emailSummary}
                    </div>
                  )}
                  {!emailSummary && !generateSummaryMutation.isPending && (
                    <div className="text-sm text-blue-600">
                      Click "Generate Summary" to get an AI analysis of this email conversation.
                    </div>
                  )}
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
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-500 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDistanceToNow(new Date(email.sent_date))} ago
                          </span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => deleteEmailMutation.mutate(email.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
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