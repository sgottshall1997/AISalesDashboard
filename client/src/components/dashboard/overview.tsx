import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { dashboardApi } from "@/lib/api";
import { 
  DollarSign, 
  Users, 
  TrendingUp, 
  AlertTriangle,
  Bot,
  BarChart3,
  Flag,
  CircleAlert,
  Clock,
  UserPlus
} from "lucide-react";

function SeverelyOverdueInvoices() {
  const { data: overdueInvoices, isLoading } = useQuery({
    queryKey: ["/api/invoices/severely-overdue"],
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium text-gray-900">
            Invoices Over 45 Days Past Due
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!overdueInvoices || overdueInvoices.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium text-gray-900">
            Invoices Over 45 Days Past Due
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="text-green-600 mb-2">
              <CircleAlert className="h-8 w-8 mx-auto" />
            </div>
            <p className="text-sm text-gray-500">No severely overdue invoices</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-medium text-gray-900 flex items-center">
          <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
          Invoices Over 45 Days Past Due
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {overdueInvoices.slice(0, 5).map((invoice: any) => (
            <div key={invoice.id} className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-red-800">
                    {invoice.client.name}
                  </p>
                  <Badge variant="destructive" className="text-xs">
                    {invoice.daysPastDue} days overdue
                  </Badge>
                </div>
                <p className="text-xs text-red-600 mt-1">
                  Invoice #{invoice.invoice_number} • ${invoice.amount}
                </p>
              </div>
            </div>
          ))}
          {overdueInvoices.length > 5 && (
            <div className="text-center pt-2">
              <p className="text-xs text-gray-500">
                +{overdueInvoices.length - 5} more severely overdue invoices
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function Overview() {
  const { data: overview, isLoading } = useQuery({
    queryKey: ["/api/dashboard/overview"],
    queryFn: () => dashboardApi.getOverview(),
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-20 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!overview) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Failed to load dashboard overview</p>
      </div>
    );
  }

  const getActionIcon = (type: string) => {
    switch (type) {
      case "urgent":
        return <CircleAlert className="h-5 w-5 text-red-500" />;
      case "warning":
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case "opportunity":
        return <UserPlus className="h-5 w-5 text-blue-500" />;
      default:
        return <CircleAlert className="h-5 w-5 text-gray-500" />;
    }
  };

  const getActionButtonStyle = (type: string) => {
    switch (type) {
      case "urgent":
        return "bg-red-500 hover:bg-red-600 text-white";
      case "warning":
        return "bg-yellow-500 hover:bg-yellow-600 text-white";
      case "opportunity":
        return "bg-blue-500 hover:bg-blue-600 text-white";
      default:
        return "bg-gray-500 hover:bg-gray-600 text-white";
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <DollarSign className="h-8 w-8 text-primary" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Outstanding Invoices
                  </dt>
                  <dd className="text-2xl font-semibold text-gray-900">
                    ${overview.stats.outstandingInvoices.toLocaleString()}
                  </dd>
                </dl>
              </div>
            </div>
            <div className="mt-3 text-sm">
              <span className="text-red-600 font-medium">
                {overview.stats.overdueCount} overdue
              </span>
              <span className="text-gray-600"> invoices</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Users className="h-8 w-8 text-secondary" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Active Leads
                  </dt>
                  <dd className="text-2xl font-semibold text-gray-900">
                    {overview.stats.activeLeads}
                  </dd>
                </dl>
              </div>
            </div>
            <div className="mt-3 text-sm">
              <span className="text-green-600 font-medium">
                {overview.stats.hotLeads} hot
              </span>
              <span className="text-gray-600"> prospects</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <TrendingUp className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    WILTW Engagement
                  </dt>
                  <dd className="text-2xl font-semibold text-gray-900">
                    {overview.stats.avgEngagement}%
                  </dd>
                </dl>
              </div>
            </div>
            <div className="mt-3 text-sm">
              <span className="text-green-600 font-medium">+12%</span>
              <span className="text-gray-600"> vs last month</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-8 w-8 text-yellow-500" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    At-Risk Renewals
                  </dt>
                  <dd className="text-2xl font-semibold text-gray-900">
                    {overview.stats.atRiskRenewals}
                  </dd>
                </dl>
              </div>
            </div>
            <div className="mt-3 text-sm">
              <span className="text-yellow-600 font-medium">2 urgent</span>
              <span className="text-gray-600"> actions needed</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Critical Business Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <SeverelyOverdueInvoices />

        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-medium text-gray-900">
              Priority Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {overview.priorityActions.map((action, index) => (
                <div key={index} className={`flex items-center p-4 rounded-lg border ${
                  action.type === 'urgent' ? 'bg-red-50 border-red-200' :
                  action.type === 'warning' ? 'bg-yellow-50 border-yellow-200' :
                  'bg-blue-50 border-blue-200'
                }`}>
                  <div className="flex-shrink-0">
                    {getActionIcon(action.type)}
                  </div>
                  <div className="ml-3 flex-1">
                    <p className={`text-sm font-medium ${
                      action.type === 'urgent' ? 'text-red-800' :
                      action.type === 'warning' ? 'text-yellow-800' :
                      'text-blue-800'
                    }`}>
                      {action.title}
                    </p>
                    <p className={`text-sm ${
                      action.type === 'urgent' ? 'text-red-700' :
                      action.type === 'warning' ? 'text-yellow-700' :
                      'text-blue-700'
                    }`}>
                      {action.description}
                    </p>
                  </div>
                  <Button 
                    size="sm" 
                    className={`ml-4 ${getActionButtonStyle(action.type)}`}
                  >
                    {action.action}
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
