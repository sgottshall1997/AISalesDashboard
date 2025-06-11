import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { TrendingUp, Calendar, Search, Loader2, Mail, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface ThemeData {
  theme: string;
  frequency: number;
  trend: "up" | "down" | "stable";
  reports: string[];
  firstSeen: string;
  lastSeen: string;
  relevanceScore: number;
}

export default function ThemeTracker() {
  const [themes, setThemes] = useState<ThemeData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleLoadThemes = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/themes/list");
      const data = await response.json();
      
      // Transform the API response to match our interface
      const transformedThemes = data.map((item: any) => ({
        theme: item.theme,
        frequency: item.frequency || item.totalCount || 0,
        trend: item.trend || "stable",
        reports: item.reports || [],
        firstSeen: "2024-01-01", // Default values for now
        lastSeen: new Date().toISOString().split('T')[0],
        relevanceScore: Math.min(100, (item.frequency || item.totalCount || 0) * 8)
      }));
      
      setThemes(transformedThemes);
      toast({
        title: "Themes Loaded",
        description: `Found ${transformedThemes.length} themes across your reports`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load theme data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "up": return "↗️";
      case "down": return "↘️";
      default: return "→";
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case "up": return "text-green-600";
      case "down": return "text-red-600";
      default: return "text-gray-600";
    }
  };

  const getRelevanceColor = (score: number) => {
    if (score >= 80) return "bg-green-100 text-green-800";
    if (score >= 60) return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Theme Tracker</h1>
          <p className="text-gray-600 mt-2">
            Track and analyze recurring themes across your research reports
          </p>
        </div>
        <Button 
          onClick={handleLoadThemes}
          disabled={isLoading}
          className="flex items-center gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading...
            </>
          ) : (
            <>
              <Search className="h-4 w-4" />
              Load Themes
            </>
          )}
        </Button>
      </div>

      {themes.length > 0 && (
        <div className="grid gap-4">
          {themes.map((theme, index) => (
            <Card key={index} className="border-l-4 border-l-primary">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <CardTitle className="text-xl flex items-center gap-2">
                      {theme.theme}
                      <span className={`text-lg ${getTrendColor(theme.trend)}`}>
                        {getTrendIcon(theme.trend)}
                      </span>
                    </CardTitle>
                    <div className="flex gap-2">
                      <Badge variant="secondary">
                        {theme.frequency} mentions
                      </Badge>
                      <Badge className={getRelevanceColor(theme.relevanceScore)}>
                        {theme.relevanceScore}% relevance
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-1">First Seen</h4>
                    <p className="text-gray-600 flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {theme.firstSeen}
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-1">Last Seen</h4>
                    <p className="text-gray-600 flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {theme.lastSeen}
                    </p>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Featured Reports</h4>
                  <div className="flex flex-wrap gap-2">
                    {theme.reports.map((report, idx) => (
                      <Badge key={idx} variant="outline">
                        {report}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {themes.length === 0 && !isLoading && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <TrendingUp className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Themes Tracked Yet</h3>
            <p className="text-gray-600 text-center mb-4">
              Click "Load Themes" to analyze recurring themes across your research reports and track their evolution over time.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}