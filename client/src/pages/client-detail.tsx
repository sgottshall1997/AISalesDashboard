import { useState } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Building2,
  Mail,
  Calendar,
  DollarSign,
  TrendingUp,
  FileText,
  User,
  Phone,
  MapPin,
  Clock,
  AlertTriangle,
  CheckCircle,
  Eye,
  MousePointer
} from "lucide-react";
import { Link } from "wouter";

export default function ClientDetail() {
  const { id } = useParams();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: client, isLoading: clientLoading } = useQuery({
    queryKey: ["/api/clients", id],
    queryFn: () => apiRequest("GET", `/api/clients/${id}`).then(res => res.json()),
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ["/api/invoices", id],
    queryFn: () => apiRequest("GET", "/api/invoices").then(res => res.json()).then(invoices => 
      invoices.filter((invoice: any) => invoice.client.id.toString() === id)
    ),
  });

  const { data: engagements = [] } = useQuery({
    queryKey: ["/api/client-engagements", id],
    queryFn: () => apiRequest("GET", "/api/reading-history").then(res => res.json()).then(history => 
      history.filter((item: any) => item.client.id.toString() === id)
    ),
  });

  if (clientLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
              </div>
              <div className="space-y-6">
                <div className="h-48 bg-gray-200 dark:bg-gray-700 rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-6xl mx-auto">
          <Card>
            <CardContent className="p-6 text-center">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Client Not Found</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">The client you're looking for doesn't exist.</p>
              <Link href="/">
                <Button>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Dashboard
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "pending": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "overdue": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200";
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case "low": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "medium": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "high": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200";
    }
  };

  const totalInvoiceValue = invoices.reduce((sum: number, invoice: any) => sum + parseFloat(invoice.amount), 0);
  const pendingInvoices = invoices.filter((inv: any) => inv.payment_status === "pending");
  const overdueInvoices = invoices.filter((inv: any) => inv.payment_status === "overdue");

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/">
              <Button variant="outline" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{client.name}</h1>
              <p className="text-gray-600 dark:text-gray-400">{client.company}</p>
            </div>
          </div>
          <Badge className={getRiskColor(client.risk_level || "medium")}>
            {client.risk_level || "Medium"} Risk
          </Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Client Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Client Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">Email:</span>
                      <span className="text-sm font-medium">{client.email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">Company:</span>
                      <span className="text-sm font-medium">{client.company}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">Subscription:</span>
                      <span className="text-sm font-medium">{client.subscription_type || "Standard"}</span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">Renewal:</span>
                      <span className="text-sm font-medium">
                        {client.renewal_date ? new Date(client.renewal_date).toLocaleDateString() : "Not set"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Eye className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">Engagement:</span>
                      <span className="text-sm font-medium">{client.engagement_rate || "N/A"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MousePointer className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">Click Rate:</span>
                      <span className="text-sm font-medium">{client.click_rate || "N/A"}</span>
                    </div>
                  </div>
                </div>
                {client.notes && (
                  <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <p className="text-sm text-gray-700 dark:text-gray-300">{client.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Invoices */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Invoices ({invoices.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {invoices.length === 0 ? (
                  <p className="text-gray-500 dark:text-gray-400 text-center py-8">No invoices found for this client.</p>
                ) : (
                  <div className="space-y-3">
                    {invoices.map((invoice: any) => (
                      <div key={invoice.id} className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-gray-100">
                              {invoice.invoice_number}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              Due: {new Date(invoice.due_date).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-medium text-gray-900 dark:text-gray-100">
                            ${parseFloat(invoice.amount).toLocaleString()}
                          </span>
                          <Badge className={getStatusColor(invoice.payment_status)}>
                            {invoice.payment_status}
                          </Badge>
                          <Link href={`/invoice/${invoice.id}`}>
                            <Button variant="outline" size="sm">
                              View
                            </Button>
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Content Engagement History */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Content Engagement
                </CardTitle>
              </CardHeader>
              <CardContent>
                {engagements.length === 0 ? (
                  <p className="text-gray-500 dark:text-gray-400 text-center py-8">No content engagement history found.</p>
                ) : (
                  <div className="space-y-3">
                    {engagements.map((engagement: any) => (
                      <div key={engagement.id} className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-gray-100">
                            {engagement.report_title}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Read on {new Date(engagement.read_date).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">
                            {engagement.engagement_time}s
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Client Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Client Metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Total Invoice Value</span>
                    <span className="font-semibold text-green-600 dark:text-green-400">
                      ${totalInvoiceValue.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Pending Invoices</span>
                    <span className="font-semibold text-yellow-600 dark:text-yellow-400">
                      {pendingInvoices.length}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Overdue Invoices</span>
                    <span className="font-semibold text-red-600 dark:text-red-400">
                      {overdueInvoices.length}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Content Engagements</span>
                    <span className="font-semibold text-blue-600 dark:text-blue-400">
                      {engagements.length}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Interest Tags */}
            {client.interest_tags && client.interest_tags.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Interest Tags</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {client.interest_tags.map((tag: string, index: number) => (
                      <Badge key={index} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Account Status */}
            <Card>
              <CardHeader>
                <CardTitle>Account Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  {overdueInvoices.length > 0 ? (
                    <>
                      <AlertTriangle className="w-4 h-4 text-red-500" />
                      <span className="text-sm text-red-600 dark:text-red-400">
                        {overdueInvoices.length} Overdue Invoice{overdueInvoices.length > 1 ? 's' : ''}
                      </span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span className="text-sm text-green-600 dark:text-green-400">Account in Good Standing</span>
                    </>
                  )}
                </div>
                {client.renewal_date && (
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-blue-500" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Renewal: {new Date(client.renewal_date).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}