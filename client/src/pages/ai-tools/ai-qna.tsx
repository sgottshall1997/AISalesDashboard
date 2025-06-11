import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageCircle, Send, Loader2, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface QAMessage {
  id: string;
  question: string;
  answer: string;
  timestamp: Date;
}

export default function AIQnA() {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<QAMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmitQuestion = async () => {
    if (!question.trim()) {
      toast({
        title: "Error",
        description: "Please enter a question",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    const currentQuestion = question;
    setQuestion("");

    try {
      const response = await apiRequest("/api/ask-reports", {
        method: "POST",
        body: { question: currentQuestion },
      });

      const newMessage: QAMessage = {
        id: Date.now().toString(),
        question: currentQuestion,
        answer: response.answer || "No answer provided",
        timestamp: new Date(),
      };

      setMessages(prev => [newMessage, ...prev]);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to get answer from AI",
        variant: "destructive",
      });
      setQuestion(currentQuestion); // Restore question on error
    } finally {
      setIsLoading(false);
    }
  };

  const copyAnswer = (answer: string) => {
    navigator.clipboard.writeText(answer);
    toast({
      title: "Copied",
      description: "Answer copied to clipboard",
    });
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">AI Q&A</h1>
        <p className="text-gray-600 mt-2">
          Ask questions about your reports and content to get intelligent insights
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Ask a Question
          </CardTitle>
          <CardDescription>
            Ask anything about your reports, market trends, or investment themes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="e.g., What are the key trends in China's tech sector based on recent reports?"
            rows={3}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                handleSubmitQuestion();
              }
            }}
          />
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-500">
              Press Cmd/Ctrl + Enter to submit
            </p>
            <Button 
              onClick={handleSubmitQuestion}
              disabled={isLoading || !question.trim()}
              className="flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Thinking...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Ask AI
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {messages.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">
            Recent Q&A ({messages.length})
          </h2>
          
          <div className="space-y-4">
            {messages.map((message) => (
              <Card key={message.id} className="border-l-4 border-l-primary">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-2">Question</h3>
                      <p className="text-gray-700 bg-blue-50 p-3 rounded-md">
                        {message.question}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <span className="text-xs text-gray-500">
                        {message.timestamp.toLocaleTimeString()}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyAnswer(message.answer)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <h4 className="font-semibold text-gray-900 mb-2">AI Answer</h4>
                  <div className="prose max-w-none">
                    <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                      {message.answer}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {messages.length === 0 && !isLoading && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MessageCircle className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Ask Your First Question</h3>
            <p className="text-gray-600 text-center mb-4">
              Get intelligent insights from your reports and content. Ask about market trends, investment themes, or specific companies.
            </p>
            <div className="text-sm text-gray-500 space-y-1">
              <p>Example questions:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>"What are the main risks in emerging markets?"</li>
                <li>"Summarize recent developments in renewable energy"</li>
                <li>"Which sectors show the most growth potential?"</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}