import React from "react";
import { ErrorBoundary as ReactErrorBoundary } from "react-error-boundary";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface ErrorFallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
  title?: string;
  description?: string;
}

function ErrorFallback({ 
  error, 
  resetErrorBoundary, 
  title = "Something went wrong",
  description = "An unexpected error occurred. Please try again or contact support if the problem persists."
}: ErrorFallbackProps) {
  return (
    <Card className="p-6 m-4 border-destructive/20 bg-destructive/5">
      <div className="flex items-start space-x-4">
        <AlertTriangle className="h-6 w-6 text-destructive mt-1 flex-shrink-0" />
        <div className="flex-1 space-y-3">
          <div>
            <h3 className="font-semibold text-destructive">{title}</h3>
            <p className="text-sm text-muted-foreground mt-1">{description}</p>
          </div>
          
          {process.env.NODE_ENV === "development" && (
            <details className="text-xs bg-muted p-3 rounded border">
              <summary className="cursor-pointer font-medium mb-2">Error Details</summary>
              <pre className="whitespace-pre-wrap text-xs overflow-auto">
                {error.message}
                {error.stack && `\n\nStack trace:\n${error.stack}`}
              </pre>
            </details>
          )}
          
          <div className="flex space-x-2">
            <Button 
              onClick={resetErrorBoundary}
              size="sm"
              variant="outline"
              className="flex items-center space-x-2"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Try Again</span>
            </Button>
            <Button 
              onClick={() => window.location.reload()}
              size="sm"
              variant="secondary"
            >
              Reload Page
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<ErrorFallbackProps>;
  title?: string;
  description?: string;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

export function ErrorBoundary({ 
  children, 
  fallback,
  title,
  description,
  onError 
}: ErrorBoundaryProps) {
  const handleError = (error: Error, errorInfo: React.ErrorInfo) => {
    // Log error to console in development
    if (process.env.NODE_ENV === "development") {
      console.error("Error Boundary caught an error:", error, errorInfo);
    }
    
    // Custom error handler (for logging to external services)
    if (onError) {
      onError(error, errorInfo);
    }
    
    // TODO: Log to monitoring service (Sentry, LogRocket, etc.)
    // Example: Sentry.captureException(error, { contexts: { react: errorInfo } });
  };

  const FallbackComponent = fallback || ErrorFallback;

  return (
    <ReactErrorBoundary
      FallbackComponent={(props) => (
        <FallbackComponent {...props} title={title} description={description} />
      )}
      onError={handleError}
    >
      {children}
    </ReactErrorBoundary>
  );
}

// Specialized error boundaries for different sections
export function DashboardErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary
      title="Dashboard Error"
      description="Failed to load dashboard data. Please refresh to try again or contact support if the issue persists."
    >
      {children}
    </ErrorBoundary>
  );
}

export function AIContentErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary
      title="AI Content Error"
      description="Failed to generate or load AI content. Please try regenerating or contact support if the issue continues."
    >
      {children}
    </ErrorBoundary>
  );
}

export function ReportErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary
      title="Report Error"
      description="Failed to load report data. Please refresh or try selecting a different report."
    >
      {children}
    </ErrorBoundary>
  );
}