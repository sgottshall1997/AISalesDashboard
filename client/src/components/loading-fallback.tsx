import { Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";

interface LoadingFallbackProps {
  message?: string;
  className?: string;
}

export function LoadingFallback({ 
  message = "Loading...", 
  className = "" 
}: LoadingFallbackProps) {
  return (
    <Card className={`flex items-center justify-center p-8 ${className}`}>
      <div className="flex flex-col items-center space-y-3">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    </Card>
  );
}

export function PageLoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="flex flex-col items-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading page...</p>
      </div>
    </div>
  );
}

export function ComponentLoadingFallback({ height = "200px" }: { height?: string }) {
  return (
    <div 
      className="flex items-center justify-center rounded-lg border border-dashed"
      style={{ height }}
    >
      <div className="flex items-center space-x-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">Loading component...</span>
      </div>
    </div>
  );
}