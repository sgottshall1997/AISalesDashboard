import type { Request, Response } from "express";
import { storage } from "../storage";
import { generateThemeBasedEmail, generateThemeBasedEmailSuggestions } from "../ai";

export class AIService {
  async generateProspectingInsights(req: Request, res: Response) {
    try {
      const { clientId, reportIds } = req.body;
      
      if (!clientId || !reportIds?.length) {
        return res.status(400).json({ 
          message: "Client ID and report IDs are required" 
        });
      }

      // Get client and reports data
      const client = await storage.getClient(clientId);
      const reports = await Promise.all(
        reportIds.map((id: number) => storage.getContentReport(id))
      );

      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }

      // Generate AI insights
      const suggestions = await generateThemeBasedEmailSuggestions(reports);
      
      res.json({
        client,
        suggestions,
        reports: reports.filter(Boolean)
      });
    } catch (error) {
      console.error("Error generating prospecting insights:", error);
      res.status(500).json({ message: "Failed to generate insights" });
    }
  }

  async generateEmail(req: Request, res: Response) {
    try {
      const { 
        recipientName, 
        recipientCompany, 
        theme, 
        emailAngle, 
        keyPoints, 
        supportingReports 
      } = req.body;

      if (!recipientName || !recipientCompany || !theme) {
        return res.status(400).json({ 
          message: "Recipient name, company, and theme are required" 
        });
      }

      const emailContent = await generateThemeBasedEmail({
        recipientName,
        recipientCompany,
        theme,
        emailAngle,
        keyPoints,
        supportingReports
      });

      // Store the generated content
      await storage.storeGeneratedContent({
        content_type: 'email',
        original_prompt: JSON.stringify(req.body),
        generated_content: emailContent,
        theme_id: theme,
        context_data: {
          theme,
          emailAngle,
          keyPoints,
          supportingReports
        }
      });

      res.json({ 
        emailContent,
        generatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error generating email:", error);
      res.status(500).json({ message: "Failed to generate email" });
    }
  }

  async submitFeedback(req: Request, res: Response) {
    try {
      const { contentId, feedbackType, comment } = req.body;

      if (!contentId || !feedbackType) {
        return res.status(400).json({ 
          message: "Content ID and feedback type are required" 
        });
      }

      // Store AI feedback for improvement
      await storage.storeAIFeedback({
        content_id: contentId,
        feedback_type: feedbackType,
        comment: comment || null,
        submitted_at: new Date()
      });

      res.json({ 
        message: "Feedback submitted successfully",
        contentId 
      });
    } catch (error) {
      console.error("Error submitting AI feedback:", error);
      res.status(500).json({ message: "Failed to submit feedback" });
    }
  }

  async getGeneratedContent(req: Request, res: Response) {
    try {
      const { type, limit = 10 } = req.query;
      
      const content = await storage.getGeneratedContent({
        type: type as string,
        limit: Number(limit)
      });

      res.json(content);
    } catch (error) {
      console.error("Error fetching generated content:", error);
      res.status(500).json({ message: "Failed to fetch content" });
    }
  }

  async regenerateContent(req: Request, res: Response) {
    try {
      const { contentId } = req.params;
      const { modifications } = req.body;

      const originalContent = await storage.getGeneratedContentById(Number(contentId));
      
      if (!originalContent) {
        return res.status(404).json({ message: "Content not found" });
      }

      // Parse original context and apply modifications
      const originalContext = JSON.parse(originalContent.original_prompt);
      const updatedContext = { ...originalContext, ...modifications };

      const regeneratedContent = await generateThemeBasedEmail(updatedContext);

      // Store as new version
      await storage.storeGeneratedContent({
        content_type: originalContent.content_type,
        original_prompt: JSON.stringify(updatedContext),
        generated_content: regeneratedContent,
        theme_id: originalContent.theme_id,
        context_data: updatedContext,
        parent_id: Number(contentId)
      });

      res.json({ 
        regeneratedContent,
        originalId: contentId,
        generatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error regenerating content:", error);
      res.status(500).json({ message: "Failed to regenerate content" });
    }
  }
}