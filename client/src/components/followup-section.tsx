import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  AlertTriangle, 
  Clock, 
  TrendingUp,
  Edit,
  Send,
  Calendar,
  Settings
} from "lucide-react";
import { formatDate, getRiskLevelColor, formatPercent } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";

interface Client {
  id: number;
  name: string;
  email: string;
  company: string;
  subscriptionExpiry: string;
  engagementRate: string;
  riskLevel: string;
  interestTags: string[];
}

interface GeneratedEmail {
  subject: string;
  body: string;
  tone: string;
  priority: string;
}

export function FollowupSection() {
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [emailType, setEmailType] = useState<"renewal" | "upsell">("renewal");
  const [generatedEmail, setGeneratedEmail] = useState<GeneratedEmail | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: clients, isLoading } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const generateEmailMutation = useMutation({
    mutationFn: async ({ client, type }: { client: Client; type: "renewal" | "upsell" }) => {
      const response = await apiRequest("POST", "/api/generate-email", {
        type,
        clientName: client.name,
        context: {
          renewalDate: client.subscriptionExpiry,
          interestTags: client.interestTags,
          engagementRate: parseFloat(client.engagementRate),
          riskLevel: client.riskLevel,
        }
      });
      return response.json();
    },
    onSuccess: (data) => {
      setGeneratedEmail(data);
      setIsGenerating(false);
    },
    onError: () => {
      setIsGenerating(false);
    }
  });

  const handleGenerateEmail = (client: Client, type: "renewal" | "upsell") => {
    setSelectedClient(client);
    setEmailType(type);
    setIsGenerating(true);
    generateEmailMutation.mutate({ client, type });
  };

  if (isLoading) {
    return (
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
          <div className="animate-pulse space-y-8">
            <div className="h-8 bg-gray-200 rounded"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-gray-200 h-32 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const highRiskClients = clients?.filter(c => c.riskLevel === "high") || [];
  const mediumRiskClients = clients?.filter(c => c.riskLevel === "medium") || [];
  const upgradeCandidates = clients?.filter(c => parseFloat(c.engagementRate) > 80) || [];

  const getRenewalDays = (expiryDate: string): number => {
    const expiry = new Date(expiryDate);
    const today = new Date();
    return Math.floor((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  const getRecommendation = (client: Client): string => {
    const engagementRate = parseFloat(client.engagementRate);
    const renewalDays = getRenewalDays(client.subscriptionExpiry);
    
    if (client.riskLevel === "high") return "Schedule retention call urgently";
    if (renewalDays < 30 && engagementRate > 70) return "Emphasize content ROI in renewal";
    if (engagementRate > 80) return "Offer premium tier features";
    return "Standard renewal approach";
  };

  const scheduleItems = [
    {
      type: "urgent",
      client: "Quantum Holdings",
      action: "High-risk renewal - Send retention email today",
      color: "bg-red-50 border-red-200",
      textColor: "text-red-800",
      icon: AlertTriangle,
      buttons: [
        { text: "Send Now", style: "bg-red-600 hover:bg-red-700 text-white" },
        { text: "Schedule Later", style: "bg-white text-red-600 border border-red-300 hover:bg-red-50" }
      ]
    },
    {
      type: "scheduled",
      client: "Beta Fund",
      action: "Renewal follow-up scheduled for 10:00 AM",
      color: "bg-yellow-50 border-yellow-200",
      textColor: "text-yellow-800",
      icon: Clock,
      buttons: [
        { text: "Preview", style: "bg-yellow-600 hover:bg-yellow-700 text-white" },
        { text: "Reschedule", style: "bg-white text-yellow-600 border border-yellow-300 hover:bg-yellow-50" }
      ]
    },
    {
      type: "upsell",
      client: "TechStart Inc",
      action: "Premium upgrade proposal scheduled for Thursday",
      color: "bg-green-50 border-green-200",
      textColor: "text-green-800",
      icon: TrendingUp,
      buttons: [
        { text: "Preview", style: "bg-green-600 hover:bg-green-700 text-white" },
        { text: "Modify", style: "bg-white text-green-600 border border-green-300 hover:bg-green-50" }
      ]
    }
  ];

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
                  <p className="text-2xl font-bold text-red-600">{highRiskClients.length}</p>
                </div>
                <div className="p-3 bg-red-100 rounded-full">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
              </div>
              <div className="mt-2">
                <span className="text-xs text-red-600">Immediate attention required</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Medium Risk</p>
                  <p className="text-2xl font-bold text-yellow-600">{mediumRiskClients.length}</p>
                </div>
                <div className="p-3 bg-yellow-100 rounded-full">
                  <Clock className="h-6 w-6 text-yellow-600" />
                </div>
              </div>
              <div className="mt-2">
                <span className="text-xs text-yellow-600">Monitor closely</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Upgrade Candidates</p>
                  <p className="text-2xl font-bold text-green-600">{upgradeCandidates.length}</p>
                </div>
                <div className="p-3 bg-green-100 rounded-full">
                  <TrendingUp className="h-6 w-6 text-green-600" />
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Client
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Renewal Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Engagement
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Risk Level
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      AI Recommendation
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {clients?.slice(0, 4).map((client) => {
                    const renewalDays = getRenewalDays(client.subscriptionExpiry);
                    const isUpgradeCandidate = parseFloat(client.engagementRate) > 80;
                    
                    return (
                      <tr key={client.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {client.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(client.subscriptionExpiry)} ({renewalDays} days)
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={
                            parseFloat(client.engagementRate) > 70 ? "text-green-600" :
                            parseFloat(client.engagementRate) > 50 ? "text-primary" :
                            "text-yellow-600"
                          }>
                            {client.riskLevel === "high" ? "Low" : "High"} ({formatPercent(parseFloat(client.engagementRate))})
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge className={
                            isUpgradeCandidate ? "bg-green-100 text-green-800" :
                            getRiskLevelColor(client.riskLevel)
                          }>
                            {isUpgradeCandidate ? "Upgrade Candidate" : 
                             client.riskLevel === "high" ? "High Risk" :
                             client.riskLevel === "medium" ? "Medium Risk" : "Low Risk"}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {getRecommendation(client)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className={
                              isUpgradeCandidate ? "text-green-700 hover:text-green-900 bg-green-50" :
                              client.riskLevel === "high" ? "text-red-700 hover:text-red-900 bg-red-50" :
                              "text-primary hover:text-blue-900 bg-blue-50"
                            }
                            onClick={() => handleGenerateEmail(client, isUpgradeCandidate ? "upsell" : "renewal")}
                            disabled={isGenerating}
                          >
                            {isGenerating && selectedClient?.id === client.id ? "Generating..." :
                             isUpgradeCandidate ? "Draft Upsell" :
                             client.riskLevel === "high" ? "Urgent Follow-up" :
                             "Draft Renewal"}
                          </Button>
                          <Button variant="ghost" size="sm">
                            View Details
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Generated Email Preview */}
        {generatedEmail && selectedClient && (
          <Card className="mb-8">
            <CardHeader className={emailType === "upsell" ? "bg-green-50" : ""}>
              <CardTitle>
                AI-Generated {emailType === "upsell" ? "Upsell" : "Renewal"} Email
              </CardTitle>
              <p className="text-sm text-gray-500">
                For {selectedClient.name} - {emailType === "upsell" ? "Upgrade Candidate" : `${selectedClient.riskLevel} Risk Client`}
              </p>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <div className="mb-4">
                  <Label className="text-sm font-medium text-gray-700 mb-2">Subject:</Label>
                  <Input 
                    value={generatedEmail.subject}
                    readOnly
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2">Email Body:</Label>
                  <Textarea
                    value={generatedEmail.body}
                    readOnly
                    className="mt-2 min-h-[200px]"
                  />
                </div>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center text-sm text-gray-500">
                  <Clock className="h-4 w-4 mr-2" />
                  Best send time: Tuesday 10 AM
                </div>
                <div className="flex space-x-3">
                  <Button variant="outline">
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                  <Button className={emailType === "upsell" ? "bg-green-600 hover:bg-green-700" : ""}>
                    <Send className="h-4 w-4 mr-2" />
                    Send
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Follow-up Schedule */}
        <Card>
          <CardHeader>
            <CardTitle>Automated Follow-up Schedule</CardTitle>
            <p className="text-sm text-gray-500">AI-managed communication timeline</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {scheduleItems.map((item, index) => {
                const Icon = item.icon;
                return (
                  <div key={index} className={`flex items-center justify-between p-4 rounded-lg border ${item.color}`}>
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <Icon className={`h-5 w-5 ${item.textColor}`} />
                      </div>
                      <div className="ml-4">
                        <h4 className={`text-sm font-medium ${item.textColor}`}>
                          {index === 0 ? "Urgent: " : index === 1 ? "Tomorrow: " : "Next Week: "}
                          {item.client}
                        </h4>
                        <p className={`text-sm ${item.textColor.replace('800', '700')}`}>
                          {item.action}
                        </p>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      {item.buttons.map((button, btnIndex) => (
                        <Button key={btnIndex} size="sm" className={`text-xs ${button.style}`}>
                          {button.text}
                        </Button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
