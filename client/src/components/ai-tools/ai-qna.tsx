import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { MessageCircle, Send, BookOpen, Lightbulb } from "lucide-react";

interface QnAResponse {
  answer: string;
  sourceReports: Array<{
    id: number;
    title: string;
    relevanceScore: number;
    excerpt: string;
  }>;
  confidence: number;
}

interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  sources?: QnAResponse['sourceReports'];
  confidence?: number;
}

export function AIQnA() {
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      type: 'assistant',
      content: 'I can help you find insights from your WILTW and WATMTU report corpus. Ask me questions like "What\'s 13D\'s view on Chinese equities?" or "What are the latest thoughts on gold mining?"',
      timestamp: new Date()
    }
  ]);
  const { toast } = useToast();

  const askQuestionMutation = useMutation({
    mutationFn: async (question: string) => {
      const response = await apiRequest("POST", "/api/ask-reports", { query: question });
      return response.json();
    },
    onSuccess: (data: QnAResponse) => {
      const assistantMessage: ChatMessage = {
        id: Date.now().toString(),
        type: 'assistant',
        content: data.answer,
        timestamp: new Date(),
        sources: data.sourceReports,
        confidence: data.confidence
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      
      toast({
        title: "Answer Generated",
        description: `Response based on ${data.sourceReports?.length || 0} reports with ${data.confidence}% confidence`,
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

  const handleSubmit = () => {
    if (!query.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: query,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    askQuestionMutation.mutate(query);
    setQuery("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
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

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return "bg-green-100 text-green-800";
    if (confidence >= 60) return "bg-blue-100 text-blue-800";
    return "bg-yellow-100 text-yellow-800";
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <MessageCircle className="w-5 h-5 mr-2" />
            AI Q&A on WILTW/WATMTU Corpus
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Chat Messages */}
            <div className="h-96 overflow-y-auto border rounded-lg p-4 bg-gray-50">
              <div className="space-y-4">
                {messages.map((message) => (
                  <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-3xl rounded-lg p-3 ${
                      message.type === 'user' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-white border shadow-sm'
                    }`}>
                      <div className="whitespace-pre-wrap">{message.content}</div>
                      
                      {message.type === 'assistant' && message.confidence !== undefined && (
                        <div className="mt-2 flex items-center gap-2">
                          <Badge className={getConfidenceColor(message.confidence)}>
                            {message.confidence}% confidence
                          </Badge>
                        </div>
                      )}
                      
                      {message.sources && message.sources.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <p className="text-sm font-medium text-gray-700 mb-2">Source Reports:</p>
                          <div className="space-y-2">
                            {message.sources.map((source) => (
                              <div key={source.id} className="text-sm bg-gray-50 rounded p-2">
                                <div className="font-medium">{source.title}</div>
                                <div className="text-gray-600 text-xs mt-1">
                                  Relevance: {source.relevanceScore}%
                                </div>
                                <div className="text-gray-700 text-xs mt-1 italic">
                                  "{source.excerpt.substring(0, 150)}..."
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      <div className="text-xs text-gray-500 mt-2">
                        {message.timestamp.toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))}
                
                {askQuestionMutation.isPending && (
                  <div className="flex justify-start">
                    <div className="bg-white border shadow-sm rounded-lg p-3">
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                        <span className="text-gray-600">Searching through reports...</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Input Area */}
            <div className="flex gap-2">
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask a question about the reports..."
                disabled={askQuestionMutation.isPending}
                className="flex-1"
              />
              <Button 
                onClick={handleSubmit}
                disabled={!query.trim() || askQuestionMutation.isPending}
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>

            {/* Suggested Questions */}
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                <Lightbulb className="w-4 h-4 mr-1" />
                Suggested Questions:
              </p>
              <div className="flex flex-wrap gap-2">
                {suggestedQuestions.map((suggestion, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    onClick={() => setQuery(suggestion)}
                    className="text-xs"
                  >
                    {suggestion}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}