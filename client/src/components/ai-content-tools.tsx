import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ThemeTracker } from "./ai-tools/theme-tracker";
import { ProspectMatchmaker } from "./ai-tools/prospect-matchmaker";
import { PortfolioRelevanceScorer } from "./ai-tools/portfolio-relevance-scorer";
import { AIQnA } from "./ai-tools/ai-qna";
import { OnePagerGenerator } from "./ai-tools/one-pager-generator";
import { FundMappingTool } from "./ai-tools/fund-mapping-tool";
import { 
  TrendingUp, 
  Target, 
  BarChart3, 
  MessageCircle, 
  FileText, 
  Building2,
  Brain 
} from "lucide-react";

export function AIContentTools() {
  const [activeTab, setActiveTab] = useState("theme-tracker");

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
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="theme-tracker" className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Theme Tracker
          </TabsTrigger>
          <TabsTrigger value="prospect-match" className="flex items-center gap-2">
            <Target className="w-4 h-4" />
            Prospect Match
          </TabsTrigger>
          <TabsTrigger value="portfolio-scorer" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Portfolio Scorer
          </TabsTrigger>
          <TabsTrigger value="ai-qna" className="flex items-center gap-2">
            <MessageCircle className="w-4 h-4" />
            AI Q&A
          </TabsTrigger>
          <TabsTrigger value="one-pager" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            1-Pager Gen
          </TabsTrigger>
          <TabsTrigger value="fund-mapper" className="flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            Fund Mapper
          </TabsTrigger>
        </TabsList>

        <TabsContent value="theme-tracker">
          <ThemeTracker />
        </TabsContent>

        <TabsContent value="prospect-match">
          <ProspectMatchmaker />
        </TabsContent>

        <TabsContent value="portfolio-scorer">
          <PortfolioRelevanceScorer />
        </TabsContent>

        <TabsContent value="ai-qna">
          <AIQnA />
        </TabsContent>

        <TabsContent value="one-pager">
          <OnePagerGenerator />
        </TabsContent>

        <TabsContent value="fund-mapper">
          <FundMappingTool />
        </TabsContent>
      </Tabs>
    </div>
  );
}