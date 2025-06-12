import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { Login } from "@/components/login";
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

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/invoice/:id" component={InvoiceDetail} />
      <Route path="/leads/:id" component={LeadDetail} />
      <Route path="/client/:id" component={ClientDetail} />
      <Route path="/ai-analytics" component={AIAnalytics} />
      <Route path="/ai-tools/unified-prospect-fund-matcher" component={UnifiedProspectFundMatcher} />
      <Route path="/ai-tools/ai-qna" component={AIQnA} />
      <Route path="/ai-tools/one-pager" component={OnePager} />
      <Route path="/ai-tools/campaign-suggestions" component={CampaignSuggestions} />
      <Route path="/ai-tools/call-preparation" component={CallPreparation} />
      <Route path="/about" component={About} />
      <Route component={NotFound} />
    </Switch>
  );
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
