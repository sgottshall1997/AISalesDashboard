import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, BarChart3 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/page-header";

export default function ThemeTracker() {
  const [selectedTheme, setSelectedTheme] = useState<string>("");
  const [spikeThreshold, setSpikeThreshold] = useState("300%");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const { toast } = useToast();

  const handleAnalyzeTimeline = () => {
    if (!selectedTheme) {
      toast({
        title: "Missing Selection",
        description: "Please select a theme to track",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzing(true);
    toast({
      title: "Analyzing Timeline",
      description: `Tracking ${selectedTheme} with ${spikeThreshold} spike threshold`,
    });
    
    // Simulate analysis completion
    setTimeout(() => {
      setIsAnalyzing(false);
      toast({
        title: "Analysis Complete",
        description: "Time-series analysis ready for review",
      });
    }, 2000);
  };

  const themes = [
    "China Technology",
    "Inflation Hedging", 
    "Energy Transition",
    "Uranium Mining",
    "Precious Metals",
    "Geopolitical Risk",
    "Supply Chain",
    "ESG Investing"
  ];

  const thresholds = [
    "100%",
    "200%", 
    "300%",
    "400%",
    "500%"
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <PageHeader 
        title="Theme Tracker"
        subtitle="Time-Series Trend Engine for monitoring investment themes across research reports"
      />
      <div className="space-y-6 p-6">
        <Card className="max-w-4xl">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
            {/* Select Theme to Track */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Select Theme to Track
              </label>
              <Select value={selectedTheme} onValueChange={setSelectedTheme}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose a theme..." />
                </SelectTrigger>
                <SelectContent>
                  {themes.map((theme) => (
                    <SelectItem key={theme} value={theme}>
                      {theme}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Spike Alert Threshold */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Spike Alert Threshold (%)
              </label>
              <Select value={spikeThreshold} onValueChange={setSpikeThreshold}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {thresholds.map((threshold) => (
                    <SelectItem key={threshold} value={threshold}>
                      {threshold}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Analyze Timeline Button */}
            <div>
              <Button 
                onClick={handleAnalyzeTimeline}
                disabled={isAnalyzing || !selectedTheme}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-2"
              >
                {isAnalyzing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Analyzing...
                  </>
                ) : (
                  <>
                    <BarChart3 className="w-4 h-4" />
                    Analyze Timeline
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Analysis Results Area */}
          <div className="mt-8 min-h-[300px] border-2 border-dashed border-gray-200 rounded-lg flex items-center justify-center">
            <div className="text-center text-gray-500">
              <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Time-Series Analysis Chart</p>
              <p className="text-sm mt-2">
                {selectedTheme 
                  ? `Select "Analyze Timeline" to view ${selectedTheme} trends over time`
                  : "Select a theme and click 'Analyze Timeline' to view trend analysis"
                }
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}