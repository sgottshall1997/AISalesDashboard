import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mail, MousePointer, Send, Lightbulb, Bot, TrendingUp, BarChart3, RefreshCw, FileText, Target } from "lucide-react";

export default function ContentSection() {
  const { data: reports, isLoading: reportsLoading } = useQuery({
    queryKey: ["/api/content-reports"],
  });

  const { data: clients, isLoading: clientsLoading } = useQuery({
    queryKey: ["/api/clients"],
  });

  const { data: suggestions, isLoading: suggestionsLoading, refetch: refetchSuggestions } = useQuery({
    queryKey: ["/api/ai/content-suggestions"],
    enabled: false, // Don't auto-fetch, only when button is clicked
  });

  if (reportsLoading || clientsLoading) {
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

  const avgOpenRate = reports?.length > 0 
    ? Math.round(reports.reduce((sum: number, report: any) => sum + parseFloat(report.openRate), 0) / reports.length)
    : 0;

  const avgClickRate = reports?.length > 0 
    ? Math.round(reports.reduce((sum: number, report: any) => sum + parseFloat(report.clickRate), 0) / reports.length)
    : 0;

  const totalSent = reports?.reduce((sum: number, report: any) => sum + report.totalSent, 0) || 0;

  const getEngagementBadge = (openRate: string) => {
    const rate = parseFloat(openRate);
    if (rate >= 70) return <Badge className="bg-green-100 text-green-800">High Engagement</Badge>;
    if (rate >= 50) return <Badge className="bg-blue-100 text-blue-800">Good Engagement</Badge>;
    return <Badge className="bg-yellow-100 text-yellow-800">Low Engagement</Badge>;
  };

  const getInterestTags = (client: any) => {
    return client.interestTags?.map((tag: string, index: number) => {
      const colors = ["bg-blue-100 text-blue-800", "bg-green-100 text-green-800", "bg-purple-100 text-purple-800", "bg-orange-100 text-orange-800"];
      return (
        <Badge key={index} className={colors[index % colors.length]}>
          {tag}
        </Badge>
      );
    });
  };

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Content Distribution Tracker</h2>
          <p className="text-gray-600">Monitor WILTW report engagement and optimize client outreach</p>
        </div>

        {/* Engagement Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Open Rate</p>
                  <p className="text-2xl font-bold text-green-600">{avgOpenRate}%</p>
                </div>
                <div className="p-3 bg-green-100 rounded-full">
                  <Mail className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Click Rate</p>
                  <p className="text-2xl font-bold text-blue-600">{avgClickRate}%</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-full">
                  <MousePointer className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Reports Sent</p>
                  <p className="text-2xl font-bold text-gray-900">{totalSent}</p>
                </div>
                <div className="p-3 bg-gray-100 rounded-full">
                  <Send className="h-6 w-6 text-gray-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">AI Suggestions</p>
                  <p className="text-2xl font-bold text-indigo-600">24</p>
                </div>
                <div className="p-3 bg-purple-100 rounded-full">
                  <Lightbulb className="h-6 w-6 text-indigo-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent WILTW Reports */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Recent WILTW Reports</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {reports?.slice(0, 3).map((report: any) => (
                  <div key={report.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-gray-900">{report.title}</h4>
                        <p className="text-sm text-gray-500 mt-1">
                          Published: {new Date(report.publishDate).toLocaleDateString()}
                        </p>
                        <div className="mt-2 flex items-center space-x-4 text-sm">
                          <span className="text-green-600">↗ {report.openRate}% open rate</span>
                          <span className="text-blue-600">↗ {report.clickRate}% click rate</span>
                        </div>
                      </div>
                      {getEngagementBadge(report.openRate)}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>AI Content Suggestions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <Bot className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-blue-800">High Interest in Tech Trends</p>
                      <p className="text-sm text-blue-700 mt-1">
                        5 clients clicked multiple links in WILTW #66. Consider creating follow-up content on semiconductor supply chains.
                      </p>
                      <div className="mt-2">
                        <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                          Create Follow-up
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <Lightbulb className="h-5 w-5 text-green-600" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-green-800">Energy Sector Opportunity</p>
                      <p className="text-sm text-green-700 mt-1">
                        Beta Fund and 3 other clients highly engaged with AI & Energy report. Perfect timing for renewal discussions.
                      </p>
                      <div className="mt-2">
                        <Button size="sm" className="bg-green-600 hover:bg-green-700">
                          Draft Outreach
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <TrendingUp className="h-5 w-5 text-yellow-600" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-yellow-800">Healthcare Content Underperformed</p>
                      <p className="text-sm text-yellow-700 mt-1">
                        Only 45% open rate on healthcare report. Consider more targeted distribution or topic refinement.
                      </p>
                      <div className="mt-2">
                        <Button size="sm" className="bg-yellow-600 hover:bg-yellow-700">
                          Analyze Audience
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Client Engagement Details */}
        <Card>
          <CardHeader>
            <CardTitle>Client Engagement Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Open Rate</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Click Rate</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Interest Tags</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Engagement</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">AI Suggestion</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {clients?.slice(0, 5).map((client: any) => (
                    <tr key={client.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {client.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                        {client.engagementRate}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600">
                        {Math.round(parseFloat(client.engagementRate) * 0.4)}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex space-x-1">
                          {getInterestTags(client)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        WILTW #{reports?.length > 0 ? reports[0].id : "66"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600">
                        {client.riskLevel === "high" ? "Re-engage with content" : 
                         client.riskLevel === "medium" ? "Renewal opportunity" :
                         "Send latest report"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
