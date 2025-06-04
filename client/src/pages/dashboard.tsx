import { useState } from "react";
import Sidebar from "@/components/sidebar";
import Overview from "@/components/overview";
import InvoicingAssistant from "@/components/invoicing-assistant";
import ContentDistribution from "@/components/content-distribution";
import LeadPipeline from "@/components/lead-pipeline";
import FollowUpGenerator from "@/components/follow-up-generator";
import CsvUpload from "@/components/csv-upload";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Dashboard() {
  const [activeSection, setActiveSection] = useState("overview");

  const renderActiveSection = () => {
    switch (activeSection) {
      case "overview":
        return <Overview />;
      case "invoicing":
        return <InvoicingAssistant />;
      case "content":
        return <ContentDistribution />;
      case "pipeline":
        return <LeadPipeline />;
      case "followup":
        return <FollowUpGenerator />;
      case "upload":
        return <CsvUpload />;
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
            <div className="ml-4 flex items-center md:ml-6">
              <Button variant="ghost" size="icon" className="text-gray-400 hover:text-gray-500">
                <Bell className="h-5 w-5" />
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
