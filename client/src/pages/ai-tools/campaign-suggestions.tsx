import { CampaignSuggestions as CampaignSuggestionsComponent } from "@/components/ai-tools/campaign-suggestions";
import { PageHeader } from "@/components/page-header";

export default function CampaignSuggestions() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <PageHeader 
        title="Campaign Suggestions"
        subtitle="AI-powered email campaign strategies based on content analysis and prospect insights"
      />
      <div className="p-6">
        <CampaignSuggestionsComponent />
      </div>
    </div>
  );
}