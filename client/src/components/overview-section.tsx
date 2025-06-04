import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DollarSign, Users, TrendingUp, AlertTriangle, Bot, BarChart3, Flag, CircleAlert, Clock, UserPlus } from "lucide-react";

export default function OverviewSection() {
  const { data: overview, isLoading } = useQuery({
    queryKey: ["/api/dashboard/overview"],
  });

  if (isLoading) {
    return (
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
          <div className="animate-pulse">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-white h-32 rounded-lg shadow" />
              ))}
            </div>
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
                  <DollarSign className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Outstanding Invoices</dt>
                    <dd className="text-2xl font-semibold text-gray-900">
                      ${overview?.outstandingInvoices?.toLocaleString() || "0"}
                    </dd>
                  </dl>
                </div>
              </div>
            </CardContent>
            <div className="bg-gray-50 px-5 py-3">
              <div className="text-sm">
                <span className="text-red-600 font-medium">{overview?.overdueInvoices || 0} overdue</span>
                <span className="text-gray-600"> invoices</span>
              </div>
            </div>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Users className="h-6 w-6 text-indigo-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Active Leads</dt>
                    <dd className="text-2xl font-semibold text-gray-900">{overview?.activeLeads || 0}</dd>
                  </dl>
                </div>
              </div>
            </CardContent>
            <div className="bg-gray-50 px-5 py-3">
              <div className="text-sm">
                <span className="text-green-600 font-medium">{overview?.hotLeads || 0} hot</span>
                <span className="text-gray-600"> prospects</span>
              </div>
            </div>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <TrendingUp className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">WILTW Engagement</dt>
                    <dd className="text-2xl font-semibold text-gray-900">{overview?.avgEngagement || 0}%</dd>
                  </dl>
                </div>
              </div>
            </CardContent>
            <div className="bg-gray-50 px-5 py-3">
              <div className="text-sm">
                <span className="text-green-600 font-medium">+12%</span>
                <span className="text-gray-600"> vs last month</span>
              </div>
            </div>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <AlertTriangle className="h-6 w-6 text-yellow-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">At-Risk Renewals</dt>
                    <dd className="text-2xl font-semibold text-gray-900">{overview?.atRiskRenewals || 0}</dd>
                  </dl>
                </div>
              </div>
            </CardContent>
            <div className="bg-gray-50 px-5 py-3">
              <div className="text-sm">
                <span className="text-yellow-600 font-medium">2 urgent</span>
                <span className="text-gray-600"> actions needed</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Recent Activity & Alerts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-medium text-gray-900">Recent AI Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flow-root">
                <ul className="-mb-8">
                  <li>
                    <div className="relative pb-8">
                      <div className="relative flex space-x-3">
                        <div>
                          <span className="h-8 w-8 rounded-full bg-green-500 flex items-center justify-center ring-8 ring-white">
                            <Bot className="h-4 w-4 text-white" />
                          </span>
                        </div>
                        <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                          <div>
                            <p className="text-sm text-gray-500">
                              AI drafted follow-up email for <span className="font-medium text-gray-900">Acme Corp</span>
                            </p>
                          </div>
                          <div className="text-right text-sm whitespace-nowrap text-gray-500">
                            2 hours ago
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                  <li>
                    <div className="relative pb-8">
                      <div className="relative flex space-x-3">
                        <div>
                          <span className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center ring-8 ring-white">
                            <BarChart3 className="h-4 w-4 text-white" />
                          </span>
                        </div>
                        <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                          <div>
                            <p className="text-sm text-gray-500">Updated engagement analytics for WILTW #66</p>
                          </div>
                          <div className="text-right text-sm whitespace-nowrap text-gray-500">
                            5 hours ago
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                  <li>
                    <div className="relative">
                      <div className="relative flex space-x-3">
                        <div>
                          <span className="h-8 w-8 rounded-full bg-yellow-500 flex items-center justify-center ring-8 ring-white">
                            <Flag className="h-4 w-4 text-white" />
                          </span>
                        </div>
                        <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                          <div>
                            <p className="text-sm text-gray-500">
                              Flagged <span className="font-medium text-gray-900">Beta Fund</span> for renewal risk
                            </p>
                          </div>
                          <div className="text-right text-sm whitespace-nowrap text-gray-500">
                            1 day ago
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-medium text-gray-900">Priority Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center p-4 bg-red-50 rounded-lg border border-red-200">
                  <div className="flex-shrink-0">
                    <CircleAlert className="h-5 w-5 text-red-600" />
                  </div>
                  <div className="ml-3 flex-1">
                    <p className="text-sm font-medium text-red-800">Overdue Invoice</p>
                    <p className="text-sm text-red-700">Acme Corp - $15,000 (20 days overdue)</p>
                  </div>
                  <Button size="sm" className="ml-4 bg-red-600 hover:bg-red-700">
                    Send Reminder
                  </Button>
                </div>

                <div className="flex items-center p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <div className="flex-shrink-0">
                    <Clock className="h-5 w-5 text-yellow-600" />
                  </div>
                  <div className="ml-3 flex-1">
                    <p className="text-sm font-medium text-yellow-800">Renewal Due Soon</p>
                    <p className="text-sm text-yellow-700">Beta Fund - Expires in 15 days</p>
                  </div>
                  <Button size="sm" className="ml-4 bg-yellow-600 hover:bg-yellow-700">
                    Draft Follow-up
                  </Button>
                </div>

                <div className="flex items-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex-shrink-0">
                    <UserPlus className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="ml-3 flex-1">
                    <p className="text-sm font-medium text-blue-800">Hot Lead</p>
                    <p className="text-sm text-blue-700">Jane Doe (ABC Capital) - Schedule discovery call</p>
                  </div>
                  <Button size="sm" className="ml-4 bg-blue-600 hover:bg-blue-700">
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
