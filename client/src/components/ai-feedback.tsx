import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ThumbsUp, ThumbsDown, Edit3, MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface AiFeedbackProps {
  contentId?: number;
  onFeedbackSubmitted?: () => void;
  children: React.ReactNode;
}

export function AiFeedback({ contentId, onFeedbackSubmitted, children }: AiFeedbackProps) {
  const [feedbackType, setFeedbackType] = useState<'rating' | 'edit' | 'suggestion'>('rating');
  const [rating, setRating] = useState<'thumbs_up' | 'thumbs_down' | null>(null);
  const [improvementSuggestion, setImprovementSuggestion] = useState('');
  const [editedVersion, setEditedVersion] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  const handleQuickFeedback = async (feedbackRating: 'thumbs_up' | 'thumbs_down') => {
    if (!contentId) return;

    try {
      setIsSubmitting(true);
      await apiRequest('POST', `/api/ai/content/${contentId}/feedback`, {
        rating: feedbackRating,
        feedback_type: 'rating'
      });

      toast({
        title: "Feedback Submitted",
        description: "Thank you for your feedback!",
      });

      onFeedbackSubmitted?.();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit feedback. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDetailedFeedback = async () => {
    if (!contentId || !rating) return;

    try {
      setIsSubmitting(true);
      await apiRequest('POST', `/api/ai/content/${contentId}/feedback`, {
        rating,
        improvement_suggestion: improvementSuggestion || null,
        edited_version: editedVersion || null,
        feedback_type: feedbackType
      });

      toast({
        title: "Detailed Feedback Submitted",
        description: "Your feedback will help improve AI content generation.",
      });

      setIsDialogOpen(false);
      setRating(null);
      setImprovementSuggestion('');
      setEditedVersion('');
      setFeedbackType('rating');
      onFeedbackSubmitted?.();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit feedback. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!contentId) {
    return <>{children}</>;
  }

  return (
    <div className="space-y-2">
      {children}
      
      {/* Quick Feedback Buttons */}
      <div className="flex items-center gap-2 pt-2 border-t border-gray-200">
        <span className="text-xs text-gray-500">Was this helpful?</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleQuickFeedback('thumbs_up')}
          disabled={isSubmitting}
          className="h-8 px-2"
        >
          <ThumbsUp className="h-3 w-3 text-green-600" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleQuickFeedback('thumbs_down')}
          disabled={isSubmitting}
          className="h-8 px-2"
        >
          <ThumbsDown className="h-3 w-3 text-red-600" />
        </Button>
        
        {/* Detailed Feedback Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 px-2">
              <MessageSquare className="h-3 w-3 text-blue-600" />
              <span className="ml-1 text-xs">Improve</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Provide Detailed Feedback</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {/* Rating */}
              <div>
                <label className="text-sm font-medium">Overall Rating</label>
                <div className="flex gap-2 mt-1">
                  <Button
                    variant={rating === 'thumbs_up' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setRating('thumbs_up')}
                  >
                    <ThumbsUp className="h-4 w-4 mr-1" />
                    Helpful
                  </Button>
                  <Button
                    variant={rating === 'thumbs_down' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setRating('thumbs_down')}
                  >
                    <ThumbsDown className="h-4 w-4 mr-1" />
                    Not Helpful
                  </Button>
                </div>
              </div>

              {/* Feedback Type */}
              <div>
                <label className="text-sm font-medium">Feedback Type</label>
                <div className="flex gap-2 mt-1">
                  <Button
                    variant={feedbackType === 'suggestion' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFeedbackType('suggestion')}
                  >
                    <MessageSquare className="h-4 w-4 mr-1" />
                    Suggestion
                  </Button>
                  <Button
                    variant={feedbackType === 'edit' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFeedbackType('edit')}
                  >
                    <Edit3 className="h-4 w-4 mr-1" />
                    Edit Content
                  </Button>
                </div>
              </div>

              {/* Improvement Suggestion */}
              {feedbackType === 'suggestion' && (
                <div>
                  <label className="text-sm font-medium">How could this be improved?</label>
                  <Textarea
                    value={improvementSuggestion}
                    onChange={(e) => setImprovementSuggestion(e.target.value)}
                    placeholder="Please describe specific improvements..."
                    className="mt-1"
                    rows={3}
                  />
                </div>
              )}

              {/* Edited Version */}
              {feedbackType === 'edit' && (
                <div>
                  <label className="text-sm font-medium">Your edited version:</label>
                  <Textarea
                    value={editedVersion}
                    onChange={(e) => setEditedVersion(e.target.value)}
                    placeholder="Paste your improved version here..."
                    className="mt-1"
                    rows={6}
                  />
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleDetailedFeedback} 
                  disabled={!rating || isSubmitting}
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}