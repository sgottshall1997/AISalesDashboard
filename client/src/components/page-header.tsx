import { Home, Menu, ChevronDown, BarChart3, FileText, TrendingUp, Users, CheckSquare, Upload, Info, Phone, Lightbulb, Target, BarChart, MessageCircle, FileEdit, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { useLocation } from "wouter";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
}

export function PageHeader({ title, subtitle }: PageHeaderProps) {
  const [, setLocation] = useLocation();

  const navigateTo = (path: string) => {
    if (path === "/") {
      setLocation("/");
    } else if (path.startsWith("/ai-tools/") || path.startsWith("/ai-analytics") || path.startsWith("/about")) {
      setLocation(path);
    } else {
      // For dashboard sections, navigate to dashboard with section parameter
      const url = new URL(window.location.href);
      url.searchParams.set('section', path);
      window.history.pushState({}, '', url.toString());
      setLocation("/");
    }
  };

  return (
    <div className="flex items-center justify-between p-4 border-b bg-white dark:bg-gray-900">
      <div className="flex items-center gap-4">
        {/* Navigation Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Menu className="w-4 h-4" />
              <span className="hidden sm:inline">Navigation</span>
              <ChevronDown className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64">
            <DropdownMenuItem onClick={() => navigateTo("/")}>
              <Home className="w-4 h-4 mr-2" />
              Dashboard Overview
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            
            {/* Main Navigation */}
            <DropdownMenuLabel className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              Main Tools
            </DropdownMenuLabel>
            <DropdownMenuItem onClick={() => navigateTo("overview")}>
              <BarChart3 className="w-4 h-4 mr-2" />
              Overview
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigateTo("invoicing")}>
              <FileText className="w-4 h-4 mr-2" />
              Invoicing Assistant
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigateTo("content")}>
              <TrendingUp className="w-4 h-4 mr-2" />
              Content Distribution
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigateTo("pipeline")}>
              <Users className="w-4 h-4 mr-2" />
              Lead Pipeline
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigateTo("followup")}>
              <CheckSquare className="w-4 h-4 mr-2" />
              Task Tracker
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigateTo("upload")}>
              <Upload className="w-4 h-4 mr-2" />
              CSV Upload
            </DropdownMenuItem>
            
            <DropdownMenuSeparator />
            
            {/* AI Tools */}
            <DropdownMenuLabel className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              AI Tools
            </DropdownMenuLabel>
            <DropdownMenuItem onClick={() => navigateTo("/ai-analytics")}>
              <Brain className="w-4 h-4 mr-2" />
              AI Analytics
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigateTo("call-preparation")}>
              <Phone className="w-4 h-4 mr-2" />
              Call Preparation
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigateTo("campaign-suggestions")}>
              <Lightbulb className="w-4 h-4 mr-2" />
              Campaign Ideas
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigateTo("theme-tracker")}>
              <TrendingUp className="w-4 h-4 mr-2" />
              Theme Tracker
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigateTo("/ai-tools/unified-prospect-fund-matcher")}>
              <Target className="w-4 h-4 mr-2" />
              Prospect & Fund Matcher
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigateTo("portfolio-scorer")}>
              <BarChart className="w-4 h-4 mr-2" />
              Portfolio Scorer
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigateTo("ai-qna")}>
              <MessageCircle className="w-4 h-4 mr-2" />
              AI Q&A
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigateTo("one-pager")}>
              <FileEdit className="w-4 h-4 mr-2" />
              One-Pager Gen
            </DropdownMenuItem>
            
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigateTo("/about")}>
              <Info className="w-4 h-4 mr-2" />
              About
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Page Title */}
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
            {title}
          </h1>
          {subtitle && (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Home Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => navigateTo("/")}
        className="gap-2"
      >
        <Home className="w-4 h-4" />
        <span className="hidden sm:inline">Home</span>
      </Button>
    </div>
  );
}