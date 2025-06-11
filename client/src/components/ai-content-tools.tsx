import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CallPreparation } from "./ai-tools/call-preparation";
import { 
  Lightbulb,
  TrendingUp, 
  Target, 
  BarChart3, 
  MessageCircle, 
  FileText, 
  Building2,
  Brain,
  Phone
} from "lucide-react";

export function AIContentTools() {
  const [activeTab, setActiveTab] = useState("call-preparation");

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2 flex items-center">
          <Brain className="w-6 h-6 mr-3 text-purple-600" />
          AI Content Tools
        </h2>
        <p className="text-gray-600">
          Advanced AI-powered tools for content analysis, prospect matching, and intelligent research insights
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-8">
          <TabsTrigger value="call-preparation" className="flex items-center gap-2">
            <Phone className="w-4 h-4" />
            Call Prep
          </TabsTrigger>
          <TabsTrigger value="campaign-suggestions" className="flex items-center gap-2">
            <Lightbulb className="w-4 h-4" />
            Campaign
          </TabsTrigger>
          <TabsTrigger value="theme-tracker" className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Themes
          </TabsTrigger>
          <TabsTrigger value="prospect-match" className="flex items-center gap-2">
            <Target className="w-4 h-4" />
            Prospects
          </TabsTrigger>
          <TabsTrigger value="portfolio-scorer" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Scorer
          </TabsTrigger>
          <TabsTrigger value="ai-qna" className="flex items-center gap-2">
            <MessageCircle className="w-4 h-4" />
            Q&A
          </TabsTrigger>
          <TabsTrigger value="one-pager" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            1-Pager
          </TabsTrigger>
          <TabsTrigger value="fund-mapper" className="flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            Mapper
          </TabsTrigger>
        </TabsList>

        <TabsContent value="call-preparation">
          <CallPreparation />
        </TabsContent>

        <TabsContent value="campaign-suggestions">
          <Card>
            <CardHeader>
              <CardTitle>Campaign Suggestions</CardTitle>
              <CardDescription>Generate themed email campaigns based on research reports</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-500">Coming soon...</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="theme-tracker">
          <Card>
            <CardHeader>
              <CardTitle>Theme Tracker</CardTitle>
              <CardDescription>Track recurring themes across research reports</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-500">Coming soon...</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="prospect-match">
          <Card>
            <CardHeader>
              <CardTitle>Prospect Matchmaker</CardTitle>
              <CardDescription>Match prospects to relevant research content</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-500">Coming soon...</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="portfolio-scorer">
          <Card>
            <CardHeader>
              <CardTitle>Portfolio Relevance Scorer</CardTitle>
              <CardDescription>Score content relevance to portfolio holdings</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-500">Coming soon...</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ai-qna">
          <Card>
            <CardHeader>
              <CardTitle>AI Q&A</CardTitle>
              <CardDescription>Ask questions about your research content</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-500">Coming soon...</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="one-pager">
          <Card>
            <CardHeader>
              <CardTitle>One-Pager Generator</CardTitle>
              <CardDescription>Generate executive summaries and one-pagers</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-500">Coming soon...</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fund-mapper">
          <Card>
            <CardHeader>
              <CardTitle>Fund Mapping Tool</CardTitle>
              <CardDescription>Map research themes to fund strategies</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-500">Coming soon...</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}