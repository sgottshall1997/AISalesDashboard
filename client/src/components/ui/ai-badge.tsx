import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface AIBadgeProps {
  variant?: "default" | "secondary" | "outline";
  size?: "sm" | "md" | "lg";
  className?: string;
  showIcon?: boolean;
}

export function AIBadge({ 
  variant = "secondary", 
  size = "sm", 
  className,
  showIcon = true 
}: AIBadgeProps) {
  const sizeClasses = {
    sm: "text-xs px-2 py-1",
    md: "text-sm px-3 py-1",
    lg: "text-base px-4 py-2"
  };

  return (
    <Badge 
      variant={variant}
      className={cn(
        "flex items-center gap-1 font-medium",
        sizeClasses[size],
        "bg-gradient-to-r from-purple-100 to-blue-100 text-purple-800 border-purple-200",
        className
      )}
    >
      {showIcon && <Sparkles className="h-3 w-3" />}
      AI Generated
    </Badge>
  );
}

export function AIContentWrapper({ 
  children, 
  className 
}: { 
  children: React.ReactNode; 
  className?: string; 
}) {
  return (
    <div className={cn("relative", className)}>
      <div className="absolute top-2 right-2 z-10">
        <AIBadge />
      </div>
      {children}
    </div>
  );
}