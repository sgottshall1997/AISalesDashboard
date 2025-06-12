import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { ErrorBoundary, DashboardErrorBoundary, AIContentErrorBoundary } from "@/components/error-boundary";
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import InvoiceDetail from "@/pages/invoice-detail";
import LeadDetail from "@/pages/lead-detail";
import ClientDetail from "@/pages/client-detail";
import { AIAnalytics } from "@/pages/ai-analytics";
import About from "@/pages/about";
import NotFound from "@/pages/not-found";
import UnifiedProspectFundMatcher from "@/pages/ai-tools/unified-prospect-fund-matcher";
import AIQnA from "@/pages/ai-tools/ai-qna";
import OnePager from "@/pages/ai-tools/one-pager";
import CampaignSuggestions from "@/pages/ai-tools/campaign-suggestions";
import CallPreparation from "@/pages/ai-tools/call-preparation";

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
          <InvoiceDetail />
        </ErrorBoundary>
      )} />
      <Route path="/leads/:id" component={() => (
        <ErrorBoundary title="Lead Error" description="Failed to load lead details.">
          <LeadDetail />
        </ErrorBoundary>
      )} />
      <Route path="/client/:id" component={() => (
        <ErrorBoundary title="Client Error" description="Failed to load client details.">
          <ClientDetail />
        </ErrorBoundary>
      )} />
      <Route path="/ai-analytics" component={() => (
        <AIContentErrorBoundary>
          <AIAnalytics />
        </AIContentErrorBoundary>
      )} />
      <Route path="/ai-tools/unified-prospect-fund-matcher" component={() => (
        <AIContentErrorBoundary>
          <UnifiedProspectFundMatcher />
        </AIContentErrorBoundary>
      )} />
      <Route path="/ai-tools/ai-qna" component={() => (
        <AIContentErrorBoundary>
          <AIQnA />
        </AIContentErrorBoundary>
      )} />
      <Route path="/ai-tools/one-pager" component={() => (
        <AIContentErrorBoundary>
          <OnePager />
        </AIContentErrorBoundary>
      )} />
      <Route path="/ai-tools/campaign-suggestions" component={() => (
        <AIContentErrorBoundary>
          <CampaignSuggestions />
        </AIContentErrorBoundary>
      )} />
      <Route path="/ai-tools/call-preparation" component={() => (
        <AIContentErrorBoundary>
          <CallPreparation />
        </AIContentErrorBoundary>
      )} />
      <Route path="/about" component={About} />
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
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
