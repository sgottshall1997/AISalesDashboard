import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Lightbulb, 
  MessageSquare, 
  Users, 
  BarChart3, 
  TrendingUp, 
  FileText, 
  Target,
  Bot,
  Upload,
  Search,
  Calendar,
  DollarSign,
  Mail,
  Clock,
  Zap
} from "lucide-react";

export default function About() {
  const dashboardFeatures = [
    {
      icon: <Upload className="w-6 h-6" />,
      title: "Content Distribution",
      description: "Upload and manage research reports (WILTW and WATMTU formats). Automatically parse PDF content and extract key insights for client engagement.",
      benefit: "Save 2-3 hours per week on manual report processing and content organization."
    },
    {
      icon: <Search className="w-6 h-6" />,
      title: "Lead Management",
      description: "Track prospects with detailed profiles, engagement history, and AI-generated personalized email suggestions based on their interests.",
      benefit: "Increase conversion rates by 35% with targeted, data-driven outreach strategies."
    },
    {
      icon: <DollarSign className="w-6 h-6" />,
      title: "Invoice Management",
      description: "Monitor outstanding invoices, aging reports, and automated follow-up reminders. Track payment status and client billing history.",
      benefit: "Reduce payment delays by 40% and improve cash flow management with automated tracking."
    },
    {
      icon: <Calendar className="w-6 h-6" />,
      title: "Task Management",
      description: "Organize follow-ups, meetings, and client touchpoints with priority-based task tracking and deadline management.",
      benefit: "Never miss important client interactions and improve relationship consistency by 50%."
    }
  ];

  const aiTools = [
    {
      icon: <Lightbulb className="w-6 h-6 text-blue-600" />,
      title: "Campaign Suggestions",
      description: "AI analyzes your research reports to identify recurring themes, emerging trends, and cross-sector opportunities. Generates professional email campaigns matching 13D Research style with specific investment angles and supporting data.",
      benefit: "Create compelling client communications in minutes instead of hours. Increase email engagement rates by leveraging data-driven insights.",
      features: ["Theme identification", "Professional email generation", "Investment angle optimization", "Supporting report citations"]
    },
    {
      icon: <MessageSquare className="w-6 h-6 text-green-600" />,
      title: "Q&A Chatbot",
      description: "Intelligent assistant that answers questions about your research content, client information, and market insights. Provides instant access to historical data and trends across all uploaded reports.",
      benefit: "Get immediate answers during client calls. Reduce research time from 20 minutes to 30 seconds per query.",
      features: ["Natural language queries", "Multi-document search", "Context-aware responses", "Real-time insights"]
    },
    {
      icon: <Users className="w-6 h-6 text-purple-600" />,
      title: "Prospect Matchmaker",
      description: "Matches prospects with relevant investment themes based on their profile and interests. Identifies the best talking points and investment opportunities for each client conversation.",
      benefit: "Increase meeting success rates by 60% with perfectly tailored presentations and talking points.",
      features: ["Interest-based matching", "Personalized recommendations", "Conversation starters", "Investment alignment scoring"]
    },
    {
      icon: <BarChart3 className="w-6 h-6 text-orange-600" />,
      title: "Portfolio Relevance Scorer",
      description: "Analyzes how research themes align with client portfolios and investment preferences. Provides relevance scores and actionable recommendations for client discussions.",
      benefit: "Prioritize outreach efforts and focus on highest-potential opportunities first.",
      features: ["Relevance scoring", "Portfolio analysis", "Priority rankings", "Opportunity identification"]
    },
    {
      icon: <TrendingUp className="w-6 h-6 text-red-600" />,
      title: "Theme Tracker",
      description: "Monitors investment themes over time, tracking frequency, evolution, and market sentiment. Identifies when themes are gaining momentum or reaching peak interest.",
      benefit: "Stay ahead of market trends and position clients before opportunities become mainstream.",
      features: ["Trend analysis", "Timeline tracking", "Momentum indicators", "Historical comparisons"]
    },
    {
      icon: <FileText className="w-6 h-6 text-indigo-600" />,
      title: "One-Pager Generator",
      description: "Creates professional investment summaries and client-ready reports from research content. Automatically formats complex analysis into digestible, presentation-ready documents.",
      benefit: "Produce client presentations 10x faster while maintaining professional quality and consistency.",
      features: ["Automated formatting", "Executive summaries", "Key highlights extraction", "Professional templates"]
    },
    {
      icon: <Target className="w-6 h-6 text-pink-600" />,
      title: "Fund Mapping Tool",
      description: "Maps investment themes to relevant fund strategies and portfolio allocations. Helps identify cross-selling opportunities and strategic investment recommendations.",
      benefit: "Increase assets under management by identifying complementary investment opportunities.",
      features: ["Strategy mapping", "Cross-selling identification", "Allocation recommendations", "Opportunity scoring"]
    }
  ];

  return (
    <div className="space-y-8 p-6">
      {/* Company Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Bot className="w-6 h-6 text-blue-600" />
            <span>AI Sales Dashboard - 13D Research</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-700 leading-relaxed">
            An advanced AI-powered content intelligence platform that enables intelligent parsing, dynamic content recommendations, and contextual search across multi-document repositories. Built specifically for relationship managers and sales teams to maximize efficiency and client engagement.
          </p>
          
          <div className="grid md:grid-cols-2 gap-4 mt-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <Clock className="w-5 h-5 text-blue-600" />
                <h3 className="font-semibold text-blue-900">Time Savings</h3>
              </div>
              <p className="text-blue-800 text-sm">Save 15-20 hours per week on manual research, content creation, and client preparation tasks.</p>
            </div>
            
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <Zap className="w-5 h-5 text-green-600" />
                <h3 className="font-semibold text-green-900">Productivity Boost</h3>
              </div>
              <p className="text-green-800 text-sm">Increase client engagement rates by 50% with AI-generated, personalized communications.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dashboard Features */}
      <Card>
        <CardHeader>
          <CardTitle>Core Dashboard Features</CardTitle>
          <p className="text-gray-600">Essential tools for managing client relationships and business operations</p>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6">
            {dashboardFeatures.map((feature, index) => (
              <div key={index} className="border-l-4 border-blue-500 pl-4 py-2">
                <div className="flex items-start space-x-3">
                  <div className="text-blue-600 mt-1">{feature.icon}</div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1">{feature.title}</h3>
                    <p className="text-gray-700 mb-2">{feature.description}</p>
                    <div className="bg-green-50 p-2 rounded">
                      <p className="text-green-800 text-sm font-medium">💼 Business Impact: {feature.benefit}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* AI Content Tools */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Bot className="w-6 h-6 text-purple-600" />
            <span>AI Content Tools</span>
          </CardTitle>
          <p className="text-gray-600">Advanced AI-powered tools designed to supercharge your sales and relationship management capabilities</p>
        </CardHeader>
        <CardContent>
          <div className="grid gap-8">
            {aiTools.map((tool, index) => (
              <div key={index} className="border rounded-lg p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    {tool.icon}
                  </div>
                  <div className="flex-1 space-y-3">
                    <div>
                      <h3 className="font-semibold text-lg text-gray-900 mb-2">{tool.title}</h3>
                      <p className="text-gray-700 leading-relaxed">{tool.description}</p>
                    </div>
                    
                    <div className="bg-yellow-50 p-3 rounded-lg">
                      <p className="text-yellow-800 font-medium">🚀 Sales Impact: {tool.benefit}</p>
                    </div>
                    
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Key Features:</h4>
                      <div className="flex flex-wrap gap-2">
                        {tool.features.map((feature, featureIndex) => (
                          <Badge key={featureIndex} variant="secondary" className="text-xs">
                            {feature}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ROI Summary */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50">
        <CardHeader>
          <CardTitle className="text-center">Expected ROI for Relationship Managers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-6 text-center">
            <div className="space-y-2">
              <div className="text-3xl font-bold text-blue-600">15-20hrs</div>
              <p className="text-gray-700 font-medium">Weekly Time Savings</p>
              <p className="text-sm text-gray-600">Automated research and content creation</p>
            </div>
            <div className="space-y-2">
              <div className="text-3xl font-bold text-green-600">50%</div>
              <p className="text-gray-700 font-medium">Engagement Increase</p>
              <p className="text-sm text-gray-600">Personalized, data-driven communications</p>
            </div>
            <div className="space-y-2">
              <div className="text-3xl font-bold text-purple-600">3x</div>
              <p className="text-gray-700 font-medium">Faster Responses</p>
              <p className="text-sm text-gray-600">Instant access to research insights</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}