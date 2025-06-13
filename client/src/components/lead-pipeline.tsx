import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Target, 
  Lightbulb, 
  Clock, 
  TrendingUp,
  Edit,
  Bot,
  ExternalLink,
  Plus,
  Trash2,
  Search,
  Copy
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface Lead {
  id: number;
  name: string;
  email: string;
  company: string;
  stage: string;
  likelihood_of_closing?: string;
  engagement_level?: string;
  last_contact?: string;
  next_step?: string;
  notes?: string;
  interest_tags: string[];
  how_heard?: string;
  created_at?: string;
}

interface AIEmailResponse {
  subject: string;
  body: string;
}

export default function LeadPipeline() {
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [aiEmail, setAiEmail] = useState<AIEmailResponse | null>(null);
  const [isGeneratingEmail, setIsGeneratingEmail] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [collapsedStages, setCollapsedStages] = useState<Record<string, boolean>>({});
  const [sortBy, setSortBy] = useState<"created_at" | "name" | "company">("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [editingNotes, setEditingNotes] = useState<Record<number, string>>({});
  const [generatingEmailFor, setGeneratingEmailFor] = useState<number | null>(null);
  const [emailDialogs, setEmailDialogs] = useState<Record<number, { open: boolean; email: AIEmailResponse | null }>>({});
  const [newLead, setNewLead] = useState({
    name: "",
    email: "",
    company: "",
    stage: "prospect",
    next_step: "",
    notes: "",
    interest_tags: "",
    how_heard: ""
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: leads } = useQuery<Lead[]>({
    queryKey: ["/api/leads"],
  });

  const { data: contentReports } = useQuery({
    queryKey: ["/api/content-reports"],
  });

  const generateEmailMutation = useMutation({
    mutationFn: async (leadId: number) => {
      const response = await apiRequest("/api/ai/generate-email", "POST", {
        type: "lead_outreach",
        leadId,
        context: { stage: selectedLead?.stage }
      });
      return response.json();
    },
    onSuccess: (data) => {
      setAiEmail(data);
      setIsGeneratingEmail(false);
      toast({
        title: "AI Email Generated",
        description: "Outreach email has been generated successfully.",
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

  const updateLeadMutation = useMutation({
    mutationFn: async ({ leadId, updates }: { leadId: number; updates: any }) => {
      const response = await apiRequest(`/api/leads/${leadId}`, "PATCH", updates);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      toast({
        title: "Lead Updated",
        description: "Lead has been updated successfully.",
      });
    },
  });

  const updateLikelihoodMutation = useMutation({
    mutationFn: async ({ leadId, likelihood }: { leadId: number; likelihood: string }) => {
      const response = await apiRequest(`/api/leads/${leadId}`, "PATCH", { likelihood_of_closing: likelihood });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      console.log('Likelihood updated successfully:', data);
      toast({
        title: "Likelihood Updated",
        description: "Lead likelihood has been updated successfully.",
      });
    },
  });

  const updateEngagementMutation = useMutation({
    mutationFn: async ({ leadId, engagement }: { leadId: number; engagement: string }) => {
      const response = await apiRequest(`/api/leads/${leadId}`, "PATCH", { engagement_level: engagement });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      console.log('Engagement updated successfully:', data);
      toast({
        title: "Engagement Updated",
        description: "Lead engagement has been updated successfully.",
      });
    },
  });

  const updateNotesMutation = useMutation({
    mutationFn: async ({ leadId, notes }: { leadId: number; notes: string }) => {
      const response = await apiRequest(`/api/leads/${leadId}`, "PATCH", { notes });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      toast({
        title: "Notes Updated",
        description: "Lead notes have been saved successfully.",
      });
    },
  });

  const generateProspectEmailMutation = useMutation({
    mutationFn: async ({ leadId, reportTitle }: { leadId: number; reportTitle: string }) => {
      const lead = leads?.find(l => l.id === leadId);
      console.log('Generating email for lead:', lead);
      const response = await apiRequest("/api/generate-prospect-email", "POST", {
        prospectName: lead?.name,
        reportTitle,
        keyTalkingPoints: Array.isArray(lead?.interest_tags) ? lead.interest_tags.join(', ') : '',
        matchReason: lead?.notes || ''
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Email response data:', data);
      return data;
    },
    onSuccess: (data, variables) => {
      console.log('Email generation successful:', data);
      setEmailDialogs(prev => ({
        ...prev,
        [variables.leadId]: { open: true, email: data }
      }));
      setGeneratingEmailFor(null);
      toast({
        title: "Email Generated",
        description: "Prospect email has been generated successfully.",
      });
    },
    onError: (error) => {
      console.error('Email generation error:', error);
      setGeneratingEmailFor(null);
      toast({
        title: "Error",
        description: "Failed to generate email. Please try again.",
        variant: "destructive",
      });
    },
  });

  const createLeadMutation = useMutation({
    mutationFn: async (leadData: typeof newLead) => {
      const response = await apiRequest("POST", "/api/leads", {
        ...leadData,
        interest_tags: leadData.interest_tags.split(',').map(tag => tag.trim()).filter(Boolean)
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      setIsAddDialogOpen(false);
      setNewLead({
        name: "",
        email: "",
        company: "",
        stage: "prospect",
        next_step: "",
        notes: "",
        interest_tags: "",
        how_heard: ""
      });
      toast({
        title: "Lead created",
        description: "New lead has been added successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create lead. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteLeadMutation = useMutation({
    mutationFn: async (leadId: number) => {
      const response = await apiRequest("DELETE", `/api/leads/${leadId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      toast({
        title: "Lead deleted",
        description: "Lead has been removed successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete lead. Please try again.",
        variant: "destructive",
      });
    },
  });

  const getLeadsByStage = (stage: string) => {
    if (!leads) return [];
    
    let filteredLeads = leads.filter(lead => lead.stage === stage);
    
    if (searchTerm.trim()) {
      filteredLeads = filteredLeads.filter(lead =>
        lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.interest_tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    
    // Sort leads
    filteredLeads.sort((a, b) => {
      let aValue: string | Date;
      let bValue: string | Date;
      
      switch (sortBy) {
        case "created_at":
          aValue = new Date(a.created_at || "");
          bValue = new Date(b.created_at || "");
          break;
        case "name":
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case "company":
          aValue = a.company.toLowerCase();
          bValue = b.company.toLowerCase();
          break;
        default:
          return 0;
      }
      
      if (sortBy === "created_at") {
        const dateA = aValue as Date;
        const dateB = bValue as Date;
        return sortOrder === "asc" ? dateA.getTime() - dateB.getTime() : dateB.getTime() - dateA.getTime();
      } else {
        const strA = aValue as string;
        const strB = bValue as string;
        return sortOrder === "asc" ? strA.localeCompare(strB) : strB.localeCompare(strA);
      }
    });
    
    return filteredLeads;
  };

  const handleGenerateEmail = (lead: Lead) => {
    setSelectedLead(lead);
    setIsGeneratingEmail(true);
    generateEmailMutation.mutate(lead.id);
  };

  const getStageColor = (stage: string) => {
    switch (stage) {
      case "prospect":
        return "bg-gray-100 text-gray-800";
      case "qualified":
        return "bg-blue-100 text-blue-800";
      case "proposal":
        return "bg-yellow-100 text-yellow-800";
      case "closed_won":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getTagColor = (tag: string) => {
    const colors = [
      "bg-blue-100 text-blue-800",
      "bg-green-100 text-green-800",
      "bg-purple-100 text-purple-800",
      "bg-orange-100 text-orange-800",
    ];
    return colors[tag.length % colors.length];
  };

  const getLikelihoodColor = (likelihood: string) => {
    switch (likelihood) {
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

  const getEngagementColor = (engagement: string) => {
    switch (engagement) {
      case "full":
        return "bg-blue-100 text-blue-800";
      case "medium":
        return "bg-purple-100 text-purple-800";
      case "none":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">AI-Powered Sales Dashboard</h2>
              <p className="text-gray-600">Manage prospects and automate next-step recommendations</p>
            </div>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Add Lead
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Add New Lead</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="name" className="text-right">Name</Label>
                    <Input
                      id="name"
                      value={newLead.name}
                      onChange={(e) => setNewLead({...newLead, name: e.target.value})}
                      className="col-span-3"
                      placeholder="Full name"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="email" className="text-right">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={newLead.email}
                      onChange={(e) => setNewLead({...newLead, email: e.target.value})}
                      className="col-span-3"
                      placeholder="email@company.com"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="company" className="text-right">Company</Label>
                    <Input
                      id="company"
                      value={newLead.company}
                      onChange={(e) => setNewLead({...newLead, company: e.target.value})}
                      className="col-span-3"
                      placeholder="Company name"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="stage" className="text-right">Stage</Label>
                    <Select value={newLead.stage} onValueChange={(value) => setNewLead({...newLead, stage: value})}>
                      <SelectTrigger className="col-span-3">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="prospect">Prospect</SelectItem>
                        <SelectItem value="qualified">Qualified</SelectItem>
                        <SelectItem value="proposal">Proposal</SelectItem>
                        <SelectItem value="closed_won">Closed Won</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="interest_tags" className="text-right">Interests</Label>
                    <Input
                      id="interest_tags"
                      value={newLead.interest_tags}
                      onChange={(e) => setNewLead({...newLead, interest_tags: e.target.value})}
                      className="col-span-3"
                      placeholder="tech, finance, healthcare (comma separated)"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="how_heard" className="text-right">How Heard</Label>
                    <Input
                      id="how_heard"
                      value={newLead.how_heard || ""}
                      onChange={(e) => setNewLead({...newLead, how_heard: e.target.value})}
                      className="col-span-3"
                      placeholder="referral, website, LinkedIn, etc."
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={() => createLeadMutation.mutate(newLead)}
                    disabled={!newLead.name || !newLead.email || !newLead.company || createLeadMutation.isPending}
                  >
                    {createLeadMutation.isPending ? "Creating..." : "Create Lead"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          
          {/* Search and Sort Controls */}
          <div className="mb-6">
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
              <div className="relative max-w-md flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  type="text"
                  placeholder="Search prospects by name, company, email, or interests..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 w-full"
                />
              </div>
              
              <div className="flex items-center gap-3">
                <Label className="text-sm font-medium text-gray-700">Sort by:</Label>
                <Select value={sortBy} onValueChange={(value: "created_at" | "name" | "company") => setSortBy(value)}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="created_at">Created Date</SelectItem>
                    <SelectItem value="name">Name</SelectItem>
                    <SelectItem value="company">Company</SelectItem>
                  </SelectContent>
                </Select>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                  className="px-3"
                  title={`Sort ${sortOrder === "asc" ? "descending" : "ascending"}`}
                >
                  {sortOrder === "asc" ? "↑" : "↓"}
                </Button>
              </div>
            </div>
            
            {searchTerm && (
              <p className="text-sm text-gray-600 mt-2">
                Showing results for "{searchTerm}"
              </p>
            )}
          </div>
        </div>

        {/* Clean Vertical Pipeline Layout */}
        <div className="space-y-4">
          {["prospect", "qualified", "proposal", "closed_won"].map((stage) => {
            const stageLeads = getLeadsByStage(stage);
            const stageLabels: Record<string, string> = {
              prospect: "Prospects",
              qualified: "Qualified Leads", 
              proposal: "Proposals",
              closed_won: "Closed Won"
            };
            const isCollapsed = collapsedStages[stage];
            
            return (
              <Card key={stage} className="w-full">
                <CardHeader 
                  className="cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => setCollapsedStages(prev => ({...prev, [stage]: !prev[stage]}))}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CardTitle className="text-lg">{stageLabels[stage]}</CardTitle>
                      <Badge variant="secondary" className={getStageColor(stage)}>
                        {stageLeads.length}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      {!isCollapsed && stageLeads.length > 0 && (
                        <span className="text-sm text-gray-500">
                          {stageLeads.filter(lead => lead.likelihood_of_closing === 'high').length} high • {' '}
                          {stageLeads.filter(lead => lead.likelihood_of_closing === 'medium').length} med • {' '}
                          {stageLeads.filter(lead => lead.likelihood_of_closing === 'low').length} low
                        </span>
                      )}
                      <Button variant="ghost" size="sm">
                        {isCollapsed ? "▼" : "▲"}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                
                {!isCollapsed && (
                  <CardContent className="pt-0">
                    {stageLeads.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        No {stageLabels[stage].toLowerCase()} yet.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {stageLeads.map((lead) => (
                          <div key={lead.id} className="border rounded-lg p-4 bg-white hover:bg-gray-50 transition-colors">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <h4 className="font-medium text-gray-900">{lead.name}</h4>
                                  <Badge variant="outline" className="text-xs">
                                    {lead.company}
                                  </Badge>
                                  {lead.created_at && (
                                    <span className="text-xs text-gray-500">
                                      Created {new Date(lead.created_at).toLocaleDateString()}
                                    </span>
                                  )}
                                </div>
                                
                                <div className="flex items-center gap-4 mb-3">
                                  <span className="text-sm text-gray-600">{lead.email}</span>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-gray-500">Likelihood:</span>
                                    <Select 
                                      value={lead.likelihood_of_closing || "medium"} 
                                      onValueChange={(value) => {
                                        console.log('Likelihood change:', value, 'for lead:', lead.id);
                                        updateLikelihoodMutation.mutate({leadId: lead.id, likelihood: value});
                                      }}
                                    >
                                      <SelectTrigger className="w-24 h-7 text-xs">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="low">Low</SelectItem>
                                        <SelectItem value="medium">Medium</SelectItem>
                                        <SelectItem value="high">High</SelectItem>
                                      </SelectContent>
                                    </Select>
                                    <Badge 
                                      variant="outline" 
                                      className={`text-xs ${getLikelihoodColor(lead.likelihood_of_closing || 'medium')}`}
                                    >
                                      {lead.likelihood_of_closing || 'medium'}
                                    </Badge>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-gray-500">Engagement:</span>
                                    <Select 
                                      value={lead.engagement_level || "none"} 
                                      onValueChange={(value) => {
                                        console.log('Engagement change:', value, 'for lead:', lead.id);
                                        updateEngagementMutation.mutate({leadId: lead.id, engagement: value});
                                      }}
                                    >
                                      <SelectTrigger className="w-20 h-7 text-xs">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="none">None</SelectItem>
                                        <SelectItem value="medium">Med</SelectItem>
                                        <SelectItem value="full">Full</SelectItem>
                                      </SelectContent>
                                    </Select>
                                    <Badge 
                                      variant="outline" 
                                      className={`text-xs ${getEngagementColor(lead.engagement_level || 'none')}`}
                                    >
                                      {lead.engagement_level || 'none'}
                                    </Badge>
                                  </div>
                                </div>
                                
                                {lead.interest_tags.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mb-3">
                                    {lead.interest_tags.map((tag, index) => (
                                      <Badge key={index} variant="outline" className={`text-xs ${getTagColor(tag)}`}>
                                        {tag}
                                      </Badge>
                                    ))}
                                  </div>
                                )}

                                {/* Quick Notes Section */}
                                <div className="mb-3">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs text-gray-500">Quick Notes:</span>
                                    {editingNotes[lead.id] !== undefined && editingNotes[lead.id] !== (lead.notes || '') && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-6 px-2 text-xs"
                                        onClick={() => {
                                          updateNotesMutation.mutate({leadId: lead.id, notes: editingNotes[lead.id]});
                                        }}
                                        disabled={updateNotesMutation.isPending}
                                      >
                                        {updateNotesMutation.isPending ? "Saving..." : "Save"}
                                      </Button>
                                    )}
                                  </div>
                                  <Textarea
                                    value={editingNotes[lead.id] !== undefined ? editingNotes[lead.id] : (lead.notes || '')}
                                    onChange={(e) => setEditingNotes(prev => ({...prev, [lead.id]: e.target.value}))}
                                    onBlur={() => {
                                      if (editingNotes[lead.id] !== undefined && editingNotes[lead.id] !== (lead.notes || '')) {
                                        updateNotesMutation.mutate({leadId: lead.id, notes: editingNotes[lead.id]});
                                      }
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        if (editingNotes[lead.id] !== undefined && editingNotes[lead.id] !== (lead.notes || '')) {
                                          updateNotesMutation.mutate({leadId: lead.id, notes: editingNotes[lead.id]});
                                        }
                                      }
                                    }}
                                    placeholder="Type notes here... (Enter to save or use Save button)"
                                    className="h-16 text-xs resize-none"
                                  />
                                </div>

                                {/* Email Generation Section */}
                                <div className="mb-3 p-2 bg-blue-50 rounded-lg">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Bot className="w-3 h-3 text-blue-600" />
                                    <span className="text-xs font-medium text-blue-800">Generate Email</span>
                                  </div>
                                  <div className="flex flex-col gap-2">
                                    <Select onValueChange={(reportTitle) => {
                                      setGeneratingEmailFor(lead.id);
                                      generateProspectEmailMutation.mutate({leadId: lead.id, reportTitle});
                                    }}>
                                      <SelectTrigger className="h-7 text-xs">
                                        <SelectValue placeholder="Select WILTW/WATMTU report" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {Array.isArray(contentReports) && 
                                          contentReports.filter((report: any) => 
                                            report.title && (report.title.includes('WILTW') || report.title.includes('WATMTU'))
                                          ).slice(0, 5).map((report: any) => (
                                            <SelectItem key={report.id} value={report.title}>
                                              <div className="text-xs">
                                                <div className="font-medium">{report.title}</div>
                                                <div className="text-gray-500">
                                                  {new Date(report.published_date).toLocaleDateString()}
                                                </div>
                                              </div>
                                            </SelectItem>
                                          ))
                                        }
                                      </SelectContent>
                                    </Select>
                                    {generatingEmailFor === lead.id && (
                                      <div className="text-xs text-blue-600 flex items-center gap-1">
                                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
                                        Generating email...
                                      </div>
                                    )}
                                  </div>
                                </div>
                                
                                {lead.next_step && (
                                  <p className="text-sm text-gray-600">
                                    <Clock className="w-3 h-3 inline mr-1" />
                                    Next: {lead.next_step}
                                  </p>
                                )}
                              </div>
                              
                              <div className="flex items-center gap-2 ml-4">
                                <Link to={`/leads/${lead.id}`}>
                                  <Button variant="outline" size="sm">
                                    <ExternalLink className="w-3 h-3 mr-1" />
                                    View
                                  </Button>
                                </Link>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => deleteLeadMutation.mutate(lead.id)}
                                  disabled={deleteLeadMutation.isPending}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>

        {/* Email Display Dialogs */}
        {Object.entries(emailDialogs).map(([leadId, dialogData]) => {
          const lead = leads?.find(l => l.id.toString() === leadId);
          if (!dialogData?.open || !dialogData?.email || !lead) return null;
          
          const emailData = dialogData.email;
          
          return (
            <Dialog key={leadId} open={dialogData.open} onOpenChange={(open) => {
              if (!open) {
                setEmailDialogs(prev => ({
                  ...prev,
                  [leadId]: { 
                    ...prev[leadId as keyof typeof prev], 
                    open: false 
                  }
                }));
              }
            }}>
              <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Bot className="w-5 h-5 text-blue-600" />
                    Generated Email for {lead.name}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Subject</Label>
                    <div className="mt-1 p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm font-medium">{emailData.subject}</p>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Email Body</Label>
                    <div className="mt-1 p-4 bg-white border rounded-lg">
                      <div className="whitespace-pre-wrap text-sm leading-relaxed">
                        {emailData.body}
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-4">
                    <Button
                      variant="outline"
                      onClick={() => {
                        navigator.clipboard.writeText(`Subject: ${emailData.subject}\n\n${emailData.body}`);
                        toast({
                          title: "Copied to clipboard",
                          description: "Email content has been copied to your clipboard.",
                        });
                      }}
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      Copy Email
                    </Button>
                    <Button
                      onClick={() => {
                        setEmailDialogs(prev => ({
                          ...prev,
                          [leadId]: { 
                            ...prev[leadId as keyof typeof prev], 
                            open: false 
                          }
                        }));
                      }}
                    >
                      Close
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          );
        })}
      </div>
    </div>
  );
}