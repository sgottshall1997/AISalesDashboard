import { useState } from "react";
import Sidebar from "@/components/sidebar";
import Overview from "@/components/overview";
import InvoicingAssistant from "@/components/invoicing-assistant";
import { ContentDistribution } from "@/components/dashboard/content-distribution-clean";
import LeadPipeline from "@/components/lead-pipeline";
import TaskTracker from "@/components/task-tracker";
import CsvUpload from "@/components/csv-upload";
import About from "@/pages/about";
import { CallPreparation } from "@/components/ai-tools/call-preparation";
import CampaignSuggestions from "@/pages/ai-tools/campaign-suggestions";
import ThemeTracker from "@/pages/ai-tools/theme-tracker";
import PortfolioScorer from "@/pages/ai-tools/portfolio-scorer";
import AIQnA from "@/pages/ai-tools/ai-qna";
import OnePager from "@/pages/ai-tools/one-pager";
import UnifiedProspectFundMatcher from "@/pages/ai-tools/unified-prospect-fund-matcher";
import { PageHeader } from "@/components/page-header";
import { Bell, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export default function Dashboard() {
  const [activeSection, setActiveSection] = useState("overview");
  const { logout, isLoggingOut } = useAuth();
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      await logout();
      toast({
        title: "Logged out",
        description: "You have been successfully logged out",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to log out",
        variant: "destructive",
      });
    }
  };

  const renderActiveSection = () => {
    switch (activeSection) {
      case "overview":
        return <Overview />;
      case "invoicing":
        return <InvoicingAssistant />;
      case "content":
        return (
          <div className="space-y-6 p-6">
            <ContentDistribution />
          </div>
        );
      case "call-preparation":
        return <CallPreparation />;
      case "campaign-suggestions":
        return <CampaignSuggestions />;
      case "theme-tracker":
        return <ThemeTracker />;
      case "prospect-fund-matcher":
        return <UnifiedProspectFundMatcher />;
      case "portfolio-scorer":
        return <PortfolioScorer />;
      case "ai-qna":
        return <AIQnA />;
      case "one-pager":
        return <OnePager />;
      case "pipeline":
        return <LeadPipeline />;
      case "followup":
        return <TaskTracker />;
      case "upload":
        return <CsvUpload />;
      case "about":
        return <About />;
      default:
        return <Overview />;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar activeSection={activeSection} onSectionChange={setActiveSection} />
      
      {/* Main content */}
      <div className="md:pl-64 flex flex-col flex-1 overflow-hidden">
        <PageHeader 
          title="AI-Powered Sales Dashboard"
          subtitle="Comprehensive sales intelligence and relationship management platform"
        />

        {/* Dashboard Content */}
        <main className="flex-1 relative overflow-y-auto focus:outline-none">
          {renderActiveSection()}
        </main>
      </div>
    </div>
  );
}
