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
  Search
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
  last_contact?: string;
  next_step?: string;
  notes?: string;
  interest_tags: string[];
  how_heard?: string;
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

  const generateEmailMutation = useMutation({
    mutationFn: async (leadId: number) => {
      const response = await apiRequest("POST", "/api/ai/generate-email", {
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
      const response = await apiRequest("PATCH", `/api/leads/${leadId}`, updates);
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
      const response = await apiRequest("PATCH", `/api/leads/${leadId}`, { likelihood_of_closing: likelihood });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
    },
  });

  const createLeadMutation = useMutation({
    mutationFn: async (leadData: typeof newLead) => {
      const response = await apiRequest("POST", "/api/leads", {
        ...leadData,
        interest_tags: leadData.interest_tags.split(",").map(tag => tag.trim()).filter(tag => tag)
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

  const stageStats = {
    prospects: getLeadsByStage("prospect").length,
    qualified: getLeadsByStage("qualified").length,
    proposals: getLeadsByStage("proposal").length,
    closed_won: getLeadsByStage("closed_won").length,
  };

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Lead Pipeline Assistant</h2>
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
                  <Label htmlFor="name" className="text-right">
                    Name
                  </Label>
                  <Input
                    id="name"
                    value={newLead.name}
                    onChange={(e) => setNewLead({...newLead, name: e.target.value})}
                    className="col-span-3"
                    placeholder="Contact name"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="email" className="text-right">
                    Email
                  </Label>
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
                  <Label htmlFor="company" className="text-right">
                    Company
                  </Label>
                  <Input
                    id="company"
                    value={newLead.company}
                    onChange={(e) => setNewLead({...newLead, company: e.target.value})}
                    className="col-span-3"
                    placeholder="Company name"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="stage" className="text-right">
                    Stage
                  </Label>
                  <Select value={newLead.stage} onValueChange={(value) => setNewLead({...newLead, stage: value})}>
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select stage" />
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
                  <Label htmlFor="next_step" className="text-right">
                    Next Step
                  </Label>
                  <Input
                    id="next_step"
                    value={newLead.next_step}
                    onChange={(e) => setNewLead({...newLead, next_step: e.target.value})}
                    className="col-span-3"
                    placeholder="What's the next action?"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="interest_tags" className="text-right">
                    Interests
                  </Label>
                  <Input
                    id="interest_tags"
                    value={newLead.interest_tags}
                    onChange={(e) => setNewLead({...newLead, interest_tags: e.target.value})}
                    className="col-span-3"
                    placeholder="tech, finance, healthcare (comma separated)"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="how_heard" className="text-right">
                    How did you hear about 13D
                  </Label>
                  <Select value={newLead.how_heard} onValueChange={(value) => setNewLead({...newLead, how_heard: value})}>
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select source" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="referral">Referral</SelectItem>
                      <SelectItem value="website">Website</SelectItem>
                      <SelectItem value="social_media">Social Media</SelectItem>
                      <SelectItem value="conference">Conference/Event</SelectItem>
                      <SelectItem value="newsletter">Newsletter</SelectItem>
                      <SelectItem value="search_engine">Search Engine</SelectItem>
                      <SelectItem value="existing_client">Existing Client</SelectItem>
                      <SelectItem value="direct_outreach">Direct Outreach</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="notes" className="text-right">
                    Notes
                  </Label>
                  <Textarea
                    id="notes"
                    value={newLead.notes}
                    onChange={(e) => setNewLead({...newLead, notes: e.target.value})}
                    className="col-span-3"
                    placeholder="Additional notes..."
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
          
          {/* Search Bar */}
          <div className="mb-6">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                type="text"
                placeholder="Search prospects by name, company, email, or interests..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full"
              />
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
            const stageLabels = {
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
                                </div>
                                
                                <div className="flex items-center gap-4 mb-3">
                                  <span className="text-sm text-gray-600">{lead.email}</span>
                                  <div className="flex items-center gap-1">
                                    <span className="text-xs text-gray-500">Likelihood:</span>
                                    <Select 
                                      value={lead.likelihood_of_closing || "medium"} 
                                      onValueChange={(value) => updateLikelihoodMutation.mutate({leadId: lead.id, likelihood: value})}
                                    >
                                      <SelectTrigger className="w-20 h-7 text-xs">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="low">Low</SelectItem>
                                        <SelectItem value="medium">Med</SelectItem>
                                        <SelectItem value="high">High</SelectItem>
                                      </SelectContent>
                                    </Select>
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
      </div>
    </div>
  );
}
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                        onClick={() => deleteLeadMutation.mutate(lead.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 mb-1">{lead.name}</p>
                  <p className="text-xs text-gray-500 mt-1">{lead.next_step || "Schedule call"}</p>
                  {lead.interest_tags && lead.interest_tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {lead.interest_tags.slice(0, 2).map((tag, index) => (
                        <Badge key={index} className={getTagColor(tag)} variant="secondary">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                  {lead.how_heard && (
                    <p className="text-xs text-gray-500 mt-1">
                      <span className="font-medium">Source:</span> {lead.how_heard.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </p>
                  )}
                  <div className="mt-3 flex gap-1">
                    <Link href={`/lead/${lead.id}`} className="flex-1">
                      <Button size="sm" variant="outline" className="w-full text-xs">
                        View Details
                      </Button>
                    </Link>
                    <Button 
                      size="sm" 
                      className="text-xs px-2"
                      onClick={() => handleGenerateEmail(lead)}
                    >
                      <Bot className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Proposals Column */}
          <div className="bg-yellow-50 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-4 flex items-center">
              <span className="w-3 h-3 bg-amber-500 rounded-full mr-2"></span>
              Proposals ({stageStats.proposals})
            </h3>
            <div className="space-y-3">
              {getLeadsByStage("proposal").map((lead) => (
                <div key={lead.id} className="bg-white p-4 rounded-lg shadow-sm border border-yellow-200 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-medium text-gray-900 text-sm">{lead.company}</h4>
                    <Link href={`/lead/${lead.id}`}>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </Link>
                  </div>
                  <p className="text-xs text-gray-600 mb-1">{lead.name}</p>
                  <p className="text-xs text-gray-500 mt-1">{lead.notes || "Proposal sent"}</p>
                  {lead.how_heard && (
                    <p className="text-xs text-gray-500 mt-1">
                      <span className="font-medium">Source:</span> {lead.how_heard.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </p>
                  )}
                  <p className="text-xs text-gray-400 mt-2">Awaiting response</p>
                  <div className="mt-3 flex gap-1">
                    <Link href={`/lead/${lead.id}`} className="flex-1">
                      <Button size="sm" variant="outline" className="w-full text-xs">
                        View Details
                      </Button>
                    </Link>
                    <Button 
                      size="sm" 
                      className="text-xs px-2 border-amber-300 text-amber-700"
                      variant="outline"
                      onClick={() => handleGenerateEmail(lead)}
                    >
                      <Bot className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Closed Won Column */}
          <div className="bg-green-50 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-4 flex items-center">
              <span className="w-3 h-3 bg-green-600 rounded-full mr-2"></span>
              Closed Won ({stageStats.closed_won})
            </h3>
            <div className="space-y-3">
              {getLeadsByStage("closed_won").map((lead) => (
                <div key={lead.id} className="bg-white p-4 rounded-lg shadow-sm border border-green-200">
                  <h4 className="font-medium text-gray-900 text-sm">{lead.company}</h4>
                  <p className="text-xs text-gray-500 mt-1">Deal closed</p>
                  {lead.how_heard && (
                    <p className="text-xs text-gray-500 mt-1">
                      <span className="font-medium">Source:</span> {lead.how_heard.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </p>
                  )}
                  <p className="text-xs text-green-600 mt-2">Success!</p>
                  <div className="mt-3">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="w-full text-xs border-green-300 text-green-700"
                    >
                      Onboard client
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* AI Suggestions */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>AI-Powered Next Steps</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="border-l-4 border-blue-400 bg-blue-50 p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <Lightbulb className="h-5 w-5 text-primary" />
                    </div>
                    <div className="ml-3">
                      <h4 className="text-sm font-medium text-blue-800">High Priority Action</h4>
                      <p className="text-sm text-blue-700 mt-1">
                        Jane Doe (ABC Capital) - Send recent WILTW on gold prices before discovery call. Her notes indicate strong interest in precious metals.
                      </p>
                      <Button size="sm" className="mt-2 text-xs">
                        Draft Email
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="border-l-4 border-yellow-400 bg-yellow-50 p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <Clock className="h-5 w-5 text-amber-600" />
                    </div>
                    <div className="ml-3">
                      <h4 className="text-sm font-medium text-yellow-800">Timing Opportunity</h4>
                      <p className="text-sm text-yellow-700 mt-1">
                        Alpha Investments proposal is 3 days old. Best practice suggests sending a polite follow-up now.
                      </p>
                      <Button size="sm" variant="outline" className="mt-2 text-xs border-amber-300 text-amber-700">
                        Send Reminder
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="border-l-4 border-green-400 bg-green-50 p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <Target className="h-5 w-5 text-green-600" />
                    </div>
                    <div className="ml-3">
                      <h4 className="text-sm font-medium text-green-800">Content Match</h4>
                      <p className="text-sm text-green-700 mt-1">
                        Growth Partners shows interest in AI investing. Our latest WILTW #66 on tech trends is perfect for them.
                      </p>
                      <Button size="sm" variant="outline" className="mt-2 text-xs border-green-300 text-green-700">
                        Share Content
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="border-l-4 border-purple-400 bg-purple-50 p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <TrendingUp className="h-5 w-5 text-secondary" />
                    </div>
                    <div className="ml-3">
                      <h4 className="text-sm font-medium text-purple-800">Pipeline Health</h4>
                      <p className="text-sm text-purple-700 mt-1">
                        Consider adding more prospects to maintain healthy pipeline flow. Current conversion rate: 40%.
                      </p>
                      <Button size="sm" variant="outline" className="mt-2 text-xs border-purple-300 text-purple-700">
                        View Analytics
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Draft Email Preview */}
        {aiEmail && selectedLead && (
          <Card>
            <CardHeader>
              <CardTitle>AI-Generated Outreach Email</CardTitle>
              <p className="text-sm text-gray-500">For {selectedLead.name} - {selectedLead.company}</p>
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
              <div className="flex justify-end space-x-3">
                <Button variant="outline">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Draft
                </Button>
                <Button>
                  Send Email
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
