import { CampaignSuggestions as CampaignSuggestionsComponent } from "@/components/ai-tools/campaign-suggestions";
import Layout from "@/components/layout";

export default function CampaignSuggestions() {
  return (
    <Layout>
      <div className="p-6">
        <CampaignSuggestionsComponent />
      </div>
    </Layout>
  );
}