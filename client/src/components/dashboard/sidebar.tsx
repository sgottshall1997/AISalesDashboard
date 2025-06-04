import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { 
  LayoutDashboard, 
  FileText, 
  BarChart3, 
  Users, 
  Send, 
  Menu,
  Bell,
  User
} from "lucide-react";

interface SidebarProps {
  className?: string;
}

const navigation = [
  { name: "Overview", href: "/", icon: LayoutDashboard },
  { name: "Invoicing Assistant", href: "/invoicing", icon: FileText },
  { name: "Content Distribution", href: "/content", icon: BarChart3 },
  { name: "Lead Pipeline", href: "/pipeline", icon: Users },
  { name: "Follow-Up Generator", href: "/followup", icon: Send },
];

export function Sidebar({ className }: SidebarProps) {
  const [location] = useLocation();

  const SidebarContent = () => (
    <div className="flex h-full flex-col bg-white border-r border-gray-200">
      <div className="flex items-center flex-shrink-0 px-4 py-5">
        <div className="flex items-center">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">13D</span>
          </div>
          <div className="ml-3">
            <h1 className="text-lg font-semibold text-gray-900">Research Dashboard</h1>
          </div>
        </div>
      </div>

      <nav className="mt-5 flex-1 px-2 space-y-1">
        {navigation.map((item) => {
          const isActive = location === item.href;
          return (
            <Link key={item.name} href={item.href}>
              <a
                className={`${
                  isActive
                    ? "bg-primary text-white"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                } group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors`}
              >
                <item.icon className="mr-3 h-5 w-5" />
                {item.name}
              </a>
            </Link>
          );
        })}
      </nav>

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
      {/* Desktop Sidebar */}
      <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 z-30">
        <SidebarContent />
      </div>

      {/* Mobile Sidebar */}
      <Sheet>
        <SheetTrigger asChild>
          <Button 
            variant="outline" 
            size="sm" 
            className="md:hidden fixed bottom-4 right-4 z-50 rounded-full w-12 h-12 shadow-lg"
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

export function TopHeader() {
  return (
    <div className="md:pl-64 flex flex-col flex-1">
      <div className="relative z-10 flex-shrink-0 flex h-16 bg-white shadow">
        <div className="flex-1 px-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
            AI-Powered Sales Dashboard
          </h2>
          <div className="ml-4 flex items-center md:ml-6">
            <Button variant="ghost" size="sm" className="p-1 rounded-full text-gray-400 hover:text-gray-500">
              <Bell className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
