import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, Search, Loader2, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface FundStrategy {
  strategyName: string;
  description: string;
  keyThemes: string[];
  relevantReports: string[];
  mappedProspects: string[];
  confidenceScore: number;
}

export default function FundMapping() {
  const [strategies, setStrategies] = useState<FundStrategy[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleLoadStrategies = async () => {
    setIsLoading(true);
    try {
      const response = await apiRequest("/api/fund-strategies");
      setStrategies(response || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load fund strategies",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copyStrategyDetails = (strategy: FundStrategy) => {
    const details = `${strategy.strategyName}\n\n${strategy.description}\n\nKey Themes:\n${strategy.keyThemes.map(theme => `• ${theme}`).join('\n')}`;
    navigator.clipboard.writeText(details);
    toast({
      title: "Copied",
      description: "Strategy details copied to clipboard",
    });
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 80) return "bg-green-100 text-green-800";
    if (score >= 60) return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Fund Mapping</h1>
          <p className="text-gray-600 mt-2">
            Map fund strategies to relevant themes and identify matching prospects
          </p>
        </div>
        <Button 
          onClick={handleLoadStrategies}
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
              Load Strategies
            </>
          )}
        </Button>
      </div>

      {strategies.length > 0 && (
        <div className="grid gap-6">
          {strategies.map((strategy, index) => (
            <Card key={index} className="border-l-4 border-l-primary">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <CardTitle className="text-xl">{strategy.strategyName}</CardTitle>
                    <CardDescription>{strategy.description}</CardDescription>
                    <Badge className={getConfidenceColor(strategy.confidenceScore)}>
                      {strategy.confidenceScore}% Confidence
                    </Badge>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyStrategyDetails(strategy)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Key Investment Themes</h4>
                  <div className="flex flex-wrap gap-2">
                    {strategy.keyThemes.map((theme, idx) => (
                      <Badge key={idx} variant="secondary">
                        {theme}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Relevant Reports</h4>
                  <div className="flex flex-wrap gap-2">
                    {strategy.relevantReports.map((report, idx) => (
                      <Badge key={idx} variant="outline" className="border-blue-500 text-blue-700">
                        {report}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Mapped Prospects</h4>
                  <div className="flex flex-wrap gap-2">
                    {strategy.mappedProspects.map((prospect, idx) => (
                      <Badge key={idx} className="bg-primary/10 text-primary hover:bg-primary/20">
                        {prospect}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {strategies.length === 0 && !isLoading && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Fund Strategies Loaded</h3>
            <p className="text-gray-600 text-center mb-4">
              Click "Load Strategies" to analyze fund strategies and map them to relevant themes and prospects.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}