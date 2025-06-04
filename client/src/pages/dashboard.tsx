import { useState } from "react";
import Sidebar from "@/components/sidebar";
import OverviewSection from "@/components/overview-section";
import InvoicingSection from "@/components/invoicing-section";
import ContentSection from "@/components/content-section";
import PipelineSection from "@/components/pipeline-section";
import FollowupSection from "@/components/followup-section";
import { Bell, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type ActiveSection = "overview" | "invoicing" | "content" | "pipeline" | "followup";

export default function Dashboard() {
  const [activeSection, setActiveSection] = useState<ActiveSection>("overview");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const renderActiveSection = () => {
    switch (activeSection) {
      case "overview":
        return <OverviewSection />;
      case "invoicing":
        return <InvoicingSection />;
      case "content":
        return <ContentSection />;
      case "pipeline":
        return <PipelineSection />;
      case "followup":
        return <FollowupSection />;
      default:
        return <OverviewSection />;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0">
        <Sidebar 
          activeSection={activeSection}
          onSectionChange={setActiveSection}
        />
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black bg-opacity-50 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out md:hidden ${
        mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      }`}>
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">13D</span>
            </div>
            <h1 className="ml-3 text-lg font-semibold text-gray-900">Research Dashboard</h1>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMobileMenuOpen(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
        <Sidebar 
          activeSection={activeSection}
          onSectionChange={(section) => {
            setActiveSection(section);
            setMobileMenuOpen(false);
          }}
          isMobile
        />
      </div>

      {/* Main content */}
      <div className="md:pl-64 flex flex-col flex-1 overflow-hidden">
        {/* Top header */}
        <div className="relative z-10 flex-shrink-0 flex h-16 bg-white shadow">
          <div className="flex-1 px-4 flex justify-between items-center">
            <div className="flex items-center">
              <Button
                variant="ghost"
                size="sm"
                className="md:hidden mr-2"
                onClick={() => setMobileMenuOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </Button>
              <h2 className="text-2xl font-bold leading-7 text-gray-900">
                AI-Powered Sales Dashboard
              </h2>
            </div>
            <div className="flex items-center">
              <Button variant="ghost" size="sm">
                <Bell className="h-5 w-5 text-gray-400" />
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
