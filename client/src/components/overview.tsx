import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  DollarSign, 
  Users, 
  CheckSquare, 
  AlertTriangle,
  Clock,
  UserPlus,
  CircleAlert,
  Bot,
  BarChart,
  Flag,
  TrendingUp
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Task } from "@shared/schema";
import { KPICard } from "@/components/dashboard/kpi-card";
import { DataTable } from "@/components/compound/data-table";
import { AnalyticsInsights } from "@/components/dashboard/analytics-insights";

interface DashboardStats {
  outstandingInvoices: number;
  overdueCount: number;
  activeLeads: number;
  avgEngagement: number;
  atRiskRenewals: number;
}

function OpenTasks() {
  const { data: tasks, isLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
  });

  const openTasks = tasks?.filter(task => task.status !== "completed") || [];

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium text-gray-900">
            Open Tasks
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

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "destructive";
      case "medium": return "default";
      case "low": return "secondary";
      default: return "default";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-medium text-gray-900">
          Open Tasks ({openTasks.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {openTasks.length === 0 ? (
          <div className="text-center py-6 text-gray-500">
            <CheckSquare className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-2">No open tasks</p>
          </div>
        ) : (
          <div className="space-y-3">
            {openTasks.slice(0, 5).map((task) => (
              <div key={task.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900 truncate">{task.title}</h4>
                  <p className="text-sm text-gray-600 truncate">{task.description}</p>
                  {task.client_name && (
                    <p className="text-xs text-gray-500">Client: {task.client_name}</p>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant={getPriorityColor(task.priority || "medium")}>
                    {task.priority || "medium"}
                  </Badge>
                  <Badge variant="outline">
                    {task.status}
                  </Badge>
                </div>
              </div>
            ))}
            {openTasks.length > 5 && (
              <p className="text-sm text-gray-500 text-center pt-2">
                +{openTasks.length - 5} more tasks
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SeverelyOverdueInvoices() {
  const { data: overdueInvoices, isLoading } = useQuery<any[]>({
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

  if (!overdueInvoices || !Array.isArray(overdueInvoices) || overdueInvoices.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium text-gray-900">
            Invoices Over 45 Days Past Due
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <CircleAlert className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No severely overdue invoices</p>
            <p className="text-sm text-gray-400">All invoices are current or within normal payment terms</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalOverdueAmount = overdueInvoices.reduce((sum: number, invoice: any) => 
    sum + parseFloat(invoice.amount), 0
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-medium text-gray-900">
          Invoices Over 45 Days Past Due
        </CardTitle>
        <div className="text-sm text-gray-600">
          {overdueInvoices.length} invoices • ${totalOverdueAmount.toLocaleString()} total
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {overdueInvoices.map((invoice: any) => {
            const daysOverdue = Math.floor(
              (new Date().getTime() - new Date(invoice.due_date).getTime()) / (1000 * 60 * 60 * 24)
            );
            
            return (
              <div key={invoice.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                <div className="flex items-center gap-2">
                  <CircleAlert className="h-4 w-4 text-red-500" />
                  <span className="font-medium text-red-800">{invoice.client?.name || 'Unknown Client'}</span>
                  <span className="text-sm text-red-700">${parseFloat(invoice.amount).toLocaleString()}</span>
                </div>
                <div className="text-sm font-medium text-red-700">
                  {daysOverdue} days
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

export default function Overview() {
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });

  const { data: tasks } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
  });



  const openTasks = tasks?.filter(task => task.status !== "completed") || [];
  const highPriorityTasks = tasks?.filter(task => task.status !== "completed" && task.priority === "high") || [];

  if (isLoading) {
    return (
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-5">
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        {/* Enhanced KPI Dashboard */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <KPICard
            title="Outstanding Invoices"
            value={stats?.outstandingInvoices ?? 0}
            icon={DollarSign}
            trend={{ value: stats?.overdueCount || 0, label: "overdue", type: "negative" }}
            color="primary"
            format="currency"
          />
          
          <KPICard
            title="Active Leads"
            value={(stats?.activeLeads ?? 0).toString()}
            icon={Users}
            trend={{ value: 5, label: "hot prospects", type: "positive" }}
            color="secondary"
          />
          
          <KPICard
            title="Open Tasks"
            value={openTasks.length.toString()}
            icon={CheckSquare}
            trend={{ value: highPriorityTasks.length, label: "high priority", type: "neutral" }}
            color="blue"
          />
          
          <KPICard
            title="At-Risk Renewals"
            value={(stats?.atRiskRenewals ?? 0).toString()}
            icon={AlertTriangle}
            trend={{ value: 2, label: "urgent actions", type: "negative" }}
            color="amber"
          />
        </div>

        {/* Critical Business Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <SeverelyOverdueInvoices />
          <OpenTasks />
        </div>

        {/* Analytics Insights Section */}
        <div className="mb-8">
          <AnalyticsInsights />
        </div>
      </div>
    </div>
  );
}
