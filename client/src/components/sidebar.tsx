import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { 
  BarChart3, 
  FileText, 
  TrendingUp, 
  Users, 
  CheckSquare, 
  Menu, 
  X, 
  User,
  Upload,
  Brain,
  Info,
  Phone,
  Lightbulb,
  Target,
  MessageCircle,
  Building2,
  ChevronDown,
  ChevronRight
} from "lucide-react";

interface SidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
}

export default function Sidebar({ activeSection, onSectionChange }: SidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [aiToolsExpanded, setAiToolsExpanded] = useState(true);

  const navigation = [
    { id: "overview", name: "Overview", icon: BarChart3 },
    { id: "invoicing", name: "Invoicing Assistant", icon: FileText },
    { id: "content", name: "Content Distribution", icon: TrendingUp },
    { id: "pipeline", name: "Lead Pipeline", icon: Users },
    { id: "followup", name: "Task Tracker", icon: CheckSquare },
    { id: "upload", name: "CSV Upload", icon: Upload },
    { id: "about", name: "About", icon: Info },
  ];

  const aiTools = [
    { id: "call-preparation", name: "Call Preparation", icon: Phone },
    { id: "campaign-suggestions", name: "Campaign Ideas", icon: Lightbulb },
    { id: "prospect-matchmaker", name: "Prospect Match", icon: Target },
    { id: "ai-qna", name: "AI Q&A", icon: MessageCircle },
    { id: "fund-mapping", name: "Fund Mapping", icon: Building2 },
  ];

  const SidebarContent = () => (
    <div className="flex-1 flex flex-col min-h-0 bg-white border-r border-gray-200">
      <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
        <div className="flex items-center flex-shrink-0 px-4 mb-8">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">AI</span>
            </div>
            <div className="ml-3">
              <h1 className="text-lg font-semibold text-gray-900">Dashboard</h1>
            </div>
          </div>
        </div>
        
        {/* Navigation */}
        <nav className="mt-5 flex-1 px-2 bg-white space-y-1">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => {
                  onSectionChange(item.id);
                  setMobileOpen(false);
                }}
                className={`${
                  isActive
                    ? 'bg-primary text-white'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                } group flex items-center px-2 py-2 text-sm font-medium rounded-md w-full`}
              >
                <Icon className="mr-3 flex-shrink-0 h-5 w-5" />
                {item.name}
              </button>
            );
          })}

          {/* AI Content Tools Section */}
          <div className="mt-6">
            <div className="px-2 py-2">
              <button
                onClick={() => setAiToolsExpanded(!aiToolsExpanded)}
                className="flex items-center justify-between w-full text-xs font-semibold text-gray-400 uppercase tracking-wider hover:text-gray-600"
              >
                <span>AI Content Tools</span>
                {aiToolsExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>
            </div>

            {aiToolsExpanded && (
              <div className="space-y-1">
                {aiTools.map((tool) => {
                  const Icon = tool.icon;
                  const isActive = activeSection === tool.id;
                  
                  return (
                    <button
                      key={tool.id}
                      onClick={() => {
                        onSectionChange(tool.id);
                        setMobileOpen(false);
                      }}
                      className={`${
                        isActive
                          ? 'bg-primary text-white'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      } group flex items-center px-2 py-2 text-sm font-medium rounded-md w-full ml-4`}
                    >
                      <Icon className="mr-3 flex-shrink-0 h-4 w-4" />
                      {tool.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </nav>
      </div>
      
      <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
        <div className="flex items-center">
          <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
            <User className="h-4 w-4 text-gray-600" />
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-gray-700">Sales Manager</p>
            <p className="text-xs font-medium text-gray-500">View profile</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0">
        <SidebarContent />
      </div>

      {/* Mobile sidebar */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="md:hidden fixed bottom-4 right-4 z-50 bg-primary text-white border-primary hover:bg-primary/90"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-64">
          <SidebarContent />
        </SheetContent>
      </Sheet>
    </>
  );
}
