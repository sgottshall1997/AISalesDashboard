import { useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { ThumbsUp, ThumbsDown, MessageSquare, Send } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface AIFeedbackProps {
  contentId: string;
  contentType: string;
  compact?: boolean;
  className?: string;
}

export function AIFeedback({ 
  contentId, 
  contentType, 
  compact = false, 
  className 
}: AIFeedbackProps) {
  const [feedbackType, setFeedbackType] = useState<'positive' | 'negative' | null>(null);
  const [showTextInput, setShowTextInput] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [submitted, setSubmitted] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const feedbackMutation = useMutation({
    mutationFn: async (data: {
      content_type: string;
      content_id: string;
      rating: boolean;
      comment?: string;
    }) => {
      return await apiRequest("/api/feedback", "POST", data);
    },
    onSuccess: () => {
      setSubmitted(true);
      toast({
        title: "Feedback submitted",
        description: "Thank you for helping us improve our AI recommendations.",
      });
      // Invalidate any relevant queries
      queryClient.invalidateQueries({ queryKey: ["/api/analytics"] });
    },
    onError: (error) => {
      toast({
        title: "Error submitting feedback",
        description: "Please try again later.",
        variant: "destructive",
      });
      console.error("Feedback submission error:", error);
    },
  });

  const handleThumbsClick = (type: 'positive' | 'negative') => {
    if (submitted) return;
    
    setFeedbackType(type);
    
    // For compact mode, submit immediately without text
    if (compact) {
      submitFeedback(type, "");
    } else {
      setShowTextInput(true);
    }
  };

  const submitFeedback = (type: 'positive' | 'negative', comment: string) => {
    feedbackMutation.mutate({
      content_type: contentType,
      content_id: contentId,
      rating: type === 'positive',
      comment: comment.trim() || undefined,
    });
  };

  const handleSubmitText = () => {
    if (feedbackType) {
      submitFeedback(feedbackType, feedbackText);
    }
  };

  if (submitted) {
    return (
      <div className={cn("flex items-center gap-2 text-sm text-green-600", className)}>
        <ThumbsUp className="h-4 w-4" />
        <span>Thank you for your feedback!</span>
      </div>
    );
  }

  if (compact) {
    return (
      <div className={cn("flex items-center gap-1", className)}>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleThumbsClick('positive')}
          disabled={feedbackMutation.isPending}
          className={cn(
            "h-8 w-8 p-0",
            feedbackType === 'positive' && "bg-green-100 text-green-600"
          )}
        >
          <ThumbsUp className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleThumbsClick('negative')}
          disabled={feedbackMutation.isPending}
          className={cn(
            "h-8 w-8 p-0",
            feedbackType === 'negative' && "bg-red-100 text-red-600"
          )}
        >
          <ThumbsDown className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  return (
    <Card className={cn("border-gray-200", className)}>
      <CardContent className="p-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">
              Was this AI response helpful?
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleThumbsClick('positive')}
                disabled={feedbackMutation.isPending}
                className={cn(
                  "flex items-center gap-1",
                  feedbackType === 'positive' && "bg-green-100 text-green-600"
                )}
              >
                <ThumbsUp className="h-4 w-4" />
                Helpful
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleThumbsClick('negative')}
                disabled={feedbackMutation.isPending}
                className={cn(
                  "flex items-center gap-1",
                  feedbackType === 'negative' && "bg-red-100 text-red-600"
                )}
              >
                <ThumbsDown className="h-4 w-4" />
                Not helpful
              </Button>
            </div>
          </div>

          {showTextInput && (
            <div className="space-y-3 pt-2 border-t">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <MessageSquare className="h-4 w-4" />
                <span>Tell us more (optional)</span>
              </div>
              <Textarea
                placeholder="How can we improve this AI response?"
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                className="min-h-[80px] resize-none"
                maxLength={500}
              />
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">
                  {feedbackText.length}/500 characters
                </span>
                <Button
                  size="sm"
                  onClick={handleSubmitText}
                  disabled={feedbackMutation.isPending}
                  className="flex items-center gap-1"
                >
                  <Send className="h-3 w-3" />
                  {feedbackMutation.isPending ? "Submitting..." : "Submit Feedback"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Hook for tracking AI feedback analytics
export function useAIFeedbackStats() {
  return useQuery({
    queryKey: ["/api/analytics/ai-feedback"],
    staleTime: 300000, // 5 minutes
  });
}