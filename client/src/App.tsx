import { Switch, Route } from "wouter";
import { Suspense, lazy } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { ErrorBoundary, DashboardErrorBoundary, AIContentErrorBoundary } from "@/components/error-boundary";
import { PageLoadingFallback } from "@/components/loading-fallback";
import { ThemeProvider } from "@/components/theme-provider";
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";

// Lazy load heavy components to reduce initial bundle size
const InvoiceDetail = lazy(() => import("@/pages/invoice-detail"));
const LeadDetail = lazy(() => import("@/pages/lead-detail"));
const ClientDetail = lazy(() => import("@/pages/client-detail"));
const AIAnalytics = lazy(() => import("@/pages/ai-analytics").then(module => ({ default: module.AIAnalytics })));
const About = lazy(() => import("@/pages/about"));
const NotFound = lazy(() => import("@/pages/not-found"));
const UnifiedProspectFundMatcher = lazy(() => import("@/pages/ai-tools/unified-prospect-fund-matcher"));
const AIQnA = lazy(() => import("@/pages/ai-tools/ai-qna"));
const OnePager = lazy(() => import("@/pages/ai-tools/one-pager"));
const CampaignSuggestions = lazy(() => import("@/pages/ai-tools/campaign-suggestions"));
const CallPreparation = lazy(() => import("@/pages/ai-tools/call-preparation"));

function AuthenticatedRoutes() {
  return (
    <Switch>
      <Route path="/" component={() => (
        <DashboardErrorBoundary>
          <Dashboard />
        </DashboardErrorBoundary>
      )} />
      <Route path="/invoice/:id" component={() => (
        <ErrorBoundary title="Invoice Error" description="Failed to load invoice details.">
          <Suspense fallback={<PageLoadingFallback />}>
            <InvoiceDetail />
          </Suspense>
        </ErrorBoundary>
      )} />
      <Route path="/leads/:id" component={() => (
        <ErrorBoundary title="Lead Error" description="Failed to load lead details.">
          <Suspense fallback={<PageLoadingFallback />}>
            <LeadDetail />
          </Suspense>
        </ErrorBoundary>
      )} />
      <Route path="/client/:id" component={() => (
        <ErrorBoundary title="Client Error" description="Failed to load client details.">
          <Suspense fallback={<PageLoadingFallback />}>
            <ClientDetail />
          </Suspense>
        </ErrorBoundary>
      )} />
      <Route path="/ai-analytics" component={() => (
        <AIContentErrorBoundary>
          <Suspense fallback={<PageLoadingFallback />}>
            <AIAnalytics />
          </Suspense>
        </AIContentErrorBoundary>
      )} />
      <Route path="/ai-tools/unified-prospect-fund-matcher" component={() => (
        <AIContentErrorBoundary>
          <Suspense fallback={<PageLoadingFallback />}>
            <UnifiedProspectFundMatcher />
          </Suspense>
        </AIContentErrorBoundary>
      )} />
      <Route path="/ai-tools/ai-qna" component={() => (
        <AIContentErrorBoundary>
          <Suspense fallback={<PageLoadingFallback />}>
            <AIQnA />
          </Suspense>
        </AIContentErrorBoundary>
      )} />
      <Route path="/ai-tools/one-pager" component={() => (
        <AIContentErrorBoundary>
          <Suspense fallback={<PageLoadingFallback />}>
            <OnePager />
          </Suspense>
        </AIContentErrorBoundary>
      )} />
      <Route path="/ai-tools/campaign-suggestions" component={() => (
        <AIContentErrorBoundary>
          <Suspense fallback={<PageLoadingFallback />}>
            <CampaignSuggestions />
          </Suspense>
        </AIContentErrorBoundary>
      )} />
      <Route path="/ai-tools/call-preparation" component={() => (
        <AIContentErrorBoundary>
          <Suspense fallback={<PageLoadingFallback />}>
            <CallPreparation />
          </Suspense>
        </AIContentErrorBoundary>
      )} />
      <Route path="/about" component={() => (
        <Suspense fallback={<PageLoadingFallback />}>
          <About />
        </Suspense>
      )} />
      <Route component={NotFound} />
    </Switch>
  );
}

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return isAuthenticated ? <AuthenticatedRoutes /> : <Login />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
