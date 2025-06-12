import { useState } from "react";
import { Link, useLocation } from "wouter";
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
  ChevronRight,
  BarChart,
  FileEdit,
  LogOut,
  Bell
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [aiToolsExpanded, setAiToolsExpanded] = useState(true);
  const [location] = useLocation();
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

  const navigation = [
    { id: "/", name: "Overview", icon: BarChart3, path: "/" },
    { id: "invoicing", name: "Invoicing Assistant", icon: FileText, path: "/" },
    { id: "content", name: "Content Distribution", icon: TrendingUp, path: "/" },
    { id: "pipeline", name: "Lead Pipeline", icon: Users, path: "/" },
    { id: "followup", name: "Task Tracker", icon: CheckSquare, path: "/" },
    { id: "upload", name: "CSV Upload", icon: Upload, path: "/" },
    { id: "about", name: "About", icon: Info, path: "/about" },
  ];

  const aiTools = [
    { id: "content", name: "Content Summarizer", icon: TrendingUp, path: "/" },
    { id: "call-preparation", name: "Call Preparation", icon: Phone, path: "/ai-tools/call-preparation" },
    { id: "campaign-suggestions", name: "Campaign Ideas", icon: Lightbulb, path: "/ai-tools/campaign-suggestions" },
    { id: "prospect-fund-matcher", name: "Prospect & Fund Matcher", icon: Target, path: "/ai-tools/unified-prospect-fund-matcher" },
    { id: "ai-qna", name: "AI Q&A", icon: MessageCircle, path: "/ai-tools/ai-qna" },
    { id: "one-pager", name: "One-Pager Gen", icon: FileEdit, path: "/ai-tools/one-pager" },
  ];

  const SidebarContent = () => (
    <div className="flex-1 flex flex-col min-h-0 bg-white border-r border-gray-200">
      <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
        <div className="flex items-center flex-shrink-0 px-4 mb-8">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">13D</span>
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
            const isActive = location === item.path;
            
            return (
              <Link key={item.id} href={item.path}>
                <button
                  className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md w-full text-left ${
                    isActive
                      ? "bg-primary text-white"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                  onClick={() => setMobileOpen(false)}
                >
                  <Icon
                    className={`mr-3 flex-shrink-0 h-5 w-5 ${
                      isActive ? "text-white" : "text-gray-400 group-hover:text-gray-500"
                    }`}
                  />
                  {item.name}
                </button>
              </Link>
            );
          })}

          {/* AI Tools Section */}
          <div className="mt-8">
            <button
              onClick={() => setAiToolsExpanded(!aiToolsExpanded)}
              className="group flex items-center px-2 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-md w-full text-left"
            >
              <Brain className="mr-3 flex-shrink-0 h-5 w-5 text-gray-400 group-hover:text-gray-500" />
              AI Tools
              {aiToolsExpanded ? (
                <ChevronDown className="ml-auto h-4 w-4" />
              ) : (
                <ChevronRight className="ml-auto h-4 w-4" />
              )}
            </button>
            
            {aiToolsExpanded && (
              <div className="ml-6 mt-1 space-y-1">
                {aiTools.map((tool) => {
                  const Icon = tool.icon;
                  const isActive = location === tool.path;
                  
                  return (
                    <Link key={tool.id} href={tool.path}>
                      <button
                        className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md w-full text-left ${
                          isActive
                            ? "bg-primary text-white"
                            : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                        }`}
                        onClick={() => setMobileOpen(false)}
                      >
                        <Icon
                          className={`mr-3 flex-shrink-0 h-4 w-4 ${
                            isActive ? "text-white" : "text-gray-400 group-hover:text-gray-500"
                          }`}
                        />
                        {tool.name}
                      </button>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </nav>
      </div>
    </div>
  );

  return (
    <div className="h-screen flex overflow-hidden bg-gray-100">
      {/* Desktop sidebar */}
      <div className="hidden md:flex md:flex-shrink-0">
        <div className="flex flex-col w-64">
          <SidebarContent />
        </div>
      </div>

      {/* Mobile sidebar */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="md:hidden fixed top-4 left-4 z-50"
          >
            <Menu className="h-6 w-6" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-64">
          <SidebarContent />
        </SheetContent>
      </Sheet>

      {/* Main content */}
      <div className="flex flex-col w-0 flex-1 overflow-hidden">
        {/* Header */}
        <div className="relative z-10 flex-shrink-0 flex h-16 bg-white shadow">
          <div className="flex-1 px-4 flex justify-between items-center">
            <div className="flex-1 flex">
              {/* Mobile menu button */}
              <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="md:hidden"
                  >
                    <Menu className="h-6 w-6" />
                  </Button>
                </SheetTrigger>
              </Sheet>
            </div>
            <div className="ml-4 flex items-center md:ml-6 space-x-3">
              <Button variant="ghost" size="sm">
                <Bell className="h-5 w-5" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={handleLogout}
                disabled={isLoggingOut}
              >
                <LogOut className="h-5 w-5" />
                {isLoggingOut ? "Logging out..." : "Logout"}
              </Button>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 relative overflow-y-auto focus:outline-none">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}