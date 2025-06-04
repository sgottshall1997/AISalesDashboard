import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Mail, 
  MousePointer, 
  Send, 
  Lightbulb, 
  Bot,
  TrendingUp,
  TrendingDown,
  AlertCircle
} from "lucide-react";

interface ContentReport {
  id: number;
  title: string;
  type: string;
  published_date: string;
  open_rate: string;
  click_rate: string;
  engagement_level: "low" | "medium" | "high";
  tags: string[];
}

interface Client {
  id: number;
  name: string;
  company: string;
  engagement_rate: string;
  click_rate: string;
  interest_tags: string[];
}

export default function ContentDistribution() {
  const { data: reports } = useQuery<ContentReport[]>({
    queryKey: ["/api/content-reports/recent"],
  });

  const { data: clients } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const avgOpenRate = reports?.reduce((sum, report) => sum + parseFloat(report.open_rate), 0) / (reports?.length || 1) || 0;
  const avgClickRate = reports?.reduce((sum, report) => sum + parseFloat(report.click_rate), 0) / (reports?.length || 1) || 0;

  const getEngagementColor = (level: string) => {
    switch (level) {
      case "high":
        return "bg-green-100 text-green-800";
      case "medium":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-yellow-100 text-yellow-800";
    }
  };

  const getTagColor = (tag: string) => {
    const colors = [
      "bg-blue-100 text-blue-800",
      "bg-green-100 text-green-800", 
      "bg-purple-100 text-purple-800",
      "bg-orange-100 text-orange-800",
      "bg-red-100 text-red-800"
    ];
    return colors[tag.length % colors.length];
  };

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Content Distribution Tracker</h2>
          <p className="text-gray-600">Monitor report engagement and optimize client outreach</p>
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
                  <p className="text-2xl font-bold text-gray-900">{reports?.length || 0}</p>
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
                  <p className="text-2xl font-bold text-secondary">24</p>
                </div>
                <div className="p-3 bg-purple-100 rounded-full">
                  <Lightbulb className="h-6 w-6 text-secondary" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Reports */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Recent Reports</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {reports?.map((report) => (
                  <div key={report.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-gray-900">{report.title}</h4>
                        <p className="text-sm text-gray-500 mt-1">
                          Published: {new Date(report.published_date).toLocaleDateString()}
                        </p>
                        <div className="mt-2 flex items-center space-x-4 text-sm">
                          <span className="text-green-600 flex items-center">
                            <TrendingUp className="h-3 w-3 mr-1" />
                            {parseFloat(report.open_rate)}% open rate
                          </span>
                          <span className="text-primary flex items-center">
                            <TrendingUp className="h-3 w-3 mr-1" />
                            {parseFloat(report.click_rate)}% click rate
                          </span>
                        </div>
                      </div>
                      <Badge className={getEngagementColor(report.engagement_level)}>
                        {report.engagement_level} engagement
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
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <Bot className="h-5 w-5 text-primary" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-blue-800">High Interest in Tech Trends</p>
                      <p className="text-sm text-blue-700 mt-1">
                        5 clients clicked multiple links in latest tech report. Consider creating follow-up content on semiconductor supply chains.
                      </p>
                      <div className="mt-2">
                        <Button size="sm" className="text-xs">
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
                        <Button size="sm" variant="outline" className="text-xs border-green-300 text-green-700">
                          Draft Outreach
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <AlertCircle className="h-5 w-5 text-amber-600" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-yellow-800">Healthcare Content Underperformed</p>
                      <p className="text-sm text-yellow-700 mt-1">
                        Only 45% open rate on healthcare report. Consider more targeted distribution or topic refinement.
                      </p>
                      <div className="mt-2">
                        <Button size="sm" variant="outline" className="text-xs border-amber-300 text-amber-700">
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
                  {clients?.slice(0, 5).map((client) => (
                    <tr key={client.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {client.company}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                        {parseFloat(client.engagement_rate)}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-primary">
                        {parseFloat(client.click_rate)}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-wrap gap-1">
                          {client.interest_tags.slice(0, 3).map((tag, index) => (
                            <Badge key={index} className={getTagColor(tag)} variant="secondary">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">WILTW #66</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-primary">
                        {parseFloat(client.engagement_rate) > 80 ? "Renewal opportunity" : 
                         parseFloat(client.engagement_rate) < 50 ? "Re-engage with content" :
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
    </div>
  );
}
