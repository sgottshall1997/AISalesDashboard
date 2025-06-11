import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { TrendingUp, AlertTriangle, Calendar } from "lucide-react";

interface ThemeData {
  theme: string;
  count: number;
  date: string;
  reports: string[];
}

interface TimeSeriesData {
  date: string;
  count: number;
  reports: string[];
}

export function ThemeTracker() {
  const [selectedTheme, setSelectedTheme] = useState<string>("");
  const [alertThreshold, setAlertThreshold] = useState<number>(300);
  const { toast } = useToast();

  // Permanent 13D investment themes extracted from report analysis
  const permanent13DThemes = [
    "Critical Minerals & Rare Earth Elements",
    "China-US Tech Arms Race", 
    "Commodities Supercycle",
    "Gold & Precious Metals",
    "Mining & Industrial Metals",
    "Energy Transition & Clean Tech",
    "Food Security & Agriculture",
    "Defense & National Security",
    "AI Infrastructure & Semiconductors",
    "Supply Chain Reshoring",
    "Currency & Dollar Alternatives",
    "Water Scarcity & Resources",
    "Geopolitical Risk & Trade Wars",
    "Inflation & Bond Market Trends",
    "Chinese Equity Markets",
    "Digital Infrastructure & Telecom",
    "Uranium & Nuclear Energy",
    "European Economic Policy",
    "Loneliness Economy & Pet Care",
    "Agricultural Commodities"
  ];

  const { data: dynamicThemes = [], isLoading: themesLoading } = useQuery({
    queryKey: ["/api/themes/list"],
    queryFn: () => apiRequest("GET", "/api/themes/list").then(res => res.json()),
  });

  // Combine permanent themes with dynamic themes from reports
  const allThemes = [
    ...permanent13DThemes.map(theme => ({ theme, count: 0, reports: [] })),
    ...dynamicThemes.filter((dynamicTheme: any) => 
      !permanent13DThemes.some(permanentTheme => 
        permanentTheme.toLowerCase().includes(dynamicTheme.theme.toLowerCase()) ||
        dynamicTheme.theme.toLowerCase().includes(permanentTheme.toLowerCase())
      )
    )
  ];

  const { data: timeSeriesData = [], isLoading: timeSeriesLoading } = useQuery({
    queryKey: ["/api/themes/timeseries", selectedTheme],
    queryFn: () => apiRequest("GET", `/api/themes/timeseries?theme=${encodeURIComponent(selectedTheme)}`).then(res => res.json()),
    enabled: !!selectedTheme,
  });

  const checkForSpikes = (data: TimeSeriesData[]) => {
    if (data.length < 2) return false;
    
    const latest = data[data.length - 1];
    const previous = data[data.length - 2];
    
    if (previous.count === 0) return false;
    
    const percentageIncrease = ((latest.count - previous.count) / previous.count) * 100;
    return percentageIncrease >= alertThreshold;
  };

  const hasSpike = selectedTheme && timeSeriesData.length > 0 ? checkForSpikes(timeSeriesData) : false;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <TrendingUp className="w-5 h-5 mr-2" />
            Theme Tracker - Time-Series Trend Engine
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Theme to Track
                </label>
                <Select value={selectedTheme} onValueChange={setSelectedTheme}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a theme..." />
                  </SelectTrigger>
                  <SelectContent>
                    {/* Permanent 13D themes section */}
                    <div className="px-2 py-1 text-xs font-semibold text-gray-500 bg-gray-100">
                      13D Core Investment Themes
                    </div>
                    {permanent13DThemes.map((theme) => (
                      <SelectItem key={theme} value={theme}>
                        {theme}
                      </SelectItem>
                    ))}
                    
                    {/* Dynamic themes from reports */}
                    {dynamicThemes.length > 0 && (
                      <>
                        <div className="px-2 py-1 text-xs font-semibold text-gray-500 bg-gray-100 mt-2">
                          Report-Based Themes
                        </div>
                        {dynamicThemes
                          .filter((themeData: any) => 
                            !permanent13DThemes.some(permanentTheme => 
                              permanentTheme.toLowerCase().includes(themeData.theme.toLowerCase()) ||
                              themeData.theme.toLowerCase().includes(permanentTheme.toLowerCase())
                            )
                          )
                          .map((themeData: any) => (
                            <SelectItem key={themeData.theme} value={themeData.theme}>
                              {themeData.theme} ({themeData.count} mentions)
                            </SelectItem>
                          ))
                        }
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Spike Alert Threshold (%)
                </label>
                <Select value={alertThreshold.toString()} onValueChange={(value) => setAlertThreshold(parseInt(value))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="200">200%</SelectItem>
                    <SelectItem value="300">300%</SelectItem>
                    <SelectItem value="400">400%</SelectItem>
                    <SelectItem value="500">500%</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <Button 
                  onClick={() => {
                    if (selectedTheme) {
                      toast({
                        title: "Theme Analysis",
                        description: `Tracking "${selectedTheme}" with ${alertThreshold}% spike threshold`,
                      });
                    }
                  }}
                  disabled={!selectedTheme}
                  className="w-full"
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  Analyze Timeline
                </Button>
              </div>
            </div>

            {hasSpike && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center">
                  <AlertTriangle className="w-5 h-5 text-red-600 mr-2" />
                  <div>
                    <h4 className="text-red-800 font-medium">Theme Spike Detected!</h4>
                    <p className="text-red-700 text-sm">
                      "{selectedTheme}" has increased by over {alertThreshold}% in the latest period.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {selectedTheme && timeSeriesData.length > 0 && (
              <div className="mt-6">
                <h3 className="text-lg font-medium mb-4">Theme Frequency Over Time: "{selectedTheme}"</h3>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={timeSeriesData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="date" 
                        tick={{ fontSize: 12 }}
                        angle={-45}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis />
                      <Tooltip 
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-white p-3 border rounded shadow-lg">
                                <p className="font-medium">{label}</p>
                                <p className="text-blue-600">
                                  Mentions: {payload[0].value}
                                </p>
                                {data.reports && data.reports.length > 0 && (
                                  <div className="mt-2">
                                    <p className="text-sm font-medium">Reports:</p>
                                    <ul className="text-xs text-gray-600">
                                      {data.reports.slice(0, 3).map((report: string, idx: number) => (
                                        <li key={idx}>• {report}</li>
                                      ))}
                                      {data.reports.length > 3 && (
                                        <li>• +{data.reports.length - 3} more...</li>
                                      )}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="count" 
                        stroke="#2563eb" 
                        strokeWidth={2}
                        dot={{ fill: "#2563eb" }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {themesLoading && (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-gray-500 mt-2">Loading themes...</p>
              </div>
            )}

            {!themesLoading && dynamicThemes.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <TrendingUp className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>Select from permanent 13D themes above or upload reports to generate dynamic themes.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}