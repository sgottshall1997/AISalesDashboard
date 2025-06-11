import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface FundMapping {
  fundName: string;
  strategy: string;
  riskProfile: string;
  thematicAlignment: string[];
  matchingReports: string[];
  keyThemes: string[];
  relevanceScore: number;
}

export default function FundMapping() {
  const [fundName, setFundName] = useState("");
  const [strategy, setStrategy] = useState("");
  const [riskProfile, setRiskProfile] = useState("");
  const [mapping, setMapping] = useState<FundMapping | null>(null);
  const { toast } = useToast();

  const mappingMutation = useMutation({
    mutationFn: async (data: { fundName: string; strategy: string; riskProfile: string }) => {
      const response = await apiRequest("POST", "/api/map-fund-themes", data);
      return response.json();
    },
    onSuccess: (data) => {
      setMapping(data);
      toast({
        title: "Mapping Complete",
        description: `Successfully mapped ${fundName} to research themes`,
      });
    },
    onError: () => {
      toast({
        title: "Mapping Failed",
        description: "Failed to map fund to themes. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleMapFund = () => {
    if (!fundName.trim() || !strategy || !riskProfile) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    mappingMutation.mutate({
      fundName: fundName.trim(),
      strategy,
      riskProfile
    });
  };

  const strategies = [
    "Select strategy",
    "Growth",
    "Value",
    "Balanced",
    "Income",
    "Aggressive Growth",
    "Conservative",
    "Sector Focused",
    "Global Diversified"
  ];

  const riskLevels = [
    "Select risk level",
    "Conservative",
    "Moderate",
    "Aggressive",
    "High Risk",
    "Ultra High Risk"
  ];

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center mb-6">
        <Building2 className="w-6 h-6 mr-3 text-blue-600" />
        <h1 className="text-2xl font-bold text-gray-900">Fund Strategy Mapping Tool</h1>
      </div>

      <Card className="max-w-4xl">
        <CardContent className="p-6">
          <div className="space-y-6">
            {/* Fund Name */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Fund Name
              </label>
              <Input
                value={fundName}
                onChange={(e) => setFundName(e.target.value)}
                placeholder="Enter fund name"
                className="w-full"
              />
            </div>

            {/* Investment Strategy and Risk Profile Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Investment Strategy */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Investment Strategy
                </label>
                <Select value={strategy} onValueChange={setStrategy}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select strategy" />
                  </SelectTrigger>
                  <SelectContent>
                    {strategies.map((strat) => (
                      <SelectItem key={strat} value={strat}>
                        {strat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Risk Profile */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Risk Profile
                </label>
                <Select value={riskProfile} onValueChange={setRiskProfile}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select risk level" />
                  </SelectTrigger>
                  <SelectContent>
                    {riskLevels.map((risk) => (
                      <SelectItem key={risk} value={risk}>
                        {risk}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Map Fund to Research Themes Button */}
            <div>
              <Button 
                onClick={handleMapFund}
                disabled={mappingMutation.isPending || !fundName.trim() || !strategy || !riskProfile}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-2"
              >
                {mappingMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Mapping Fund...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    Map Fund to Research Themes
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Results Area */}
          {mapping ? (
            <div className="mt-8 space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">
                Thematic Mapping for {mapping.fundName}
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Fund Details */}
                <Card className="border border-gray-200">
                  <CardContent className="p-4">
                    <h4 className="font-semibold text-gray-900 mb-3">Fund Profile</h4>
                    <div className="space-y-2">
                      <div>
                        <span className="text-sm font-medium text-gray-600">Strategy:</span>
                        <span className="ml-2 text-sm text-gray-800">{mapping.strategy}</span>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-600">Risk Profile:</span>
                        <span className="ml-2 text-sm text-gray-800">{mapping.riskProfile}</span>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-600">Relevance Score:</span>
                        <span className="ml-2 text-sm text-gray-800">{mapping.relevanceScore}%</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Key Themes */}
                <Card className="border border-gray-200">
                  <CardContent className="p-4">
                    <h4 className="font-semibold text-gray-900 mb-3">Key Themes</h4>
                    {mapping.keyThemes.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {mapping.keyThemes.map((theme, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                          >
                            {theme}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">No key themes identified</p>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Thematic Alignment */}
              {mapping.thematicAlignment.length > 0 && (
                <Card className="border border-gray-200">
                  <CardContent className="p-4">
                    <h4 className="font-semibold text-gray-900 mb-3">Thematic Alignment</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {mapping.thematicAlignment.map((alignment, idx) => (
                        <div
                          key={idx}
                          className="p-3 bg-gray-50 rounded-lg border"
                        >
                          <p className="text-sm text-gray-800">{alignment}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Matching Reports */}
              {mapping.matchingReports.length > 0 && (
                <Card className="border border-gray-200">
                  <CardContent className="p-4">
                    <h4 className="font-semibold text-gray-900 mb-3">Matching Reports</h4>
                    <div className="space-y-2">
                      {mapping.matchingReports.map((report, idx) => (
                        <div
                          key={idx}
                          className="flex items-center p-2 bg-green-50 rounded border-l-4 border-green-400"
                        >
                          <span className="text-sm text-gray-800">{report}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <div className="mt-8 min-h-[200px] border-2 border-dashed border-gray-200 rounded-lg flex items-center justify-center">
              <div className="text-center text-gray-500">
                <Building2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">Fund Mapping Results</p>
                <p className="text-sm mt-2">
                  Enter fund details and click 'Map Fund to Research Themes' to see thematic alignment
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}