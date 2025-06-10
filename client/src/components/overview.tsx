import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  DollarSign, 
  Users, 
  TrendingUp, 
  AlertTriangle,
  Clock,
  UserPlus,
  CircleAlert,
  Bot,
  BarChart,
  Flag
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface DashboardStats {
  outstandingInvoices: number;
  overdueCount: number;
  activeLeads: number;
  avgEngagement: number;
  atRiskRenewals: number;
}

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
        {/* Stats Overview */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <DollarSign className="h-6 w-6 text-primary" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Outstanding Invoices</dt>
                    <dd className="text-2xl font-semibold text-gray-900">
                      ${stats?.outstandingInvoices?.toLocaleString() || '0'}
                    </dd>
                  </dl>
                </div>
              </div>
              <div className="mt-3 text-sm">
                <span className="text-destructive font-medium">{stats?.overdueCount || 0} overdue</span>
                <span className="text-gray-600"> invoices</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Users className="h-6 w-6 text-secondary" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Active Leads</dt>
                    <dd className="text-2xl font-semibold text-gray-900">{stats?.activeLeads || 0}</dd>
                  </dl>
                </div>
              </div>
              <div className="mt-3 text-sm">
                <span className="text-green-600 font-medium">5 hot</span>
                <span className="text-gray-600"> prospects</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <TrendingUp className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Report Engagement</dt>
                    <dd className="text-2xl font-semibold text-gray-900">
                      {stats?.avgEngagement ? `${Math.round(stats.avgEngagement)}%` : '0%'}
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
            <CardContent className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <AlertTriangle className="h-6 w-6 text-amber-500" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">At-Risk Renewals</dt>
                    <dd className="text-2xl font-semibold text-gray-900">{stats?.atRiskRenewals || 0}</dd>
                  </dl>
                </div>
              </div>
              <div className="mt-3 text-sm">
                <span className="text-amber-600 font-medium">2 urgent</span>
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
              <CardTitle>Priority Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center p-4 bg-red-50 rounded-lg border border-red-200">
                  <div className="flex-shrink-0">
                    <CircleAlert className="h-5 w-5 text-destructive" />
                  </div>
                  <div className="ml-3 flex-1">
                    <p className="text-sm font-medium text-red-800">Overdue Invoice</p>
                    <p className="text-sm text-red-700">Acme Corp - $15,000 (20 days overdue)</p>
                  </div>
                  <Button variant="destructive" size="sm" className="ml-4">
                    Send Reminder
                  </Button>
                </div>

                <div className="flex items-center p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <div className="flex-shrink-0">
                    <Clock className="h-5 w-5 text-amber-600" />
                  </div>
                  <div className="ml-3 flex-1">
                    <p className="text-sm font-medium text-yellow-800">Renewal Due Soon</p>
                    <p className="text-sm text-yellow-700">Beta Fund - Expires in 15 days</p>
                  </div>
                  <Button variant="outline" size="sm" className="ml-4 border-amber-300 text-amber-700 hover:bg-amber-50">
                    Draft Follow-up
                  </Button>
                </div>

                <div className="flex items-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex-shrink-0">
                    <UserPlus className="h-5 w-5 text-primary" />
                  </div>
                  <div className="ml-3 flex-1">
                    <p className="text-sm font-medium text-blue-800">Hot Lead</p>
                    <p className="text-sm text-blue-700">Jane Doe (ABC Capital) - Schedule discovery call</p>
                  </div>
                  <Button size="sm" className="ml-4">
                    Schedule Call
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
