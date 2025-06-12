import React, { createContext, useContext, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface DropdownContextType {
  isOpen: boolean;
  toggle: () => void;
  close: () => void;
}

const DropdownContext = createContext<DropdownContextType | null>(null);

function useDropdownContext() {
  const context = useContext(DropdownContext);
  if (!context) {
    throw new Error("Dropdown components must be used within a Dropdown");
  }
  return context;
}

interface DropdownProps {
  children: React.ReactNode;
  className?: string;
}

function DropdownRoot({ children, className }: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);

  const toggle = () => setIsOpen(!isOpen);
  const close = () => setIsOpen(false);

  const value = { isOpen, toggle, close };

  return (
    <DropdownContext.Provider value={value}>
      <div className={cn("relative", className)}>
        {children}
      </div>
    </DropdownContext.Provider>
  );
}

interface DropdownTriggerProps {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "outline" | "ghost";
}

function DropdownTrigger({ children, className, variant = "outline" }: DropdownTriggerProps) {
  const { isOpen, toggle } = useDropdownContext();

  return (
    <Button
      variant={variant}
      onClick={toggle}
      className={cn("flex items-center gap-2", className)}
    >
      {children}
      <ChevronDown 
        className={cn(
          "h-4 w-4 transition-transform duration-200",
          isOpen && "rotate-180"
        )} 
      />
    </Button>
  );
}

interface DropdownContentProps {
  children: React.ReactNode;
  className?: string;
  align?: "left" | "right";
}

function DropdownContent({ children, className, align = "left" }: DropdownContentProps) {
  const { isOpen } = useDropdownContext();

  if (!isOpen) return null;

  return (
    <Card 
      className={cn(
        "absolute top-full mt-1 z-50 min-w-48 p-1",
        align === "right" ? "right-0" : "left-0",
        className
      )}
    >
      {children}
    </Card>
  );
}

interface DropdownItemProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
}

function DropdownItem({ children, onClick, className, disabled = false }: DropdownItemProps) {
  const { close } = useDropdownContext();

  const handleClick = () => {
    if (!disabled) {
      onClick?.();
      close();
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className={cn(
        "w-full text-left px-3 py-2 text-sm rounded-md transition-colors",
        "hover:bg-accent hover:text-accent-foreground",
        "focus:bg-accent focus:text-accent-foreground focus:outline-none",
        disabled && "opacity-50 cursor-not-allowed hover:bg-transparent",
        className
      )}
    >
      {children}
    </button>
  );
}

function DropdownSeparator({ className }: { className?: string }) {
  return <div className={cn("h-px bg-border my-1", className)} />;
}

// Compound component export
export const Dropdown = Object.assign(DropdownRoot, {
  Trigger: DropdownTrigger,
  Content: DropdownContent,
  Item: DropdownItem,
  Separator: DropdownSeparator,
});