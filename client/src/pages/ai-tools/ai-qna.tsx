import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageSquare, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { AiFeedback } from "@/components/ai-feedback";
import Layout from "@/components/layout";

interface QAResponse {
  answer: string;
  sourceReports: string[];
  confidence: number;
}

export default function AIQnA() {
  const [question, setQuestion] = useState("");
  const [response, setResponse] = useState<QAResponse | null>(null);
  const [qaContentId, setQaContentId] = useState<number | null>(null);
  const { toast } = useToast();

  const questionMutation = useMutation({
    mutationFn: async (question: string) => {
      const response = await apiRequest("/api/ask-reports", "POST", { question });
      return response;
    },
    onSuccess: (data) => {
      setResponse(data);
      setQaContentId(data.contentId || null);
      toast({
        title: "Answer Generated",
        description: "AI has analyzed the report corpus and provided insights",
      });
    },
    onError: () => {
      toast({
        title: "Query Failed",
        description: "Failed to process your question. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleAskQuestion = () => {
    if (!question.trim()) {
      toast({
        title: "Missing Question",
        description: "Please enter a question to ask",
        variant: "destructive",
      });
      return;
    }

    questionMutation.mutate(question.trim());
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAskQuestion();
    }
  };

  const suggestedQuestions = [
    "What's 13D's latest view on inflation?",
    "What are the key risks in energy markets?",
    "Which sectors are showing the most promise?",
    "What's the outlook for precious metals?",
    "Are there any emerging investment themes?",
    "What's the current view on Chinese markets?"
  ];

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center mb-6">
          <MessageSquare className="w-6 h-6 mr-3 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900">13D AI Chatbot</h1>
        </div>

        <Card className="max-w-4xl">
        <CardContent className="p-6">
          {/* Description */}
          <div className="mb-6 p-4 bg-blue-50 rounded-lg border-l-4 border-blue-400">
            <p className="text-gray-700 text-sm">
              I can help you find insights from your WILTW and WATMTU report corpus. Ask me questions like "What's 
              13D's view on Chinese equities?" or "What are the latest thoughts on gold mining?"
            </p>
            <p className="text-gray-500 text-xs mt-2">4:41:56 PM</p>
          </div>

          {/* Question Input */}
          <div className="space-y-4">
            <div className="flex gap-3">
              <Input
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask a question about the reports..."
                className="flex-1"
                disabled={questionMutation.isPending}
              />
              <Button 
                onClick={handleAskQuestion}
                disabled={questionMutation.isPending || !question.trim()}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6"
              >
                {questionMutation.isPending ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>

            {/* Suggested Questions */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Suggested Questions:</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {suggestedQuestions.map((suggestedQ, index) => (
                  <button
                    key={index}
                    onClick={() => setQuestion(suggestedQ)}
                    className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full border transition-colors"
                    disabled={questionMutation.isPending}
                  >
                    {suggestedQ}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Response Area */}
          {response ? (
            <div className="mt-8 space-y-4">
              <AiFeedback contentId={qaContentId || undefined}>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h3 className="font-medium text-green-900 mb-3">AI Response:</h3>
                  <div className="text-gray-800 whitespace-pre-wrap leading-relaxed">
                    {response.answer}
                  </div>
                  
                  {response.sourceReports && response.sourceReports.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-green-200">
                      <h4 className="font-medium text-green-900 mb-2">Source Reports:</h4>
                      <div className="flex flex-wrap gap-2">
                        {response.sourceReports.map((report, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800"
                          >
                            {report}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {response.confidence && (
                    <div className="mt-3 text-xs text-green-700">
                      Confidence: {response.confidence}%
                    </div>
                  )}
                </div>
              </AiFeedback>
            </div>
          ) : (
            <div className="mt-8 min-h-[200px] border-2 border-dashed border-gray-200 rounded-lg flex items-center justify-center">
              <div className="text-center text-gray-500">
                <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">Ask a Question</p>
                <p className="text-sm mt-2">
                  Enter your question above and I'll search through the WILTW and WATMTU reports for insights
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      </div>
    </Layout>
  );
}