import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Send, User, Bot, ThumbsUp, ThumbsDown, Copy, FileText } from "lucide-react";
import { ExportActions } from "./export-actions";
import { useClipboard } from "@/hooks/useClipboard";
import { useToast } from "@/hooks/use-toast";
import { saveToLibrary } from "./content-library";

interface QAMessage {
  id: string;
  type: "user" | "ai";
  content: string;
  timestamp: Date;
  sources?: string[];
  feedback?: "thumbs_up" | "thumbs_down";
}

interface QAChatProps {
  reports?: any[];
  onSubmitQuestion?: (question: string) => Promise<string>;
  className?: string;
}

export function QAChat({ reports = [], onSubmitQuestion, className = "" }: QAChatProps) {
  const [messages, setMessages] = useState<QAMessage[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { copyToClipboard } = useClipboard();
  const { toast } = useToast();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmitQuestion = async () => {
    if (!currentQuestion.trim() || isLoading) return;

    const userMessage: QAMessage = {
      id: `user-${Date.now()}`,
      type: "user",
      content: currentQuestion,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setCurrentQuestion("");
    setIsLoading(true);

    try {
      const response = await onSubmitQuestion?.(currentQuestion) || "I apologize, but I'm unable to process your question at the moment.";
      
      // Clean AI artifacts and format response
      const cleanedResponse = cleanAndFormatAIResponse(response);
      
      const aiMessage: QAMessage = {
        id: `ai-${Date.now()}`,
        type: "ai",
        content: cleanedResponse,
        timestamp: new Date(),
        sources: extractSources(reports),
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error("Error getting AI response:", error);
      const errorMessage: QAMessage = {
        id: `ai-${Date.now()}`,
        type: "ai",
        content: "I encountered an error while processing your question. Please try again.",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFeedback = async (messageId: string, feedback: "thumbs_up" | "thumbs_down") => {
    setMessages(prev => prev.map(msg => 
      msg.id === messageId ? { ...msg, feedback } : msg
    ));

    // Submit feedback to backend
    try {
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "qa_response",
          rating: feedback,
          context: { messageId, timestamp: new Date().toISOString() }
        }),
      });
    } catch (error) {
      console.error("Failed to submit feedback:", error);
    }
  };

  const handleCopyMessage = async (content: string) => {
    const success = await copyToClipboard(content);
    if (success) {
      toast({
        title: "Copied to clipboard",
        description: "Message content has been copied",
      });
    }
  };

  const handleSaveConversation = () => {
    const conversationText = messages.map(msg => 
      `${msg.type === "user" ? "User" : "AI"}: ${msg.content}`
    ).join("\n\n");
    
    saveToLibrary(
      `Q&A Session - ${new Date().toLocaleDateString()}`,
      "qa",
      conversationText,
      ["qa", "conversation"]
    );
    
    toast({
      title: "Conversation saved",
      description: "Q&A session has been saved to your content library",
    });
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Q&A Assistant
          </div>
          {messages.length > 0 && (
            <Button variant="outline" size="sm" onClick={handleSaveConversation}>
              <FileText className="h-4 w-4 mr-2" />
              Save Session
            </Button>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <ScrollArea className="h-96 p-4 border rounded-lg" ref={scrollRef}>
          {messages.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Ask a question about your reports to get started
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message, index) => (
                <div key={message.id} className={`flex gap-3 ${message.type === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`flex gap-3 max-w-[80%] ${message.type === "user" ? "flex-row-reverse" : "flex-row"}`}>
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                      message.type === "user" ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-600"
                    }`}>
                      {message.type === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                    </div>
                    
                    <div className={`rounded-lg p-3 ${
                      message.type === "user" 
                        ? "bg-blue-500 text-white" 
                        : "bg-gray-100 text-gray-900"
                    }`}>
                      <div className="text-sm font-medium mb-1">
                        {message.type === "user" ? "User:" : "AI:"}
                      </div>
                      
                      <div className="whitespace-pre-wrap text-sm">
                        {formatMessageContent(message.content)}
                      </div>
                      
                      {message.sources && message.sources.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-gray-300">
                          <div className="text-xs font-medium mb-1">Sources:</div>
                          <div className="flex flex-wrap gap-1">
                            {message.sources.map((source, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs">
                                {source}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {message.type === "ai" && (
                        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-300">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleFeedback(message.id, "thumbs_up")}
                            className={`h-6 px-2 ${message.feedback === "thumbs_up" ? "bg-green-100" : ""}`}
                          >
                            <ThumbsUp className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleFeedback(message.id, "thumbs_down")}
                            className={`h-6 px-2 ${message.feedback === "thumbs_down" ? "bg-red-100" : ""}`}
                          >
                            <ThumbsDown className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCopyMessage(message.content)}
                            className="h-6 px-2"
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              
              {isLoading && (
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div className="bg-gray-100 rounded-lg p-3">
                    <div className="text-sm font-medium mb-1">AI:</div>
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        <div className="flex gap-2">
          <Textarea
            placeholder="Ask a question about your reports..."
            value={currentQuestion}
            onChange={(e) => setCurrentQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmitQuestion();
              }
            }}
            className="min-h-[60px]"
          />
          <Button
            onClick={handleSubmitQuestion}
            disabled={isLoading || !currentQuestion.trim()}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>

        {messages.length > 0 && (
          <>
            <Separator />
            <ExportActions
              content={messages.map(msg => 
                `${msg.type === "user" ? "User" : "AI"}: ${msg.content}`
              ).join("\n\n")}
              elementId="qa-chat-content"
              filename="qa-session.pdf"
              subject="Q&A Session Export"
              className="justify-center"
            />
          </>
        )}
      </CardContent>
    </Card>
  );
}

function cleanAndFormatAIResponse(response: string): string {
  return response
    .replace(/As an AI[^.]*\./gi, '')
    .replace(/I'm an AI[^.]*\./gi, '')
    .replace(/As a language model[^.]*\./gi, '')
    .replace(/I don't have access to[^.]*\./gi, '')
    .replace(/Please note that[^.]*\./gi, '')
    .replace(/\*\*Note:\*\*[^.]*\./gi, '')
    .trim();
}

function formatMessageContent(content: string): string {
  // Convert markdown-style formatting to plain text with better structure
  return content
    .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold markdown
    .replace(/\*(.*?)\*/g, '$1') // Remove italic markdown
    .replace(/^- /gm, '• ') // Convert hyphens to bullet points
    .replace(/^\d+\. /gm, (match) => `${match}`) // Keep numbered lists
    .trim();
}

function extractSources(reports: any[]): string[] {
  if (!reports || reports.length === 0) return [];
  
  return reports
    .slice(0, 3) // Limit to 3 sources
    .map(report => report.title || report.type || "Report")
    .filter(Boolean);
}