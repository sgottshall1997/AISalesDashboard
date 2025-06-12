import { Home, Menu, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLocation } from "wouter";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
}

export function PageHeader({ title, subtitle }: PageHeaderProps) {
  const [, setLocation] = useLocation();

  const navigateTo = (path: string) => {
    setLocation(path);
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
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuItem onClick={() => navigateTo("/")}>
              <Home className="w-4 h-4 mr-2" />
              Dashboard Overview
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigateTo("/ai-analytics")}>
              AI Analytics
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigateTo("/ai-tools/unified-prospect-fund-matcher")}>
              Prospect/Fund Matcher
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigateTo("/about")}>
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