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

      {/* Recent Activity & Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-medium text-gray-900">
              Recent AI Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flow-root">
              <ul className="-mb-8">
                {overview.recentActivity.map((activity, index) => (
                  <li key={index}>
                    <div className={`relative ${index !== overview.recentActivity.length - 1 ? 'pb-8' : ''}`}>
                      {index !== overview.recentActivity.length - 1 && (
                        <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" />
                      )}
                      <div className="relative flex space-x-3">
                        <div>
                          <span className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white ${
                            activity.type === 'ai_action' ? 'bg-green-500' :
                            activity.type === 'analytics' ? 'bg-blue-500' :
                            'bg-yellow-500'
                          }`}>
                            {activity.type === 'ai_action' && <Bot className="h-4 w-4 text-white" />}
                            {activity.type === 'analytics' && <BarChart3 className="h-4 w-4 text-white" />}
                            {activity.type === 'risk' && <Flag className="h-4 w-4 text-white" />}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                          <div>
                            <p className="text-sm text-gray-500">{activity.description}</p>
                          </div>
                          <div className="text-right text-sm whitespace-nowrap text-gray-500">
                            {activity.timestamp}
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>

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
