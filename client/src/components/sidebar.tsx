import { BarChart3, DollarSign, FileText, Users, Send, Gauge } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SidebarProps {
  activeSection: string;
  onSectionChange: (section: "overview" | "invoicing" | "content" | "pipeline" | "followup") => void;
  isMobile?: boolean;
}

export default function Sidebar({ activeSection, onSectionChange, isMobile }: SidebarProps) {
  const navigation = [
    { name: "Overview", id: "overview", icon: Gauge },
    { name: "Invoicing Assistant", id: "invoicing", icon: DollarSign },
    { name: "Content Distribution", id: "content", icon: BarChart3 },
    { name: "Lead Pipeline", id: "pipeline", icon: Users },
    { name: "Follow-Up Generator", id: "followup", icon: Send },
  ];

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-white border-r border-gray-200">
      <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
        {!isMobile && (
          <div className="flex items-center flex-shrink-0 px-4 mb-8">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">13D</span>
              </div>
              <div className="ml-3">
                <h1 className="text-lg font-semibold text-gray-900">Research Dashboard</h1>
              </div>
            </div>
          </div>
        )}
        
        {/* Navigation */}
        <nav className="mt-5 flex-1 px-2 space-y-1">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            
            return (
              <Button
                key={item.id}
                variant="ghost"
                className={`w-full justify-start px-2 py-2 text-sm font-medium rounded-md ${
                  isActive 
                    ? "bg-blue-600 text-white hover:bg-blue-700" 
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
                onClick={() => onSectionChange(item.id as any)}
              >
                <Icon className="mr-3 h-4 w-4" />
                {item.name}
              </Button>
            );
          })}
        </nav>
      </div>
      
      <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
        <div className="flex items-center">
          <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
            <Users className="h-4 w-4 text-gray-600" />
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-gray-700">Sales Manager</p>
            <p className="text-xs font-medium text-gray-500">View profile</p>
          </div>
        </div>
      </div>
    </div>
  );
}
