import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, TrendingUp, Building2, Target } from "lucide-react";

interface PortfolioConstituent {
  id: number;
  ticker: string;
  name: string;
  index: string;
  isHighConviction: boolean;
  weightInIndex: string | null;
  weightInHighConviction: string | null;
  indexWeightInHc: string | null;
  weightInHcPortfolio: string | null;
  rebalanceDate: string | null;
  created_at: string | null;
}

export default function PortfolioConstituents() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedIndex, setSelectedIndex] = useState<string>("all");
  const [showHighConvictionOnly, setShowHighConvictionOnly] = useState(false);

  // Fetch all constituents
  const { data: constituents = [], isLoading: loadingConstituents } = useQuery<PortfolioConstituent[]>({
    queryKey: ["/api/constituents"],
  });

  // Fetch available indexes
  const { data: indexes = [], isLoading: loadingIndexes } = useQuery<string[]>({
    queryKey: ["/api/constituents/indexes"],
  });

  // Filter constituents based on search and filters
  const filteredConstituents = constituents.filter((constituent) => {
    const matchesSearch = 
      constituent.ticker.toLowerCase().includes(searchTerm.toLowerCase()) ||
      constituent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      constituent.index.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesIndex = selectedIndex === "all" || constituent.index === selectedIndex;
    const matchesConviction = !showHighConvictionOnly || constituent.isHighConviction;
    
    return matchesSearch && matchesIndex && matchesConviction;
  });

  // Group constituents by index for display
  const groupedConstituents = filteredConstituents.reduce((acc, constituent) => {
    if (!acc[constituent.index]) {
      acc[constituent.index] = [];
    }
    acc[constituent.index].push(constituent);
    return acc;
  }, {} as Record<string, PortfolioConstituent[]>);

  // Calculate statistics
  const totalConstituents = constituents.length;
  const highConvictionCount = constituents.filter(c => c.isHighConviction).length;
  const indexCount = indexes.length;

  if (loadingConstituents || loadingIndexes) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Portfolio Constituents</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-8 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Portfolio Constituents</h1>
          <p className="text-gray-600 mt-2">
            Manage and explore 13D Research index components and high conviction holdings
          </p>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Holdings</p>
                <p className="text-3xl font-bold text-blue-600">{totalConstituents}</p>
              </div>
              <Building2 className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">High Conviction</p>
                <p className="text-3xl font-bold text-green-600">{highConvictionCount}</p>
              </div>
              <Target className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Indexes</p>
                <p className="text-3xl font-bold text-purple-600">{indexCount}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by ticker, name, or index..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Index Filter */}
            <Select value={selectedIndex} onValueChange={setSelectedIndex}>
              <SelectTrigger>
                <SelectValue placeholder="Select index" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Indexes</SelectItem>
                {indexes.map((index) => (
                  <SelectItem key={index} value={index}>
                    {index}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* High Conviction Filter */}
            <Select 
              value={showHighConvictionOnly ? "high-conviction" : "all"}
              onValueChange={(value) => setShowHighConvictionOnly(value === "high-conviction")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Holdings</SelectItem>
                <SelectItem value="high-conviction">High Conviction Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <div className="space-y-6">
        {Object.entries(groupedConstituents).length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">No constituents found</h3>
              <p className="text-gray-500">Try adjusting your search criteria or filters.</p>
            </CardContent>
          </Card>
        ) : (
          Object.entries(groupedConstituents).map(([indexName, indexConstituents]) => {
            // Get index-level HC weight from the first HC constituent in this index
            const indexHcWeight = indexConstituents.find(c => c.isHighConviction && c.indexWeightInHc)?.indexWeightInHc;
            
            return (
              <Card key={indexName}>
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <span>{indexName}</span>
                      {indexHcWeight && (
                        <span className="text-sm font-normal text-green-600 mt-1">
                          Index Weight in HC: {indexHcWeight}%
                        </span>
                      )}
                    </div>
                    <Badge variant="outline">
                      {indexConstituents.length} holding{indexConstituents.length !== 1 ? 's' : ''}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {indexConstituents.map((constituent) => (
                      <div
                        key={constituent.id}
                        className={`p-4 border rounded-lg ${
                          constituent.isHighConviction 
                            ? 'border-green-200 bg-green-50' 
                            : 'border-gray-200 bg-white'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h4 className="font-semibold text-lg">{constituent.ticker}</h4>
                            <p className="text-sm text-gray-600 line-clamp-2">{constituent.name}</p>
                          </div>
                          {constituent.isHighConviction && (
                            <Badge variant="default" className="bg-green-600 text-white">
                              🔥 HC
                            </Badge>
                          )}
                        </div>
                        
                        {/* Weight Information */}
                        <div className="space-y-2">
                          {constituent.isHighConviction && constituent.weightInHcPortfolio && (
                            <div className="bg-green-50 p-2 rounded border border-green-200">
                              <div className="flex justify-between items-center">
                                <span className="text-xs font-medium text-green-700">Individual HC Weight:</span>
                                <span className="text-xs font-bold text-green-800">{constituent.weightInHcPortfolio}%</span>
                              </div>
                            </div>
                          )}
                          
                          {constituent.weightInIndex && (
                            <div className="bg-blue-50 p-2 rounded border border-blue-200">
                              <div className="flex justify-between items-center">
                                <span className="text-xs font-medium text-blue-700">Weight in Index:</span>
                                <span className="text-xs font-bold text-blue-800">{constituent.weightInIndex}%</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}