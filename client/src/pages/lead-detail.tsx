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
  Building,
  User,
  Trash2,
  StickyNote,
  FileText,
  Lightbulb
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

interface Lead {
  id: number;
  name: string;
  email: string;
  company: string;
  stage: string;
  last_contact?: string;
  next_step?: string;
  notes?: string;
  interest_tags: string[];
  created_at: string;
}

interface LeadEmailHistory {
  id: number;
  lead_id: number;
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
  relevantReports: any[];
  suggestedReports: {
    title: string;
    summary: string;
    relevance: string;
  }[];
}

interface ContentReport {
  id: number;
  title: string;
  type: string;
  published_date: string;
  tags: string[];
  content_summary?: string;
}

export default function LeadDetail() {
  const [, params] = useRoute("/lead/:id");
  const leadId = parseInt(params?.id || "0");
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<Lead>>({});
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
  const [aiEmailSuggestion, setAiEmailSuggestion] = useState<string | null>(null);
  const [isGeneratingEmail, setIsGeneratingEmail] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: lead, isLoading } = useQuery<Lead>({
    queryKey: [`/api/leads/${leadId}`],
    enabled: !!leadId,
  });

  const { data: emailHistory } = useQuery<LeadEmailHistory[]>({
    queryKey: [`/api/leads/${leadId}/emails`],
    enabled: !!leadId,
  });

  const { data: aiSuggestion } = useQuery<AIFollowUpSuggestion>({
    queryKey: [`/api/leads/${leadId}/ai-suggestion`],
    enabled: !!leadId,
  });

  const { data: contentReports } = useQuery<ContentReport[]>({
    queryKey: ["/api/content-reports"],
  });

  // Update notes when lead data loads
  useEffect(() => {
    if (lead) {
      setNotes(lead.notes || "");
    }
  }, [lead]);

  const updateLeadMutation = useMutation({
    mutationFn: async (updates: Partial<Lead>) => {
      const response = await apiRequest("PATCH", `/api/leads/${leadId}`, updates);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/leads/${leadId}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/leads'] });
      setIsEditing(false);
      toast({
        title: "Lead Updated",
        description: "Lead details have been updated successfully.",
      });
    },
  });

  const addEmailMutation = useMutation({
    mutationFn: async (emailData: any) => {
      const response = await apiRequest("POST", `/api/leads/${leadId}/emails`, emailData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/leads/${leadId}/emails`] });
      queryClient.invalidateQueries({ queryKey: [`/api/leads/${leadId}/ai-suggestion`] });
      setNewEmail({ subject: "", content: "", email_type: "incoming" });
      setShowAddEmail(false);
      toast({
        title: "Email Added",
        description: "Email history has been updated.",
      });
    },
  });

  const deleteEmailMutation = useMutation({
    mutationFn: async (emailId: number) => {
      const response = await apiRequest("DELETE", `/api/leads/${leadId}/emails/${emailId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/leads/${leadId}/emails`] });
      queryClient.invalidateQueries({ queryKey: [`/api/leads/${leadId}/ai-suggestion`] });
      toast({
        title: "Email Deleted",
        description: "Email has been removed from history.",
      });
    },
  });

  const updateNotesMutation = useMutation({
    mutationFn: async (newNotes: string) => {
      const response = await apiRequest("PATCH", `/api/leads/${leadId}`, { notes: newNotes });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/leads/${leadId}`] });
      setIsEditingNotes(false);
      toast({
        title: "Notes Updated",
        description: "Lead notes have been saved.",
      });
    },
  });

  const generateAIEmailMutation = useMutation({
    mutationFn: async () => {
      if (!lead || !contentReports) return null;
      
      // Use OpenAI to generate a personalized email
      const response = await apiRequest("POST", "/api/ai/generate-lead-email", {
        lead,
        emailHistory: emailHistory || [],
        contentReports: contentReports.slice(0, 5),
      });
      return response.json();
    },
    onSuccess: (data) => {
      if (data) {
        setAiEmailSuggestion(data.emailSuggestion);
        setIsGeneratingEmail(false);
        toast({
          title: "AI Email Generated",
          description: "Personalized email suggestion created based on lead's interests and recent reports.",
        });
      }
    },
    onError: () => {
      setIsGeneratingEmail(false);
      toast({
        title: "Generation Failed",
        description: "Unable to generate AI email. Please try again.",
        variant: "destructive",
      });
    },
  });

  const parseConversationMutation = useMutation({
    mutationFn: async (text: string) => {
      const emails = parseEmailConversation(text);
      
      // Add all parsed emails
      for (const email of emails) {
        await apiRequest("POST", `/api/leads/${leadId}/emails`, {
          ...email,
          lead_id: leadId
        });
      }
      
      return emails;
    },
    onSuccess: (emails) => {
      queryClient.invalidateQueries({ queryKey: [`/api/leads/${leadId}/emails`] });
      queryClient.invalidateQueries({ queryKey: [`/api/leads/${leadId}/ai-suggestion`] });
      setShowConversationParser(false);
      setConversationText("");
      toast({
        title: "Conversation Parsed",
        description: `Added ${emails.length} emails to history.`,
      });
    },
  });

  const summarizeEmailsMutation = useMutation({
    mutationFn: async () => {
      if (!emailHistory || emailHistory.length === 0) return null;
      
      const response = await apiRequest("POST", "/api/ai/summarize-emails", {
        emails: emailHistory,
        leadName: lead?.name,
        company: lead?.company
      });
      return response.json();
    },
    onSuccess: (data) => {
      if (data?.summary) {
        setEmailSummary(data.summary);
        toast({
          title: "Email Summary Generated",
          description: "Email conversation has been summarized.",
        });
      }
    },
  });

  const parseEmailConversation = (text: string) => {
    const emails: any[] = [];
    const lines = text.split('\n');
    let currentEmail: any = null;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (line.toLowerCase().includes('from:') || line.toLowerCase().includes('to:')) {
        if (currentEmail) {
          emails.push(currentEmail);
        }
        
        const isIncoming = line.toLowerCase().includes('from:') && 
                          !line.toLowerCase().includes(lead?.email?.toLowerCase() || '');
        
        currentEmail = {
          from_email: isIncoming ? lead?.email || '' : 'spencer@13d.com',
          to_email: isIncoming ? 'spencer@13d.com' : lead?.email || '',
          subject: 'Email Conversation',
          content: line,
          email_type: isIncoming ? 'incoming' : 'outgoing'
        };
      } else if (currentEmail && line.length > 0) {
        currentEmail.content += '\n' + line;
      }
    }
    
    if (currentEmail) {
      emails.push(currentEmail);
    }
    
    return emails.reverse();
  };

  const handleSaveEdit = () => {
    updateLeadMutation.mutate(editData);
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

  const handleSaveNotes = () => {
    updateNotesMutation.mutate(notes);
  };

  const getStageColor = (stage: string) => {
    switch (stage) {
      case 'prospect': return 'bg-gray-100 text-gray-800';
      case 'qualified': return 'bg-blue-100 text-blue-800';
      case 'proposal': return 'bg-yellow-100 text-yellow-800';
      case 'closed_won': return 'bg-green-100 text-green-800';
      case 'closed_lost': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-64">Loading lead details...</div>;
  }

  if (!lead) {
    return <div className="flex justify-center items-center h-64">Lead not found</div>;
  }

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="mb-6">
        <Button variant="ghost" onClick={() => window.history.back()} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Lead Pipeline
        </Button>
        
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold mb-2">{lead.name}</h1>
            <p className="text-gray-600 mb-2">{lead.company}</p>
            <Badge className={`${getStageColor(lead.stage)} mb-2`}>
              {lead.stage.replace('_', ' ').toUpperCase()}
            </Badge>
          </div>
          
          <div className="flex gap-2">
            {!isEditing ? (
              <Button onClick={() => {
                setIsEditing(true);
                setEditData({
                  name: lead.name,
                  email: lead.email,
                  company: lead.company,
                  stage: lead.stage,
                  next_step: lead.next_step,
                });
              }}>
                <Edit className="w-4 h-4 mr-2" />
                Edit Lead
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button onClick={handleSaveEdit} disabled={updateLeadMutation.isPending}>
                  <Save className="w-4 h-4 mr-2" />
                  Save
                </Button>
                <Button variant="outline" onClick={() => setIsEditing(false)}>
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lead Details */}
        <div className="lg:col-span-2">
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="w-5 h-5 mr-2" />
                Lead Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      value={editData.name || ""}
                      onChange={(e) => setEditData({...editData, name: e.target.value})}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={editData.email || ""}
                      onChange={(e) => setEditData({...editData, email: e.target.value})}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="company">Company</Label>
                    <Input
                      id="company"
                      value={editData.company || ""}
                      onChange={(e) => setEditData({...editData, company: e.target.value})}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="stage">Stage</Label>
                    <select
                      id="stage"
                      value={editData.stage || ""}
                      onChange={(e) => setEditData({...editData, stage: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="prospect">Prospect</option>
                      <option value="qualified">Qualified</option>
                      <option value="proposal">Proposal</option>
                      <option value="closed_won">Closed Won</option>
                      <option value="closed_lost">Closed Lost</option>
                    </select>
                  </div>
                  
                  <div>
                    <Label htmlFor="nextStep">Next Step</Label>
                    <Input
                      id="nextStep"
                      value={editData.next_step || ""}
                      onChange={(e) => setEditData({...editData, next_step: e.target.value})}
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center">
                    <Mail className="w-4 h-4 mr-2 text-gray-500" />
                    <span>{lead.email}</span>
                  </div>
                  
                  <div className="flex items-center">
                    <Building className="w-4 h-4 mr-2 text-gray-500" />
                    <span>{lead.company}</span>
                  </div>
                  
                  {lead.last_contact && (
                    <div className="flex items-center">
                      <Clock className="w-4 h-4 mr-2 text-gray-500" />
                      <span>Last contact: {formatDistanceToNow(new Date(lead.last_contact))} ago</span>
                    </div>
                  )}
                  
                  {lead.next_step && (
                    <div className="flex items-center">
                      <span className="font-medium mr-2">Next Step:</span>
                      <span>{lead.next_step}</span>
                    </div>
                  )}
                  
                  {lead.interest_tags && lead.interest_tags.length > 0 && (
                    <div>
                      <span className="font-medium mr-2">Interests:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {lead.interest_tags.map((tag, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notes Section */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center">
                  <StickyNote className="w-5 h-5 mr-2" />
                  Notes
                </div>
                {!isEditingNotes ? (
                  <Button variant="outline" size="sm" onClick={() => setIsEditingNotes(true)}>
                    <Edit className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSaveNotes} disabled={updateNotesMutation.isPending}>
                      <Save className="w-4 h-4 mr-1" />
                      Save
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => {
                      setIsEditingNotes(false);
                      setNotes(lead.notes || "");
                    }}>
                      <X className="w-4 h-4 mr-1" />
                      Cancel
                    </Button>
                  </div>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isEditingNotes ? (
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add notes about this lead..."
                  rows={4}
                />
              ) : (
                <div className="text-gray-700">
                  {notes || "No notes added yet."}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Email History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center">
                  <Mail className="w-5 h-5 mr-2" />
                  Email History ({emailHistory?.length || 0})
                </div>
                <div className="flex gap-2">
                  {emailHistory && emailHistory.length > 0 && (
                    <Button variant="outline" size="sm" onClick={() => summarizeEmailsMutation.mutate()}>
                      <Bot className="w-4 h-4 mr-1" />
                      Summarize
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={() => setShowConversationParser(true)}>
                    <FileText className="w-4 h-4 mr-1" />
                    Parse Conversation
                  </Button>
                  <Button size="sm" onClick={() => setShowAddEmail(true)}>
                    <Plus className="w-4 h-4 mr-1" />
                    Add Email
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {emailSummary && (
                <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="font-medium text-blue-900 mb-2">Email Conversation Summary</h4>
                  <p className="text-blue-800 text-sm">{emailSummary}</p>
                </div>
              )}

              {showAddEmail && (
                <div className="mb-4 p-4 border rounded-lg bg-gray-50">
                  <h4 className="font-medium mb-3">Add Email to History</h4>
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="emailType">Type</Label>
                      <select
                        id="emailType"
                        value={newEmail.email_type}
                        onChange={(e) => setNewEmail({...newEmail, email_type: e.target.value as "incoming" | "outgoing"})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      >
                        <option value="incoming">Incoming (from {lead.name})</option>
                        <option value="outgoing">Outgoing (to {lead.name})</option>
                      </select>
                    </div>
                    
                    <div>
                      <Label htmlFor="emailSubject">Subject</Label>
                      <Input
                        id="emailSubject"
                        value={newEmail.subject}
                        onChange={(e) => setNewEmail({...newEmail, subject: e.target.value})}
                        placeholder="Email subject..."
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="emailContent">Content</Label>
                      <Textarea
                        id="emailContent"
                        value={newEmail.content}
                        onChange={(e) => setNewEmail({...newEmail, content: e.target.value})}
                        placeholder="Email content..."
                        rows={4}
                      />
                    </div>
                    
                    <div className="flex gap-2">
                      <Button onClick={handleAddEmail} disabled={addEmailMutation.isPending}>
                        Add Email
                      </Button>
                      <Button variant="outline" onClick={() => setShowAddEmail(false)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {showConversationParser && (
                <div className="mb-4 p-4 border rounded-lg bg-gray-50">
                  <h4 className="font-medium mb-3">Parse Email Conversation</h4>
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="conversationText">Paste email conversation</Label>
                      <Textarea
                        id="conversationText"
                        value={conversationText}
                        onChange={(e) => setConversationText(e.target.value)}
                        placeholder="Paste your email conversation here..."
                        rows={6}
                      />
                    </div>
                    
                    <div className="flex gap-2">
                      <Button 
                        onClick={() => parseConversationMutation.mutate(conversationText)} 
                        disabled={parseConversationMutation.isPending || !conversationText.trim()}
                      >
                        Parse & Add Emails
                      </Button>
                      <Button variant="outline" onClick={() => setShowConversationParser(false)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                {emailHistory && emailHistory.length > 0 ? (
                  emailHistory.map((email) => (
                    <div key={email.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant={email.email_type === 'incoming' ? 'default' : 'secondary'}>
                            {email.email_type === 'incoming' ? 'Incoming' : 'Outgoing'}
                          </Badge>
                          <span className="text-sm text-gray-500">
                            {formatDistanceToNow(new Date(email.sent_date))} ago
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteEmailMutation.mutate(email.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      
                      <h4 className="font-medium mb-1">{email.subject}</h4>
                      <p className="text-sm text-gray-600 mb-2">
                        From: {email.from_email} → To: {email.to_email}
                      </p>
                      <div className="text-sm bg-gray-50 p-3 rounded border">
                        {email.content.split('\n').map((line, idx) => (
                          <div key={idx}>{line}</div>
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No email history recorded yet.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* AI Suggestions Sidebar */}
        <div className="space-y-6">
          {/* AI Follow-up Suggestion */}
          {aiSuggestion && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Bot className="w-5 h-5 mr-2" />
                  AI Follow-up Suggestion
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Badge className={getPriorityColor(aiSuggestion.priority)}>
                      {aiSuggestion.priority.toUpperCase()} PRIORITY
                    </Badge>
                  </div>
                  
                  <div>
                    <span className="text-sm font-medium text-gray-600">Reason:</span>
                    <p className="text-sm text-gray-700 mt-1">{aiSuggestion.reason}</p>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <span className="text-sm font-medium text-gray-600">Subject:</span>
                    <p className="text-sm mt-1">{aiSuggestion.subject}</p>
                  </div>
                  
                  <div>
                    <span className="text-sm font-medium text-gray-600">Message:</span>
                    <div className="text-sm mt-1 bg-gray-50 p-3 rounded border whitespace-pre-line leading-relaxed">
                      {aiSuggestion.body}
                    </div>
                  </div>

                  {aiSuggestion.suggestedReports && aiSuggestion.suggestedReports.length > 0 && (
                    <div>
                      <span className="text-sm font-medium text-gray-600">Suggested Reports to Share:</span>
                      <div className="mt-2 space-y-2">
                        {aiSuggestion.suggestedReports.map((report, idx) => (
                          <div key={idx} className="text-xs p-2 bg-blue-50 rounded border">
                            <div className="font-medium">{report.title}</div>
                            <div className="text-gray-600 mt-1">{report.relevance}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Generate AI Email */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Lightbulb className="w-5 h-5 mr-2" />
                AI Email Generator
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <p className="text-sm text-gray-600">
                  Generate a personalized follow-up email based on recent reports and the lead's interests.
                </p>
                
                <Button 
                  className="w-full" 
                  onClick={() => {
                    setIsGeneratingEmail(true);
                    generateAIEmailMutation.mutate();
                  }}
                  disabled={isGeneratingEmail || generateAIEmailMutation.isPending}
                >
                  <Bot className="w-4 h-4 mr-2" />
                  {isGeneratingEmail ? "Generating..." : "Generate AI Email"}
                </Button>

                {aiEmailSuggestion && (
                  <div className="mt-4 p-3 bg-green-50 rounded border border-green-200">
                    <h4 className="font-medium text-green-900 mb-2">Generated Email</h4>
                    <div className="text-sm text-green-800 whitespace-pre-wrap">
                      {aiEmailSuggestion}
                    </div>
                    <Button 
                      size="sm" 
                      className="mt-2"
                      onClick={() => {
                        setNewEmail({
                          subject: "Follow-up: Investment Research Opportunities",
                          content: aiEmailSuggestion,
                          email_type: "outgoing"
                        });
                        setShowAddEmail(true);
                        setAiEmailSuggestion(null);
                      }}
                    >
                      Use This Email
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recent Reports */}
          {contentReports && contentReports.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="w-5 h-5 mr-2" />
                  Recent Reports
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {contentReports.slice(0, 3).map((report) => (
                    <div key={report.id} className="text-sm p-3 border rounded">
                      <div className="font-medium">{report.title}</div>
                      <div className="text-gray-500 text-xs mt-1">
                        {new Date(report.published_date).toLocaleDateString()}
                      </div>
                      {report.tags && report.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {report.tags.slice(0, 2).map((tag, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}