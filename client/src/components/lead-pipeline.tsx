import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Target, 
  Lightbulb, 
  Clock, 
  TrendingUp,
  Edit,
  Bot
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

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
}

interface AIEmailResponse {
  subject: string;
  body: string;
}

export default function LeadPipeline() {
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [aiEmail, setAiEmail] = useState<AIEmailResponse | null>(null);
  const [isGeneratingEmail, setIsGeneratingEmail] = useState(false);
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

  const getLeadsByStage = (stage: string) => {
    return leads?.filter(lead => lead.stage === stage) || [];
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
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Lead Pipeline Assistant</h2>
          <p className="text-gray-600">Manage prospects and automate next-step recommendations</p>
        </div>

        {/* Pipeline Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <p className="text-sm font-medium text-gray-600">Prospects</p>
                <p className="text-2xl font-bold text-gray-400">{stageStats.prospects}</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <p className="text-sm font-medium text-gray-600">Qualified Leads</p>
                <p className="text-2xl font-bold text-primary">{stageStats.qualified}</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <p className="text-sm font-medium text-gray-600">Proposals</p>
                <p className="text-2xl font-bold text-amber-500">{stageStats.proposals}</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <p className="text-sm font-medium text-gray-600">Closed Won</p>
                <p className="text-2xl font-bold text-green-600">{stageStats.closed_won}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Pipeline Board */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
          {/* Prospects Column */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-4 flex items-center">
              <span className="w-3 h-3 bg-gray-400 rounded-full mr-2"></span>
              Prospects ({stageStats.prospects})
            </h3>
            <div className="space-y-3">
              {getLeadsByStage("prospect").map((lead) => (
                <div key={lead.id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                  <h4 className="font-medium text-gray-900 text-sm">{lead.company}</h4>
                  <p className="text-xs text-gray-500 mt-1">{lead.next_step || "Initial contact"}</p>
                  {lead.last_contact && (
                    <p className="text-xs text-gray-400 mt-2">
                      {new Date(lead.last_contact).toLocaleDateString()}
                    </p>
                  )}
                  <div className="mt-3">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="w-full text-xs"
                      onClick={() => handleGenerateEmail(lead)}
                    >
                      Send intro email
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Qualified Leads Column */}
          <div className="bg-blue-50 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-4 flex items-center">
              <span className="w-3 h-3 bg-primary rounded-full mr-2"></span>
              Qualified ({stageStats.qualified})
            </h3>
            <div className="space-y-3">
              {getLeadsByStage("qualified").map((lead) => (
                <div key={lead.id} className="bg-white p-4 rounded-lg shadow-sm border border-blue-200">
                  <h4 className="font-medium text-gray-900 text-sm">{lead.name} - {lead.company}</h4>
                  <p className="text-xs text-gray-500 mt-1">{lead.next_step || "Schedule call"}</p>
                  {lead.interest_tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {lead.interest_tags.slice(0, 2).map((tag, index) => (
                        <Badge key={index} className={getTagColor(tag)} variant="secondary">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                  <div className="mt-3">
                    <Button 
                      size="sm" 
                      className="w-full text-xs"
                      onClick={() => handleGenerateEmail(lead)}
                    >
                      <Bot className="h-3 w-3 mr-1" />
                      Generate Outreach
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
                <div key={lead.id} className="bg-white p-4 rounded-lg shadow-sm border border-yellow-200">
                  <h4 className="font-medium text-gray-900 text-sm">{lead.company}</h4>
                  <p className="text-xs text-gray-500 mt-1">{lead.notes || "Proposal sent"}</p>
                  <p className="text-xs text-gray-400 mt-2">Awaiting response</p>
                  <div className="mt-3">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="w-full text-xs border-amber-300 text-amber-700"
                    >
                      Send reminder
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
