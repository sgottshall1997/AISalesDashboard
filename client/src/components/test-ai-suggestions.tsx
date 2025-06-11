import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, RefreshCw, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function TestAISuggestions() {
  const [isLoading, setIsLoading] = useState(false);
  const [generatedEmail, setGeneratedEmail] = useState("");
  const { toast } = useToast();

  const testSuggestions = [
    {
      type: "frequent_theme",
      title: "Commodities Surge: Inflation Hedge Strategies",
      description: "Explore investment opportunities in commodities as inflation indicators rise, with a focus on precious metals and agricultural stocks.",
      emailAngle: "Position for inflation protection through strategic commodity allocation",
      keyPoints: ["Rising commodity prices signal inflation", "Gold and silver showing strength", "Agricultural stocks outperforming"],
      supportingReports: ["WILTW_2025-05-29", "WATMTU_2025-06-08"]
    },
    {
      type: "emerging_trend", 
      title: "China's Market Renaissance: Contrarian Investment Opportunities",
      description: "Identify potential gains in Chinese stocks as they enter a secular bull market, challenging the notion of China being uninvestable.",
      emailAngle: "Contrarian opportunity in oversold Chinese equities",
      keyPoints: ["Chinese stocks at attractive valuations", "Policy support increasing", "Institutional flows turning positive"],
      supportingReports: ["WILTW_2025-06-05"]
    }
  ];

  const handleGenerateEmail = async (suggestion: any) => {
    setIsLoading(true);
    console.log('Starting email generation for:', suggestion.title);
    
    try {
      const response = await fetch('/api/ai/generate-theme-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          theme: suggestion.title,
          emailAngle: suggestion.emailAngle,
          description: suggestion.description,
          keyPoints: suggestion.keyPoints,
          supportingReports: suggestion.supportingReports
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate email');
      }
      
      const data = await response.json();
      setGeneratedEmail(data.email);
      
      toast({
        title: "Email Generated",
        description: "Your personalized email has been created successfully.",
      });
      
    } catch (error) {
      console.error('Error generating email:', error);
      toast({
        title: "Error",
        description: "Failed to generate email. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          AI Content Suggestions (Test)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {testSuggestions.map((suggestion, index) => (
          <div key={index} className="border rounded-lg p-4 space-y-3">
            <div className="flex items-start gap-3">
              <TrendingUp className="h-5 w-5 text-blue-600 mt-1" />
              <div className="flex-1">
                <h3 className="font-medium text-gray-900">{suggestion.title}</h3>
                <p className="text-sm text-gray-600 mt-1">{suggestion.description}</p>
                
                <div className="mt-3">
                  <Button
                    onClick={() => handleGenerateEmail(suggestion)}
                    disabled={isLoading}
                    className="inline-flex items-center gap-2"
                    style={{
                      backgroundColor: index === 0 ? "#2563eb" : "#059669",
                      color: "white"
                    }}
                  >
                    {isLoading ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Mail className="h-4 w-4" />
                        Generate Email
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ))}
        
        {generatedEmail && (
          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <h4 className="font-medium text-green-900 mb-2">Generated Email:</h4>
            <pre className="text-sm text-green-800 whitespace-pre-wrap">{generatedEmail}</pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
}