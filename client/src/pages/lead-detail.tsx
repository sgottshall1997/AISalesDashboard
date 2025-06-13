import { useState, useEffect, startTransition } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  Lightbulb,
  Copy,
  Phone,
  TrendingUp,
  MessageCircle
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

// Report Selector Component
interface ReportSelectorProps {
  reportSummaries: any[];
  selectedReportIds: number[];
  setSelectedReportIds: (ids: number[]) => void;
}

function ReportSelector({ reportSummaries, selectedReportIds, setSelectedReportIds }: ReportSelectorProps) {
  const formatReportTitle = (title: string) => {
    if (title.includes('WILTW_')) {
      return title.replace('WILTW_', 'WILTW ').replace(/(\d{4})-(\d{2})-(\d{2})/, '$2-$3-$1');
    } else if (title.includes('WATMTU_')) {
      return title.replace('WATMTU_', 'WATMTU ').replace(/(\d{4})-(\d{2})-(\d{2})/, '$2-$3-$1');
    }
    return title;
  };

  // Deduplicate reports by title, keeping the most recent one
  const deduplicateReports = (reports: any[]) => {
    try {
      const titleMap = new Map();
      reports.forEach((summary: any) => {
        const title = summary.report?.title;
        if (title && (!titleMap.has(title) || new Date(summary.report.created_at) > new Date(titleMap.get(title).report.created_at))) {
          titleMap.set(title, summary);
        }
      });
      return Array.from(titleMap.values());
    } catch (error) {
      console.warn("Error deduplicating reports:", error);
      return reports;
    }
  };

  if (!reportSummaries || !Array.isArray(reportSummaries)) {
    return null;
  }

  const allWiltwReports = reportSummaries.filter((summary: any) => summary.report?.title?.includes('WILTW'));
  const allWatmtuReports = reportSummaries.filter((summary: any) => summary.report?.title?.includes('WATMTU'));
  const allOtherReports = reportSummaries.filter((summary: any) => 
    !summary.report?.title?.includes('WILTW') && !summary.report?.title?.includes('WATMTU')
  );

  const wiltwReports = deduplicateReports(allWiltwReports);
  const watmtuReports = deduplicateReports(allWatmtuReports);
  const otherReports = deduplicateReports(allOtherReports);

  return (
    <>
      {wiltwReports.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-gray-700">WILTW Reports</h4>
          <div className="space-y-2 max-h-24 overflow-y-auto border rounded p-2 bg-blue-50">
            {wiltwReports.map((summary: any) => (
              <label key={summary.id} className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedReportIds.includes(summary.content_report_id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedReportIds([...selectedReportIds, summary.content_report_id]);
                    } else {
                      setSelectedReportIds(selectedReportIds.filter(id => id !== summary.content_report_id));
                    }
                  }}
                  className="rounded"
                />
                <span className="text-sm">
                  {formatReportTitle(summary.report.title)}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}
      
      {watmtuReports.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-gray-700">WATMTU Reports</h4>
          <div className="space-y-2 max-h-24 overflow-y-auto border rounded p-2 bg-green-50">
            {watmtuReports.map((summary: any) => (
              <label key={summary.id} className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedReportIds.includes(summary.content_report_id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedReportIds([...selectedReportIds, summary.content_report_id]);
                    } else {
                      setSelectedReportIds(selectedReportIds.filter(id => id !== summary.content_report_id));
                    }
                  }}
                  className="rounded"
                />
                <span className="text-sm">
                  {formatReportTitle(summary.report.title)}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}
      
      {otherReports.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-gray-700">Other Reports</h4>
          <div className="space-y-2 max-h-24 overflow-y-auto border rounded p-2 bg-gray-50">
            {otherReports.map((summary: any) => (
              <label key={summary.id} className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedReportIds.includes(summary.content_report_id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedReportIds([...selectedReportIds, summary.content_report_id]);
                    } else {
                      setSelectedReportIds(selectedReportIds.filter(id => id !== summary.content_report_id));
                    }
                  }}
                  className="rounded"
                />
                <span className="text-sm">
                  {formatReportTitle(summary.report.title)}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}
      
      {selectedReportIds.length > 0 && (
        <p className="text-xs text-gray-600">
          {selectedReportIds.length} report{selectedReportIds.length > 1 ? 's' : ''} selected
        </p>
      )}
    </>
  );
}

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
  how_heard?: string;
  likelihood_of_closing?: string;
  engagement_level?: string;
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
  const [, params] = useRoute("/leads/:id");
  const [, setLocation] = useLocation();
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
  const [selectedReportIds, setSelectedReportIds] = useState<number[]>([]);
  const [callPrepResult, setCallPrepResult] = useState<any>(null);
  const [showCallPrep, setShowCallPrep] = useState(false);
  
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

  // Remove automatic AI suggestion loading - only generate when requested

  const { data: contentReports } = useQuery<ContentReport[]>({
    queryKey: ["/api/content-reports"],
  });

  const { data: reportSummaries } = useQuery({
    queryKey: ["/api/report-summaries"],
  });

  // Update notes when lead data loads
  useEffect(() => {
    if (lead) {
      setNotes(lead.notes || "");
    }
  }, [lead]);

  const updateLeadMutation = useMutation({
    mutationFn: async (updates: Partial<Lead>) => {
      const response = await apiRequest(`/api/leads/${leadId}`, "PATCH", updates);
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
      const response = await apiRequest(`/api/leads/${leadId}/emails`, "POST", emailData);
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
      const response = await apiRequest(`/api/leads/${leadId}`, "PATCH", { notes: newNotes });
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
      const response = await apiRequest("/api/ai/generate-lead-email", "POST", {
        lead,
        emailHistory: emailHistory || [],
        contentReports: contentReports.slice(0, 5),
        selectedReportIds,
      });
      return response;
    },
    onSuccess: (data) => {
      if (data) {
        startTransition(() => {
          setAiEmailSuggestion(data.emailSuggestion);
          setIsGeneratingEmail(false);
        });
        toast({
          title: "AI Email Generated",
          description: "Personalized email suggestion created based on lead's interests and recent reports.",
        });
      }
    },
    onError: () => {
      startTransition(() => {
        setIsGeneratingEmail(false);
      });
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
      startTransition(() => {
        setShowConversationParser(false);
        setConversationText("");
      });
      toast({
        title: "Conversation Parsed",
        description: `Added ${emails.length} emails to history.`,
      });
    },
  });

  const generateCallPrepMutation = useMutation({
    mutationFn: async () => {
      if (!lead) return null;
      
      const response = await apiRequest("/api/ai/generate-call-prep", "POST", {
        prospectName: lead.name,
        firmName: lead.company,
        interests: lead.interest_tags?.join(', ') || '',
        notes: lead.notes || ''
      });
      return response;
    },
    onSuccess: (data) => {
      if (data) {
        startTransition(() => {
          setCallPrepResult(data);
        });
        toast({
          title: "Call Preparation Generated",
          description: "Comprehensive call prep notes created based on prospect information.",
        });
      }
    },
    onError: () => {
      toast({
        title: "Generation Failed",
        description: "Unable to generate call preparation. Please try again.",
        variant: "destructive",
      });
    },
  });

  const summarizeEmailsMutation = useMutation({
    mutationFn: async () => {
      if (!emailHistory || emailHistory.length === 0) return null;
      
      const response = await apiRequest("/api/ai/summarize-emails", "POST", {
        emails: emailHistory,
        leadName: lead?.name,
        company: lead?.company
      });
      return response;
    },
    onSuccess: (data) => {
      if (data?.summary) {
        startTransition(() => {
          setEmailSummary(data.summary);
        });
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
        <Button variant="ghost" onClick={() => setLocation('/lead-pipeline')} className="mb-4">
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
                startTransition(() => {
                  setIsEditing(true);
                  setEditData({
                    name: lead.name,
                    email: lead.email,
                    company: lead.company,
                    stage: lead.stage,
                    next_step: lead.next_step,
                    how_heard: lead.how_heard,
                  });
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
                <Button variant="outline" onClick={() => startTransition(() => setIsEditing(false))}>
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Lead Details - Full Width */}
      <div className="space-y-6">
        <Card>
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
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="likelihood">Likelihood of Closing</Label>
                      <select
                        id="likelihood"
                        value={editData.likelihood_of_closing || "medium"}
                        onChange={(e) => setEditData({...editData, likelihood_of_closing: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                      </select>
                    </div>
                    
                    <div>
                      <Label htmlFor="engagement">Engagement Level</Label>
                      <select
                        id="engagement"
                        value={editData.engagement_level || "none"}
                        onChange={(e) => setEditData({...editData, engagement_level: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="none">None</option>
                        <option value="medium">Medium</option>
                        <option value="full">Full</option>
                      </select>
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="howHeard">How did you hear about 13D?</Label>
                    <Input
                      id="howHeard"
                      value={editData.how_heard || ""}
                      onChange={(e) => setEditData({...editData, how_heard: e.target.value})}
                      placeholder="e.g., referral, website, LinkedIn, conference"
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
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center">
                      <span className="font-medium mr-2">Likelihood:</span>
                      <Badge variant="outline" className={`${
                        lead.likelihood_of_closing === 'high' ? 'bg-green-100 text-green-800' :
                        lead.likelihood_of_closing === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {lead.likelihood_of_closing || 'medium'}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center">
                      <span className="font-medium mr-2">Engagement:</span>
                      <Badge variant="outline" className={`${
                        lead.engagement_level === 'full' ? 'bg-blue-100 text-blue-800' :
                        lead.engagement_level === 'medium' ? 'bg-purple-100 text-purple-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {lead.engagement_level || 'none'}
                      </Badge>
                    </div>
                  </div>
                  
                  {lead.how_heard && (
                    <div className="flex items-center">
                      <span className="font-medium mr-2">How heard about 13D:</span>
                      <span>{lead.how_heard}</span>
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

          {/* Call Preparation */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center">
                  <Phone className="w-5 h-5 mr-2" />
                  Call Preparation
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => generateCallPrepMutation.mutate()}
                  disabled={generateCallPrepMutation.isPending}
                >
                  {generateCallPrepMutation.isPending ? (
                    <>
                      <Bot className="w-4 h-4 mr-1 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Bot className="w-4 h-4 mr-1" />
                      Generate Call Prep
                    </>
                  )}
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {callPrepResult ? (
                <div className="space-y-6">
                  {/* Prospect Snapshot */}
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <Building className="w-4 h-4 mr-2 text-blue-600" />
                      <h3 className="font-semibold">Prospect Snapshot</h3>
                    </div>
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <p className="text-sm">{callPrepResult.prospectSnapshot}</p>
                    </div>
                  </div>

                  {/* Personal Background */}
                  {callPrepResult.personalBackground && (
                    <div className="space-y-2">
                      <div className="flex items-center">
                        <User className="w-4 h-4 mr-2 text-indigo-600" />
                        <h3 className="font-semibold">Personal Background</h3>
                      </div>
                      <div className="bg-indigo-50 p-3 rounded-lg">
                        <p className="text-sm">{callPrepResult.personalBackground}</p>
                      </div>
                    </div>
                  )}

                  {/* Company Overview */}
                  {callPrepResult.companyOverview && (
                    <div className="space-y-2">
                      <div className="flex items-center">
                        <Building className="w-4 h-4 mr-2 text-cyan-600" />
                        <h3 className="font-semibold">Company Overview</h3>
                      </div>
                      <div className="bg-cyan-50 p-3 rounded-lg">
                        <p className="text-sm">{callPrepResult.companyOverview}</p>
                      </div>
                    </div>
                  )}

                  {/* Top Interests */}
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <TrendingUp className="w-4 h-4 mr-2 text-purple-600" />
                      <h3 className="font-semibold">Top Interests</h3>
                    </div>
                    <div className="bg-purple-50 p-3 rounded-lg">
                      <p className="text-sm">{callPrepResult.topInterests}</p>
                    </div>
                  </div>

                  {/* Portfolio Insights */}
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <TrendingUp className="w-4 h-4 mr-2 text-green-600" />
                      <h3 className="font-semibold">Portfolio Insights</h3>
                    </div>
                    <div className="bg-green-50 p-3 rounded-lg">
                      <p className="text-sm">{callPrepResult.portfolioInsights}</p>
                    </div>
                  </div>

                  {/* Talking Points */}
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <MessageCircle className="w-4 h-4 mr-2 text-orange-600" />
                      <h3 className="font-semibold">Talking Points for Call</h3>
                    </div>
                    <div className="bg-orange-50 p-3 rounded-lg">
                      <div className="space-y-4">
                        {callPrepResult.talkingPoints && callPrepResult.talkingPoints.map((point: any, index: number) => (
                          <div key={index} className="space-y-2">
                            <div className="flex items-start">
                              <Badge variant="outline" className="mr-2 mt-0.5 text-xs">
                                {index + 1}
                              </Badge>
                              <span className="text-sm font-medium">
                                {typeof point === 'string' ? point : (point?.mainPoint || '')}
                              </span>
                            </div>
                            {typeof point === 'object' && point.subBullets && Array.isArray(point.subBullets) && point.subBullets.length > 0 && (
                              <ul className="ml-8 space-y-1">
                                {point.subBullets.map((bullet: any, bulletIndex: number) => (
                                  <li key={bulletIndex} className="text-sm text-gray-600 flex items-start">
                                    <span className="mr-2">•</span>
                                    <span>{typeof bullet === 'string' ? bullet : JSON.stringify(bullet)}</span>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Smart Questions */}
                  {callPrepResult.smartQuestions && callPrepResult.smartQuestions.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center">
                        <MessageCircle className="w-4 h-4 mr-2 text-red-600" />
                        <h3 className="font-semibold">Smart Questions to Ask</h3>
                      </div>
                      <div className="bg-red-50 p-3 rounded-lg">
                        <div className="space-y-2">
                          {callPrepResult.smartQuestions.map((question: string, index: number) => (
                            <div key={index} className="flex items-start">
                              <span className="text-xs font-medium text-red-600 mr-2 mt-1">Q{index + 1}.</span>
                              <span className="text-sm">{question}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Copy All Button */}
                  <div className="pt-4">
                    <Button
                      variant="outline"
                      onClick={() => {
                        let content = `CALL PREPARATION NOTES\n\n`;
                        
                        content += `PROSPECT SNAPSHOT\n${callPrepResult.prospectSnapshot}\n\n`;
                        
                        if (callPrepResult.personalBackground) {
                          content += `PERSONAL BACKGROUND\n${callPrepResult.personalBackground}\n\n`;
                        }
                        
                        if (callPrepResult.companyOverview) {
                          content += `COMPANY OVERVIEW\n${callPrepResult.companyOverview}\n\n`;
                        }
                        
                        content += `TOP INTERESTS\n${callPrepResult.topInterests}\n\n`;
                        content += `PORTFOLIO INSIGHTS\n${callPrepResult.portfolioInsights}\n\n`;
                        
                        // Handle structured talking points
                        content += `TALKING POINTS\n`;
                        callPrepResult.talkingPoints.forEach((point: any, i: number) => {
                          if (typeof point === 'string') {
                            content += `${i + 1}. ${point}\n`;
                          } else {
                            content += `${i + 1}. ${point.mainPoint}\n`;
                            if (point.subBullets && point.subBullets.length > 0) {
                              point.subBullets.forEach((bullet: any) => {
                                content += `   • ${bullet}\n`;
                              });
                            }
                          }
                        });
                        content += '\n';
                        
                        if (callPrepResult.smartQuestions) {
                          content += `SMART QUESTIONS\n${callPrepResult.smartQuestions.map((q: string, i: number) => `Q${i + 1}. ${q}`).join('\n')}`;
                        }
                        
                        navigator.clipboard.writeText(content);
                        toast({
                          title: "Copied to Clipboard",
                          description: "Call prep notes have been copied to your clipboard",
                        });
                      }}
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      Copy All Notes
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  Click "Generate Call Prep" to create comprehensive preparation notes for your call with {lead?.name}.
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
                  <h4 className="font-medium text-blue-900 mb-3">Email Conversation Summary</h4>
                  <div className="text-blue-800 text-sm space-y-3">
                    {emailSummary.split(/\d+\.\s\*\*/).filter(section => section.trim()).map((section, index) => {
                      if (index === 0) return null; // Skip empty first element
                      
                      const [title, ...content] = section.split('**:');
                      const titleText = title?.trim();
                      const contentText = content.join('**:').trim();
                      
                      if (!titleText || !contentText) return null;
                      
                      return (
                        <div key={index} className="border-l-2 border-blue-300 pl-3">
                          <h5 className="font-medium text-blue-900 mb-1">{titleText}</h5>
                          <p className="text-blue-700 leading-relaxed">{contentText}</p>
                        </div>
                      );
                    })}
                  </div>
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

          {/* AI Email Generator - Full Width */}
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
                
                {reportSummaries && Array.isArray(reportSummaries) && reportSummaries.length > 0 ? (
                  <div className="space-y-4">
                    <Label className="text-sm font-medium">
                      Select Reports to Reference (Optional)
                    </Label>
                    
                    <ReportSelector 
                      reportSummaries={reportSummaries}
                      selectedReportIds={selectedReportIds}
                      setSelectedReportIds={setSelectedReportIds}
                    />
                  </div>
                ) : null}
                
                <Button 
                  className="w-full" 
                  onClick={() => {
                    startTransition(() => {
                      setIsGeneratingEmail(true);
                    });
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
                    <div className="flex gap-2 mt-2">
                      <Button 
                        size="sm" 
                        onClick={() => {
                          startTransition(() => {
                            setNewEmail({
                              subject: "Follow-up: Investment Research Opportunities",
                              content: aiEmailSuggestion,
                              email_type: "outgoing"
                            });
                            setShowAddEmail(true);
                            setAiEmailSuggestion(null);
                          });
                        }}
                      >
                        Use This Email
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(aiEmailSuggestion);
                            toast({
                              title: "Email Copied",
                              description: "The generated email has been copied to your clipboard.",
                            });
                          } catch (error) {
                            toast({
                              title: "Copy Failed",
                              description: "Failed to copy email to clipboard. Please try again.",
                              variant: "destructive",
                            });
                          }
                        }}
                      >
                        <Copy className="w-4 h-4 mr-1" />
                        Copy
                      </Button>
                    </div>
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
  );
}