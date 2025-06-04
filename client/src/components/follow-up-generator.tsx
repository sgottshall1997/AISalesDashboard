import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  AlertTriangle, 
  Clock, 
  ArrowUp,
  TrendingUp,
  Edit,
  Mail,
  Calendar,
  TriangleAlert
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

interface Client {
  id: number;
  name: string;
  company: string;
  email: string;
  subscription_type: string;
  renewal_date: string;
  engagement_rate: string;
  click_rate: string;
  interest_tags: string[];
  risk_level: "low" | "medium" | "high";
  notes?: string;
}

interface AIEmailResponse {
  subject: string;
  body: string;
  bestSendTime?: string;
  upgradeProb?: number;
}

export default function FollowUpGenerator() {
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [emailType, setEmailType] = useState<"renewal" | "upsell">("renewal");
  const [aiEmail, setAiEmail] = useState<AIEmailResponse | null>(null);
  const [isGeneratingEmail, setIsGeneratingEmail] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: clients } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const generateEmailMutation = useMutation({
    mutationFn: async ({ clientId, type }: { clientId: number; type: string }) => {
      const response = await apiRequest("POST", "/api/ai/generate-follow-up", {
        clientId,
        emailType: type
      });
      return response.json();
    },
    onSuccess: (data) => {
      setAiEmail(data);
      setIsGeneratingEmail(false);
      toast({
        title: "AI Email Generated",
        description: `${emailType === "renewal" ? "Renewal" : "Upsell"} email has been generated successfully.`,
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

  const updateClientMutation = useMutation({
    mutationFn: async ({ clientId, updates }: { clientId: number; updates: any }) => {
      const response = await apiRequest("PATCH", `/api/clients/${clientId}`, updates);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      toast({
        title: "Client Updated",
        description: "Client risk level has been updated successfully.",
      });
    },
  });

  const handleGenerateEmail = (client: Client, type: "renewal" | "upsell") => {
    setSelectedClient(client);
    setEmailType(type);
    setIsGeneratingEmail(true);
    generateEmailMutation.mutate({ clientId: client.id, type });
  };

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case "high":
        return "bg-red-100 text-red-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-green-100 text-green-800";
    }
  };

  const getRiskIcon = (riskLevel: string) => {
    switch (riskLevel) {
      case "high":
        return <AlertTriangle className="h-6 w-6 text-destructive" />;
      case "medium":
        return <Clock className="h-6 w-6 text-amber-600" />;
      default:
        return <ArrowUp className="h-6 w-6 text-green-600" />;
    }
  };

  const getDaysToRenewal = (renewalDate: string) => {
    const days = Math.ceil((new Date(renewalDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return days;
  };

  const riskStats = {
    high: clients?.filter(c => c.risk_level === "high").length || 0,
    medium: clients?.filter(c => c.risk_level === "medium").length || 0,
    upgrade: clients?.filter(c => c.risk_level === "low" && parseFloat(c.engagement_rate) > 80).length || 0,
  };

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Follow-Up Generator</h2>
          <p className="text-gray-600">Automate renewal and upsell communications with AI-powered personalization</p>
        </div>

        {/* Risk Assessment Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">High Risk Accounts</p>
                  <p className="text-2xl font-bold text-destructive">{riskStats.high}</p>
                </div>
                <div className="p-3 bg-red-100 rounded-full">
                  <AlertTriangle className="h-6 w-6 text-destructive" />
                </div>
              </div>
              <div className="mt-2">
                <span className="text-xs text-destructive">Immediate attention required</span>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Medium Risk</p>
                  <p className="text-2xl font-bold text-amber-600">{riskStats.medium}</p>
                </div>
                <div className="p-3 bg-yellow-100 rounded-full">
                  <Clock className="h-6 w-6 text-amber-600" />
                </div>
              </div>
              <div className="mt-2">
                <span className="text-xs text-amber-600">Monitor closely</span>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Upgrade Candidates</p>
                  <p className="text-2xl font-bold text-green-600">{riskStats.upgrade}</p>
                </div>
                <div className="p-3 bg-green-100 rounded-full">
                  <ArrowUp className="h-6 w-6 text-green-600" />
                </div>
              </div>
              <div className="mt-2">
                <span className="text-xs text-green-600">Upsell opportunities</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Client Risk Assessment Table */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Client Risk Assessment</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Renewal Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Engagement</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Risk Level</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">AI Recommendation</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {clients?.map((client) => {
                    const daysToRenewal = getDaysToRenewal(client.renewal_date);
                    const isUpgradeCandidate = client.risk_level === "low" && parseFloat(client.engagement_rate) > 80;
                    
                    return (
                      <tr key={client.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {client.company}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(client.renewal_date).toLocaleDateString()} ({daysToRenewal} days)
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={`${parseFloat(client.engagement_rate) > 70 ? "text-green-600" : 
                                          parseFloat(client.engagement_rate) > 50 ? "text-primary" : "text-amber-600"}`}>
                            {parseFloat(client.engagement_rate)}%
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge className={getRiskColor(isUpgradeCandidate ? "upgrade" : client.risk_level)}>
                            {isUpgradeCandidate ? "Upgrade Candidate" : `${client.risk_level} risk`}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {client.risk_level === "high" ? "Schedule retention call urgently" :
                           client.risk_level === "medium" ? "Emphasize content value & ROI" :
                           isUpgradeCandidate ? "Offer premium tier features" :
                           "Standard renewal approach"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                          <Button
                            size="sm"
                            variant={client.risk_level === "high" ? "destructive" : "outline"}
                            onClick={() => handleGenerateEmail(client, "renewal")}
                            disabled={isGeneratingEmail}
                          >
                            {client.risk_level === "high" ? "Urgent Follow-up" : "Draft Renewal"}
                          </Button>
                          {isUpgradeCandidate && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-green-300 text-green-700"
                              onClick={() => handleGenerateEmail(client, "upsell")}
                              disabled={isGeneratingEmail}
                            >
                              Draft Upsell
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* AI Follow-up Templates */}
        {aiEmail && selectedClient && (
          <div className="grid grid-cols-1 lg:grid-cols-1 gap-8 mb-8">
            <Card className={emailType === "upsell" ? "border-green-200" : ""}>
              <CardHeader className={emailType === "upsell" ? "bg-green-50" : ""}>
                <CardTitle>
                  AI-Generated {emailType === "renewal" ? "Renewal" : "Upsell"} Email
                </CardTitle>
                <p className="text-sm text-gray-500">
                  For {selectedClient.company} - {emailType === "renewal" ? "Medium Risk Client" : "Upgrade Candidate"}
                </p>
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
                      className="bg-white mt-2 min-h-[300px]"
                    />
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  {aiEmail.bestSendTime && (
                    <div className="flex items-center text-sm text-gray-500">
                      <Clock className="h-4 w-4 mr-2" />
                      Best send time: {aiEmail.bestSendTime}
                    </div>
                  )}
                  {aiEmail.upgradeProb && (
                    <div className="flex items-center text-sm text-gray-500">
                      <TrendingUp className="h-4 w-4 mr-2" />
                      Upgrade probability: {aiEmail.upgradeProb}%
                    </div>
                  )}
                  <div className="flex space-x-3">
                    <Button variant="outline">
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                    <Button className={emailType === "upsell" ? "bg-green-600 hover:bg-green-700" : ""}>
                      Send
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Follow-up Schedule */}
        <Card>
          <CardHeader>
            <CardTitle>Automated Follow-up Schedule</CardTitle>
            <p className="text-sm text-gray-500">AI-managed communication timeline</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <TriangleAlert className="h-5 w-5 text-destructive" />
                  </div>
                  <div className="ml-4">
                    <h4 className="text-sm font-medium text-red-800">Urgent: Quantum Holdings</h4>
                    <p className="text-sm text-red-700">High-risk renewal - Send retention email today</p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button variant="destructive" size="sm">
                    Send Now
                  </Button>
                  <Button variant="outline" size="sm">
                    Schedule Later
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Clock className="h-5 w-5 text-amber-600" />
                  </div>
                  <div className="ml-4">
                    <h4 className="text-sm font-medium text-yellow-800">Tomorrow: Beta Fund</h4>
                    <p className="text-sm text-yellow-700">Renewal follow-up scheduled for 10:00 AM</p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm" className="border-amber-300 text-amber-700">
                    Preview
                  </Button>
                  <Button variant="outline" size="sm" className="border-amber-300 text-amber-700">
                    Reschedule
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <ArrowUp className="h-5 w-5 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <h4 className="text-sm font-medium text-green-800">Next Week: TechStart Inc</h4>
                    <p className="text-sm text-green-700">Premium upgrade proposal scheduled for Thursday</p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm" className="border-green-300 text-green-700">
                    Preview
                  </Button>
                  <Button variant="outline" size="sm" className="border-green-300 text-green-700">
                    Modify
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Mail className="h-5 w-5 text-primary" />
                  </div>
                  <div className="ml-4">
                    <h4 className="text-sm font-medium text-blue-800">June 20: GlobalFund LLC</h4>
                    <p className="text-sm text-blue-700">Standard renewal reminder - low risk client</p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm">
                    Preview
                  </Button>
                  <Button variant="outline" size="sm">
                    Edit
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
