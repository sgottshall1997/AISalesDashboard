import { Button } from "@/components/ui/button";
import { Copy, Download, Mail, Share2 } from "lucide-react";
import { usePdfExport } from "@/hooks/usePdfExport";
import { useClipboard } from "@/hooks/useClipboard";
import { useToast } from "@/hooks/use-toast";

interface ExportActionsProps {
  content: string;
  elementId: string;
  filename?: string;
  subject?: string;
  className?: string;
}

export function ExportActions({ 
  content, 
  elementId, 
  filename = "document.pdf",
  subject = "AI Generated Content",
  className = "" 
}: ExportActionsProps) {
  const { exportToPdf, isExporting } = usePdfExport();
  const { copyToClipboard, isCopied } = useClipboard();
  const { toast } = useToast();

  const handleCopyToClipboard = async () => {
    const success = await copyToClipboard(content);
    if (success) {
      toast({
        title: "Copied to clipboard",
        description: "Content has been copied to your clipboard",
      });
    } else {
      toast({
        title: "Copy failed",
        description: "Failed to copy content to clipboard",
        variant: "destructive",
      });
    }
  };

  const handleDownloadPdf = async () => {
    try {
      await exportToPdf(elementId, filename);
      toast({
        title: "PDF downloaded",
        description: "Your document has been downloaded as PDF",
      });
    } catch (error) {
      toast({
        title: "Export failed", 
        description: "Failed to generate PDF",
        variant: "destructive",
      });
    }
  };

  const handleEmailShare = () => {
    const cleanContent = content
      .replace(/As an AI[^.]*\./gi, '')
      .replace(/I'm an AI[^.]*\./gi, '')
      .replace(/As a language model[^.]*\./gi, '')
      .trim();
    
    const mailtoUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(cleanContent)}`;
    window.open(mailtoUrl, '_blank');
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: subject,
          text: content,
        });
      } catch (error) {
        console.log('Share cancelled');
      }
    } else {
      // Fallback to copy to clipboard
      await handleCopyToClipboard();
    }
  };

  return (
    <div className={`flex gap-2 flex-wrap ${className}`}>
      <Button
        variant="outline"
        size="sm"
        onClick={handleCopyToClipboard}
        disabled={isCopied}
      >
        <Copy className="h-4 w-4 mr-2" />
        {isCopied ? "Copied!" : "Copy"}
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={handleDownloadPdf}
        disabled={isExporting}
      >
        <Download className="h-4 w-4 mr-2" />
        {isExporting ? "Generating..." : "Download PDF"}
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={handleEmailShare}
      >
        <Mail className="h-4 w-4 mr-2" />
        Send Email
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={handleShare}
      >
        <Share2 className="h-4 w-4 mr-2" />
        Share
      </Button>
    </div>
  );
}