import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/queryClient";
import { Lightbulb, Clock, Target, BarChart3, Edit, Send, Users } from "lucide-react";
import { formatEmailBody } from "@/lib/openai";

export default function PipelineSection() {
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [emailPreview, setEmailPreview] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedSubject, setEditedSubject] = useState("");
  const [editedBody, setEditedBody] = useState("");

  const queryClient = useQueryClient();

  const { data: leads, isLoading } = useQuery({
    queryKey: ["/api/leads"],
  });

  const generateEmailMutation = useMutation({
    mutationFn: async (leadData: any) => {
      const response = await apiRequest("/api/ai/generate-email", "POST", {
        type: "lead_outreach",
        leadId: leadData.id,
        context: {
          stage: leadData.stage,
          nextStep: leadData.nextStep,
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

  const handleGenerateEmail = (lead: any) => {
    setSelectedLead(lead);
    generateEmailMutation.mutate(lead);
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

  if (isLoading) {
    return (
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
          <div className="animate-pulse">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-white h-32 rounded-lg shadow" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const prospects = leads?.filter((lead: any) => lead.stage === "prospect") || [];
  const qualified = leads?.filter((lead: any) => lead.stage === "qualified") || [];
  const proposals = leads?.filter((lead: any) => lead.stage === "proposal") || [];
  const closedWon = leads?.filter((lead: any) => lead.stage === "closed_won") || [];

  const getStageColor = (stage: string) => {
    switch (stage) {
      case "prospect": return "bg-gray-50";
      case "qualified": return "bg-blue-50";
      case "proposal": return "bg-yellow-50";
      case "closed_won": return "bg-green-50";
      default: return "bg-gray-50";
    }
  };

  const getStageBorderColor = (stage: string) => {
    switch (stage) {
      case "prospect": return "border-gray-200";
      case "qualified": return "border-blue-200";
      case "proposal": return "border-yellow-200";
      case "closed_won": return "border-green-200";
      default: return "border-gray-200";
    }
  };

  const getStageButtonColor = (stage: string) => {
    switch (stage) {
      case "prospect": return "bg-gray-100 text-gray-700 hover:bg-gray-200";
      case "qualified": return "bg-blue-600 text-white hover:bg-blue-700";
      case "proposal": return "bg-yellow-600 text-white hover:bg-yellow-700";
      case "closed_won": return "bg-green-600 text-white hover:bg-green-700";
      default: return "bg-gray-100 text-gray-700 hover:bg-gray-200";
    }
  };

  const getInterestTags = (tags: string[] = []) => {
    return tags.map((tag, index) => (
      <Badge key={index} variant="outline" className="text-xs">
        {tag}
      </Badge>
    ));
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
                <p className="text-2xl font-bold text-gray-400">{prospects.length}</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <p className="text-sm font-medium text-gray-600">Qualified Leads</p>
                <p className="text-2xl font-bold text-blue-600">{qualified.length}</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <p className="text-sm font-medium text-gray-600">Proposals</p>
                <p className="text-2xl font-bold text-yellow-600">{proposals.length}</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <p className="text-sm font-medium text-gray-600">Closed Won</p>
                <p className="text-2xl font-bold text-green-600">{closedWon.length}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Pipeline Board */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
          {/* Prospects Column */}
          <div className={`${getStageColor("prospect")} rounded-lg p-4`}>
            <h3 className="font-medium text-gray-900 mb-4 flex items-center">
              <span className="w-3 h-3 bg-gray-400 rounded-full mr-2"></span>
              Prospects ({prospects.length})
            </h3>
            <div className="space-y-3">
              {prospects.slice(0, 2).map((lead: any) => (
                <div key={lead.id} className={`bg-white p-4 rounded-lg shadow-sm border ${getStageBorderColor(lead.stage)}`}>
                  <h4 className="font-medium text-gray-900 text-sm">{lead.company}</h4>
                  <p className="text-xs text-gray-500 mt-1">{lead.nextStep}</p>
                  <p className="text-xs text-gray-400 mt-2">
                    {lead.lastContact ? `${Math.floor((Date.now() - new Date(lead.lastContact).getTime()) / (1000 * 60 * 60 * 24))} days ago` : "New"}
                  </p>
                  <div className="mt-3">
                    <Button 
                      size="sm" 
                      className={`w-full text-xs ${getStageButtonColor(lead.stage)}`}
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
          <div className={`${getStageColor("qualified")} rounded-lg p-4`}>
            <h3 className="font-medium text-gray-900 mb-4 flex items-center">
              <span className="w-3 h-3 bg-blue-600 rounded-full mr-2"></span>
              Qualified ({qualified.length})
            </h3>
            <div className="space-y-3">
              {qualified.slice(0, 2).map((lead: any) => (
                <div key={lead.id} className={`bg-white p-4 rounded-lg shadow-sm border ${getStageBorderColor(lead.stage)}`}>
                  <h4 className="font-medium text-gray-900 text-sm">{lead.name} - {lead.company}</h4>
                  <p className="text-xs text-gray-500 mt-1">{lead.nextStep}</p>
                  <div className="flex flex-wrap gap-1 text-xs text-blue-600 mt-1">
                    {getInterestTags(lead.interestTags)}
                  </div>
                  <p className="text-xs text-gray-400 mt-2">Next: {lead.nextStep}</p>
                  <div className="mt-3">
                    <Button 
                      size="sm" 
                      className={`w-full text-xs ${getStageButtonColor(lead.stage)}`}
                      onClick={() => handleGenerateEmail(lead)}
                    >
                      Draft outreach
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Proposals Column */}
          <div className={`${getStageColor("proposal")} rounded-lg p-4`}>
            <h3 className="font-medium text-gray-900 mb-4 flex items-center">
              <span className="w-3 h-3 bg-yellow-600 rounded-full mr-2"></span>
              Proposals ({proposals.length})
            </h3>
            <div className="space-y-3">
              {proposals.slice(0, 2).map((lead: any) => (
                <div key={lead.id} className={`bg-white p-4 rounded-lg shadow-sm border ${getStageBorderColor(lead.stage)}`}>
                  <h4 className="font-medium text-gray-900 text-sm">{lead.company}</h4>
                  <p className="text-xs text-gray-500 mt-1">
                    ${lead.proposalValue ? parseFloat(lead.proposalValue).toLocaleString() : "0"} proposal sent
                  </p>
                  <p className="text-xs text-gray-400 mt-2">
                    {lead.lastContact ? `${Math.floor((Date.now() - new Date(lead.lastContact).getTime()) / (1000 * 60 * 60 * 24))} days ago` : "Recent"}
                  </p>
                  <div className="mt-3">
                    <Button 
                      size="sm" 
                      className={`w-full text-xs ${getStageButtonColor(lead.stage)}`}
                      onClick={() => handleGenerateEmail(lead)}
                    >
                      Send reminder
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Closed Won Column */}
          <div className={`${getStageColor("closed_won")} rounded-lg p-4`}>
            <h3 className="font-medium text-gray-900 mb-4 flex items-center">
              <span className="w-3 h-3 bg-green-600 rounded-full mr-2"></span>
              Closed Won ({closedWon.length})
            </h3>
            <div className="space-y-3">
              {closedWon.slice(0, 2).map((lead: any) => (
                <div key={lead.id} className={`bg-white p-4 rounded-lg shadow-sm border ${getStageBorderColor(lead.stage)}`}>
                  <h4 className="font-medium text-gray-900 text-sm">{lead.company}</h4>
                  <p className="text-xs text-gray-500 mt-1">
                    ${lead.proposalValue ? parseFloat(lead.proposalValue).toLocaleString() : "0"} annual subscription
                  </p>
                  <p className="text-xs text-green-600 mt-2">
                    Signed {lead.lastContact ? new Date(lead.lastContact).toLocaleDateString() : "recently"}
                  </p>
                  <div className="mt-3">
                    <Button 
                      size="sm" 
                      className={`w-full text-xs ${getStageButtonColor(lead.stage)}`}
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
                      <Lightbulb className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="ml-3">
                      <h4 className="text-sm font-medium text-blue-800">High Priority Action</h4>
                      <p className="text-sm text-blue-700 mt-1">
                        Jane Doe (ABC Capital) - Send recent WILTW on gold prices before discovery call. 
                        Her notes indicate strong interest in precious metals.
                      </p>
                      <Button 
                        size="sm" 
                        className="mt-2 bg-blue-600 hover:bg-blue-700"
                        onClick={() => {
                          const jane = qualified.find((lead: any) => lead.name === "Jane Doe");
                          if (jane) handleGenerateEmail(jane);
                        }}
                      >
                        Draft Email
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="border-l-4 border-yellow-400 bg-yellow-50 p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <Clock className="h-5 w-5 text-yellow-600" />
                    </div>
                    <div className="ml-3">
                      <h4 className="text-sm font-medium text-yellow-800">Timing Opportunity</h4>
                      <p className="text-sm text-yellow-700 mt-1">
                        Alpha Investments proposal is 3 days old. Best practice suggests sending a polite follow-up now.
                      </p>
                      <Button size="sm" className="mt-2 bg-yellow-600 hover:bg-yellow-700">
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
                      <Button size="sm" className="mt-2 bg-green-600 hover:bg-green-700">
                        Share Content
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="border-l-4 border-purple-400 bg-purple-50 p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <BarChart3 className="h-5 w-5 text-purple-600" />
                    </div>
                    <div className="ml-3">
                      <h4 className="text-sm font-medium text-purple-800">Pipeline Health</h4>
                      <p className="text-sm text-purple-700 mt-1">
                        Consider adding more prospects to maintain healthy pipeline flow. Current conversion rate: 40%.
                      </p>
                      <Button size="sm" className="mt-2 bg-purple-600 hover:bg-purple-700">
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
        {emailPreview && (
          <Card>
            <CardHeader>
              <CardTitle>AI-Generated Outreach Email</CardTitle>
              <p className="text-sm text-gray-500">
                For {selectedLead?.name} - {selectedLead?.company}
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
