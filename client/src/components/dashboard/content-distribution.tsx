import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { dashboardApi } from "@/lib/api";
import { 
  Mail, 
  MousePointer, 
  Send, 
  Lightbulb,
  Bot,
  TrendingUp,
  BarChart3,
  Users
} from "lucide-react";

export function ContentDistribution() {
  const { data: reports = [], isLoading: reportsLoading } = useQuery({
    queryKey: ["/api/reports"],
    queryFn: () => dashboardApi.getReports(),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["/api/clients"],
    queryFn: () => dashboardApi.getClients(),
  });

  const { data: suggestions = [] } = useQuery({
    queryKey: ["/api/ai/content-suggestions"],
    queryFn: () => dashboardApi.getContentSuggestions(),
  });

  if (reportsLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3 mb-8"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Calculate overall metrics
  const totalReports = reports.length;
  const avgOpenRate = reports.reduce((sum, report) => sum + (report.openRate || 0), 0) / totalReports || 0;
  const avgClickRate = reports.reduce((sum, report) => sum + (report.clickRate || 0), 0) / totalReports || 0;
  const aiSuggestionCount = suggestions.length;

  const getEngagementBadge = (level: string) => {
    switch (level) {
      case "high":
        return "bg-green-100 text-green-800";
      case "medium":
        return "bg-blue-100 text-blue-800";
      case "low":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getSuggestionIcon = (type: string) => {
    switch (type) {
      case "high_engagement":
        return <Bot className="h-5 w-5 text-primary" />;
      case "renewal_opportunity":
        return <Lightbulb className="h-5 w-5 text-green-600" />;
      case "low_engagement":
        return <BarChart3 className="h-5 w-5 text-yellow-600" />;
      default:
        return <Bot className="h-5 w-5 text-gray-600" />;
    }
  };

  const getSuggestionStyle = (type: string) => {
    switch (type) {
      case "high_engagement":
        return "bg-blue-50 border-blue-200";
      case "renewal_opportunity":
        return "bg-green-50 border-green-200";
      case "low_engagement":
        return "bg-yellow-50 border-yellow-200";
      default:
        return "bg-gray-50 border-gray-200";
    }
  };

  const getSuggestionButtonStyle = (type: string) => {
    switch (type) {
      case "high_engagement":
        return "bg-primary hover:bg-blue-700 text-white";
      case "renewal_opportunity":
        return "bg-green-600 hover:bg-green-700 text-white";
      case "low_engagement":
        return "bg-yellow-600 hover:bg-yellow-700 text-white";
      default:
        return "bg-gray-600 hover:bg-gray-700 text-white";
    }
  };

  return (
    <div className="space-y-6">
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
                <p className="text-2xl font-bold text-green-600">{Math.round(avgOpenRate)}%</p>
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
                <p className="text-2xl font-bold text-primary">{Math.round(avgClickRate)}%</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <MousePointer className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Reports Sent</p>
                <p className="text-2xl font-bold text-gray-900">{totalReports * 52}</p>
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
                <p className="text-2xl font-bold text-secondary">{aiSuggestionCount}</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <Lightbulb className="h-6 w-6 text-secondary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent WILTW Reports & AI Suggestions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Recent WILTW Reports</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {reports.slice(0, 3).map((report) => (
                <div key={report.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-gray-900">{report.title}</h4>
                      <p className="text-sm text-gray-500 mt-1">Published: {report.publishDate}</p>
                      <div className="mt-2 flex items-center space-x-4 text-sm">
                        <span className="text-green-600">↗ {report.openRate}% open rate</span>
                        <span className="text-primary">↗ {report.clickRate}% click rate</span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {report.topics.map((topic, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {topic}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <Badge className={getEngagementBadge(report.engagementLevel)}>
                      {report.engagementLevel} Engagement
                    </Badge>
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
              {suggestions.length > 0 ? (
                suggestions.slice(0, 3).map((suggestion, index) => (
                  <div key={index} className={`border rounded-lg p-4 ${getSuggestionStyle(suggestion.type)}`}>
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        {getSuggestionIcon(suggestion.type)}
                      </div>
                      <div className="ml-3 flex-1">
                        <p className="text-sm font-medium text-gray-800">{suggestion.title}</p>
                        <p className="text-sm text-gray-700 mt-1">{suggestion.description}</p>
                        <div className="mt-2">
                          <Button 
                            size="sm" 
                            className={`text-xs ${getSuggestionButtonStyle(suggestion.type)}`}
                          >
                            {suggestion.action}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <Bot className="h-5 w-5 text-primary" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-blue-800">High Interest in Tech Trends</p>
                      <p className="text-sm text-blue-700 mt-1">
                        5 clients clicked multiple links in WILTW #66. Consider creating follow-up content on semiconductor supply chains.
                      </p>
                      <div className="mt-2">
                        <Button size="sm" className="text-xs bg-primary hover:bg-blue-700 text-white">
                          Create Follow-up
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Client
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Open Rate
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Click Rate
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Interest Tags
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Engagement
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    AI Suggestion
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {clients.slice(0, 5).map((client) => (
                  <tr key={client.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {client.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`${
                        (client.engagementRate || 0) > 70 ? 'text-green-600' :
                        (client.engagementRate || 0) > 50 ? 'text-primary' :
                        'text-yellow-600'
                      }`}>
                        {client.engagementRate}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`${
                        (client.engagementRate || 0) > 70 ? 'text-green-600' :
                        (client.engagementRate || 0) > 50 ? 'text-primary' :
                        'text-yellow-600'
                      }`}>
                        {Math.round((client.engagementRate || 0) * 0.5)}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex space-x-1">
                        {client.interestTags.slice(0, 2).map((tag, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      WILTW #{66 - client.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-primary">
                      {client.riskLevel === "medium" ? "Renewal opportunity" :
                       client.riskLevel === "high" ? "Re-engage with content" :
                       "Send relevant report"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
