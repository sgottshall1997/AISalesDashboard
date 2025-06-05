import { useState } from "react";
import { useParams, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Mail, User, Building, Calendar, Tag, MessageSquare, Sparkles, Send, Trash2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Client, Lead } from "@shared/schema";

interface ClientWithDetails extends Client {
  // Additional client fields from CSV upload
}

interface LeadWithDetails extends Lead {
  // Additional lead fields from CSV upload
}

interface EmailHistory {
  id: number;
  client_id: number;
  subject: string;
  body: string;
  sent_date: string;
  response_received: boolean;
  notes?: string;
}

interface AIEmailResponse {
  subject: string;
  body: string;
  keyPoints: string[];
  reportReferences: string[];
  bestSendTime?: string;
}

export default function ClientDetail() {
  const { id } = useParams();
  const [aiEmail, setAiEmail] = useState<AIEmailResponse | null>(null);
  const [isGeneratingEmail, setIsGeneratingEmail] = useState(false);
  const [newEmailSubject, setNewEmailSubject] = useState("");
  const [newEmailBody, setNewEmailBody] = useState("");
  const [emailNotes, setEmailNotes] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Try to get client first, then lead if not found
  const { data: client, isLoading: clientLoading } = useQuery<ClientWithDetails>({
    queryKey: ["/api/clients", id],
    enabled: !!id,
  });

  const { data: lead, isLoading: leadLoading } = useQuery<LeadWithDetails>({
    queryKey: ["/api/leads", id],
    enabled: !!id && !client,
  });

  const { data: emailHistory, isLoading: emailLoading } = useQuery<EmailHistory[]>({
    queryKey: ["/api/email-history", id],
    enabled: !!id,
  });

  const { data: contentReports } = useQuery({
    queryKey: ["/api/content-reports"],
  });

  const generateEmailMutation = useMutation({
    mutationFn: async () => {
      const clientData = client || lead;
      if (!clientData) throw new Error("No client data found");

      const response = await apiRequest("POST", "/api/generate-client-email", {
        clientId: id,
        clientName: clientData.name,
        company: clientData.company,
        interests: clientData.interest_tags || [],
        emailHistory: emailHistory || [],
        webInterests: clientData.interest_tags || []
      });
      return response;
    },
    onSuccess: (data) => {
      setAiEmail(data);
      setNewEmailSubject(data.subject);
      setNewEmailBody(data.body);
      toast({
        title: "AI Email Generated",
        description: "Personalized email created based on client interests and report data",
      });
    },
    onError: () => {
      toast({
        title: "Generation Failed",
        description: "Failed to generate AI email. Please try again.",
        variant: "destructive",
      });
    },
  });

  const saveEmailMutation = useMutation({
    mutationFn: async (emailData: {
      subject: string;
      body: string;
      notes?: string;
    }) => {
      return apiRequest("POST", `/api/clients/${id}/emails`, {
        subject: emailData.subject,
        body: emailData.body,
        notes: emailData.notes,
        sent_date: new Date().toISOString(),
        response_received: false
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/email-history", id] });
      setNewEmailSubject("");
      setNewEmailBody("");
      setEmailNotes("");
      setAiEmail(null);
      toast({
        title: "Email Saved",
        description: "Email has been saved to client history",
      });
    },
  });

  const deleteEmailMutation = useMutation({
    mutationFn: async (emailId: number) => {
      return apiRequest("DELETE", `/api/email-history/${emailId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/email-history", id] });
      toast({
        title: "Email Deleted",
        description: "Email has been removed from history",
      });
    },
  });

  const isLoading = clientLoading || leadLoading;
  const clientData = client || lead;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading client details...</p>
        </div>
      </div>
    );
  }

  if (!clientData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Client Not Found</h1>
          <p className="text-gray-600 mb-6">The requested client could not be found.</p>
          <Link href="/">
            <Button>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const handleGenerateEmail = () => {
    setIsGeneratingEmail(true);
    generateEmailMutation.mutate();
    setIsGeneratingEmail(false);
  };

  const handleSaveEmail = () => {
    if (!newEmailSubject.trim() || !newEmailBody.trim()) {
      toast({
        title: "Missing Information",
        description: "Please enter both subject and email body",
        variant: "destructive",
      });
      return;
    }

    saveEmailMutation.mutate({
      subject: newEmailSubject,
      body: newEmailBody,
      notes: emailNotes
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <Link href="/">
                <Button variant="ghost" size="sm" className="mr-4">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Dashboard
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{clientData.name}</h1>
                <p className="text-gray-600">{clientData.company}</p>
              </div>
            </div>
            <Button 
              onClick={handleGenerateEmail}
              disabled={isGeneratingEmail || generateEmailMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              {isGeneratingEmail ? "Generating..." : "Generate AI Email"}
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Client Overview</TabsTrigger>
            <TabsTrigger value="emails">Email History</TabsTrigger>
            <TabsTrigger value="compose">Compose Email</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Client Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="w-5 h-5" />
                    Client Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Name</Label>
                    <p className="font-medium">{clientData.name}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Email</Label>
                    <p className="font-medium">{clientData.email}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Company</Label>
                    <p className="font-medium">{clientData.company}</p>
                  </div>
                  {client && (
                    <>
                      <div>
                        <Label className="text-sm font-medium text-gray-500">Subscription Type</Label>
                        <p className="font-medium">{client.subscription_type || 'N/A'}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-500">Engagement Rate</Label>
                        <p className="font-medium">{client.engagement_rate || 'N/A'}</p>
                      </div>
                    </>
                  )}
                  {lead && (
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Stage</Label>
                      <Badge variant="outline">{lead.stage}</Badge>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Interests & Notes */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Tag className="w-5 h-5" />
                    Interests & Notes
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Web Interests</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {clientData.interest_tags?.map((tag, index) => (
                        <Badge key={index} variant="secondary">{tag}</Badge>
                      ))}
                    </div>
                  </div>
                  {clientData.notes && (
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Notes</Label>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{clientData.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="emails" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="w-5 h-5" />
                  Email History
                </CardTitle>
                <CardDescription>
                  All email communications with this client
                </CardDescription>
              </CardHeader>
              <CardContent>
                {emailLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-2 text-gray-600">Loading email history...</p>
                  </div>
                ) : emailHistory && emailHistory.length > 0 ? (
                  <div className="space-y-4">
                    {emailHistory.map((email) => (
                      <div key={email.id} className="border rounded-lg p-4 bg-gray-50">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-medium">{email.subject}</h4>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-500">
                              {new Date(email.sent_date).toLocaleDateString()}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteEmailMutation.mutate(email.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap mb-2">{email.body}</p>
                        {email.notes && (
                          <p className="text-xs text-gray-500">Notes: {email.notes}</p>
                        )}
                        <div className="mt-2">
                          <Badge variant={email.response_received ? "default" : "secondary"}>
                            {email.response_received ? "Response Received" : "No Response"}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No email history found</p>
                    <p className="text-sm text-gray-500">Start a conversation to see emails here</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="compose" className="space-y-6">
            {/* AI Generated Email Preview */}
            {aiEmail && (
              <Card className="border-blue-200 bg-blue-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-blue-700">
                    <Sparkles className="w-5 h-5" />
                    AI Generated Email
                  </CardTitle>
                  <CardDescription>
                    Personalized email based on client interests and recent reports
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {aiEmail.keyPoints && aiEmail.keyPoints.length > 0 && (
                    <div>
                      <Label className="text-sm font-medium text-blue-700">Key Discussion Points</Label>
                      <ul className="mt-2 text-sm text-blue-600 list-disc list-inside">
                        {aiEmail.keyPoints.map((point, index) => (
                          <li key={index}>{point}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {aiEmail.reportReferences && aiEmail.reportReferences.length > 0 && (
                    <div>
                      <Label className="text-sm font-medium text-blue-700">Referenced Reports</Label>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {aiEmail.reportReferences.map((report, index) => (
                          <Badge key={index} variant="outline" className="border-blue-300 text-blue-700">
                            {report}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Email Composition */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Send className="w-5 h-5" />
                  Compose Email
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="subject">Subject</Label>
                  <Input
                    id="subject"
                    value={newEmailSubject}
                    onChange={(e) => setNewEmailSubject(e.target.value)}
                    placeholder="Email subject"
                  />
                </div>
                
                <div>
                  <Label htmlFor="body">Email Body</Label>
                  <Textarea
                    id="body"
                    value={newEmailBody}
                    onChange={(e) => setNewEmailBody(e.target.value)}
                    placeholder="Write your email message..."
                    rows={8}
                  />
                </div>
                
                <div>
                  <Label htmlFor="notes">Internal Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    value={emailNotes}
                    onChange={(e) => setEmailNotes(e.target.value)}
                    placeholder="Add internal notes about this email..."
                    rows={3}
                  />
                </div>
                
                <div className="flex gap-2">
                  <Button 
                    onClick={handleSaveEmail}
                    disabled={saveEmailMutation.isPending}
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Save to History
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => {
                      setNewEmailSubject("");
                      setNewEmailBody("");
                      setEmailNotes("");
                      setAiEmail(null);
                    }}
                  >
                    Clear
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}