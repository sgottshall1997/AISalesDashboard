import { useState, useEffect } from "react";
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

import AIQnA from "@/pages/ai-tools/ai-qna";
import OnePager from "@/pages/ai-tools/one-pager";
import UnifiedProspectFundMatcher from "@/pages/ai-tools/unified-prospect-fund-matcher";
import { Bell, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export default function Dashboard() {
  const [activeSection, setActiveSection] = useState("overview");

  useEffect(() => {
    // Check for section parameter in URL
    const urlParams = new URLSearchParams(window.location.search);
    const section = urlParams.get('section');
    if (section) {
      setActiveSection(section);
    }
  }, []);
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

      case "prospect-fund-matcher":
        return <UnifiedProspectFundMatcher />;

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
        {/* Top header */}
        <div className="relative z-10 flex-shrink-0 flex h-16 bg-white shadow">
          <div className="flex-1 px-4 flex justify-between">
            <div className="flex-1 flex items-center">
              <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
                AI-Powered Sales Dashboard
              </h2>
            </div>
            <div className="ml-4 flex items-center md:ml-6 space-x-2">
              <Button variant="ghost" size="icon" className="text-gray-400 hover:text-gray-500">
                <Bell className="h-5 w-5" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="text-gray-600 hover:text-gray-800"
              >
                <LogOut className="h-4 w-4 mr-2" />
                {isLoggingOut ? "Logging out..." : "Logout"}
              </Button>
            </div>
          </div>
        </div>

        {/* Dashboard Content */}
        <main className="flex-1 relative overflow-y-auto focus:outline-none">
          {renderActiveSection()}
        </main>
      </div>
    </div>
  );
}
