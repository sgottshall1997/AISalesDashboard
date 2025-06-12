import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  BarChart3, 
  FileText, 
  TrendingUp, 
  Users, 
  CheckSquare, 
  Menu, 
  User,
  Upload,
  Info,
  Phone,
  Lightbulb,
  Target,
  MessageCircle,
  Building2,
  BarChart,
  FileEdit,
  ChevronDown
} from "lucide-react";
import { useLocation } from "wouter";

interface NavigationDropdownProps {
  activeSection?: string;
  onSectionChange?: (section: string) => void;
}

export default function NavigationDropdown({ activeSection, onSectionChange }: NavigationDropdownProps) {
  const [, setLocation] = useLocation();

  const navigation = [
    { id: "overview", name: "Overview", icon: BarChart3, path: "/" },
    { id: "invoicing", name: "Invoicing Assistant", icon: FileText, path: "/invoicing" },
    { id: "content", name: "Content Distribution", icon: TrendingUp, path: "/content" },
    { id: "pipeline", name: "Lead Pipeline", icon: Users, path: "/pipeline" },
    { id: "followup", name: "Task Tracker", icon: CheckSquare, path: "/tasks" },
    { id: "upload", name: "CSV Upload", icon: Upload, path: "/upload" },
    { id: "about", name: "About", icon: Info, path: "/about" },
  ];

  const aiTools = [
    { id: "call-preparation", name: "Call Preparation", icon: Phone, path: "/ai-tools/call-preparation" },
    { id: "campaign-suggestions", name: "Campaign Ideas", icon: Lightbulb, path: "/ai-tools/campaign-suggestions" },
    { id: "theme-tracker", name: "Theme Tracker", icon: TrendingUp, path: "/ai-tools/theme-tracker" },
    { id: "prospect-fund-matcher", name: "Unified Prospect Matcher", icon: Target, path: "/ai-tools/unified-prospect-fund-matcher" },
    { id: "portfolio-scorer", name: "Portfolio Scorer", icon: BarChart, path: "/ai-tools/portfolio-scorer" },
    { id: "ai-qna", name: "AI Q&A", icon: MessageCircle, path: "/ai-tools/ai-qna" },
    { id: "one-pager", name: "One-Pager Gen", icon: FileEdit, path: "/ai-tools/one-pager" },
  ];

  const handleNavigation = (path: string, id: string) => {
    if (onSectionChange) {
      onSectionChange(id);
    }
    setLocation(path);
  };

  const getCurrentPageName = () => {
    const currentPath = window.location.pathname;
    
    // Check main navigation first
    const mainNavItem = navigation.find(item => item.path === currentPath);
    if (mainNavItem) return mainNavItem.name;
    
    // Check AI tools
    const aiToolItem = aiTools.find(item => item.path === currentPath);
    if (aiToolItem) return aiToolItem.name;
    
    // Default fallback
    return "Dashboard";
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-primary rounded-md flex items-center justify-center">
              <span className="text-white font-bold text-xs">AI</span>
            </div>
            <span className="font-medium">{getCurrentPageName()}</span>
          </div>
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64" align="start">
        <DropdownMenuLabel className="flex items-center">
          <div className="w-6 h-6 bg-primary rounded-md flex items-center justify-center mr-2">
            <span className="text-white font-bold text-xs">AI</span>
          </div>
          Dashboard Navigation
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {/* Main Navigation Items */}
        {navigation.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id || window.location.pathname === item.path;
          
          return (
            <DropdownMenuItem
              key={item.id}
              onClick={() => handleNavigation(item.path, item.id)}
              className={`flex items-center gap-2 cursor-pointer ${
                isActive ? 'bg-primary/10 text-primary' : ''
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{item.name}</span>
            </DropdownMenuItem>
          );
        })}

        <DropdownMenuSeparator />

        {/* AI Tools Submenu */}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            <span>AI Content Tools</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-56">
            {aiTools.map((tool) => {
              const Icon = tool.icon;
              const isActive = activeSection === tool.id || window.location.pathname === tool.path;
              
              return (
                <DropdownMenuItem
                  key={tool.id}
                  onClick={() => handleNavigation(tool.path, tool.id)}
                  className={`flex items-center gap-2 cursor-pointer ${
                    isActive ? 'bg-primary/10 text-primary' : ''
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tool.name}</span>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        <DropdownMenuSeparator />
        
        {/* User Profile Section */}
        <DropdownMenuItem className="flex items-center gap-2 cursor-pointer">
          <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center">
            <User className="h-3 w-3 text-gray-600" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-medium">Sales Manager</span>
            <span className="text-xs text-gray-500">View profile</span>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}