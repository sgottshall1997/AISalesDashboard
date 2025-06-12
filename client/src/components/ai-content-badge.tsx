import { Bot, Sparkles, ThumbsUp, ThumbsDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface AIContentBadgeProps {
  type?: "generated" | "suggested" | "analyzed";
  className?: string;
  showFeedback?: boolean;
  contentId?: string;
  onFeedback?: (feedback: {
    type: 'positive' | 'negative';
    contentId?: string;
    comment?: string;
  }) => void;
}

export function AIContentBadge({ 
  type = "generated", 
  className,
  showFeedback = false,
  contentId,
  onFeedback
}: AIContentBadgeProps) {
  const [feedbackGiven, setFeedbackGiven] = useState(false);
  const [showComment, setShowComment] = useState(false);
  const [comment, setComment] = useState("");

  const handleFeedback = (feedbackType: 'positive' | 'negative') => {
    if (feedbackType === 'negative' && !showComment) {
      setShowComment(true);
      return;
    }

    onFeedback?.({
      type: feedbackType,
      contentId,
      comment: comment.trim() || undefined
    });

    setFeedbackGiven(true);
    setShowComment(false);
    setComment("");
  };

  const getBadgeContent = () => {
    switch (type) {
      case "suggested":
        return {
          icon: <Sparkles className="h-3 w-3" />,
          text: "AI Suggested",
          variant: "secondary" as const
        };
      case "analyzed":
        return {
          icon: <Bot className="h-3 w-3" />,
          text: "AI Analyzed", 
          variant: "outline" as const
        };
      default:
        return {
          icon: <Bot className="h-3 w-3" />,
          text: "AI Generated",
          variant: "default" as const
        };
    }
  };

  const { icon, text, variant } = getBadgeContent();

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <Badge variant={variant} className="w-fit flex items-center gap-1">
        {icon}
        <span className="text-xs">{text}</span>
      </Badge>
      
      {showFeedback && !feedbackGiven && (
        <Card className="p-3 bg-muted/30">
          <div className="flex flex-col gap-2">
            <p className="text-xs text-muted-foreground">Was this helpful?</p>
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleFeedback('positive')}
                className="h-7 px-2"
              >
                <ThumbsUp className="h-3 w-3" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleFeedback('negative')}
                className="h-7 px-2"
              >
                <ThumbsDown className="h-3 w-3" />
              </Button>
            </div>
            
            {showComment && (
              <div className="space-y-2">
                <Textarea
                  placeholder="Tell us how we can improve..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="text-xs min-h-16"
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleFeedback('negative')}
                    className="h-7 text-xs"
                  >
                    Submit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setShowComment(false);
                      setComment("");
                    }}
                    className="h-7 text-xs"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Card>
      )}
      
      {feedbackGiven && (
        <p className="text-xs text-muted-foreground">Thank you for your feedback!</p>
      )}
    </div>
  );
}

// Wrapper component for AI-generated content sections
interface AIContentWrapperProps {
  children: React.ReactNode;
  type?: "generated" | "suggested" | "analyzed";
  showFeedback?: boolean;
  contentId?: string;
  onFeedback?: (feedback: {
    type: 'positive' | 'negative';
    contentId?: string;
    comment?: string;
  }) => void;
  className?: string;
}

export function AIContentWrapper({
  children,
  type = "generated",
  showFeedback = true,
  contentId,
  onFeedback,
  className
}: AIContentWrapperProps) {
  return (
    <div className={cn("relative", className)}>
      <div className="absolute top-0 right-0 z-10">
        <AIContentBadge
          type={type}
          showFeedback={showFeedback}
          contentId={contentId}
          onFeedback={onFeedback}
        />
      </div>
      <div className="pt-8">
        {children}
      </div>
    </div>
  );
}