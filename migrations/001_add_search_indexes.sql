-- Add full-text search capabilities to content reports
-- Task #19-20: Add tsvector full-text search index and GIN index with triggers

-- Add tsvector column for full-text search
ALTER TABLE content_reports ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Create GIN index for fast full-text search
CREATE INDEX IF NOT EXISTS idx_content_reports_search 
ON content_reports USING GIN(search_vector);

-- Create function to update search vector
CREATE OR REPLACE FUNCTION update_content_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector := 
        setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.summary, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(NEW.full_content, '')), 'C') ||
        setweight(to_tsvector('english', array_to_string(NEW.tags, ' ')), 'D');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update search vector
DROP TRIGGER IF EXISTS trigger_update_content_search_vector ON content_reports;
CREATE TRIGGER trigger_update_content_search_vector
    BEFORE INSERT OR UPDATE ON content_reports
    FOR EACH ROW
    EXECUTE FUNCTION update_content_search_vector();

-- Update existing records
UPDATE content_reports SET 
    search_vector = 
        setweight(to_tsvector('english', COALESCE(title, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(summary, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(full_content, '')), 'C') ||
        setweight(to_tsvector('english', array_to_string(tags, ' ')), 'D')
WHERE search_vector IS NULL;

-- Add performance indexes for common queries
CREATE INDEX IF NOT EXISTS idx_content_reports_published_date 
ON content_reports(published_date DESC);

CREATE INDEX IF NOT EXISTS idx_content_reports_type_engagement 
ON content_reports(type, engagement_level);

CREATE INDEX IF NOT EXISTS idx_content_reports_tags_gin 
ON content_reports USING GIN(tags);

-- Invoice performance indexes
CREATE INDEX IF NOT EXISTS idx_invoices_payment_status_due_date 
ON invoices(payment_status, due_date);

CREATE INDEX IF NOT EXISTS idx_invoices_client_id_status 
ON invoices(client_id, payment_status);

-- Lead performance indexes
CREATE INDEX IF NOT EXISTS idx_leads_stage_created 
ON leads(stage, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_leads_email_company 
ON leads(email, company);

-- Client engagement indexes
CREATE INDEX IF NOT EXISTS idx_clients_engagement_renewal 
ON clients(engagement_rate, renewal_date);

CREATE INDEX IF NOT EXISTS idx_clients_risk_level 
ON clients(risk_level, subscription_type);

-- AI content indexes for feedback tracking
CREATE INDEX IF NOT EXISTS idx_ai_generated_content_type_created 
ON ai_generated_content(content_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_content_feedback_rating 
ON ai_content_feedback(rating, created_at DESC);

-- Email history performance
CREATE INDEX IF NOT EXISTS idx_email_history_invoice_sent 
ON email_history(invoice_id, sent_at DESC);

CREATE INDEX IF NOT EXISTS idx_lead_email_history_lead_sent 
ON lead_email_history(lead_id, sent_at DESC);

-- Analytics query optimization
CREATE INDEX IF NOT EXISTS idx_client_engagements_date_report 
ON client_engagements(engagement_date DESC, report_id);

-- Compound indexes for dashboard queries
CREATE INDEX IF NOT EXISTS idx_invoices_dashboard_stats 
ON invoices(payment_status, amount, due_date);

-- Task management indexes
CREATE INDEX IF NOT EXISTS idx_tasks_status_priority_due 
ON tasks(status, priority, due_date);

-- Report summary optimization
CREATE INDEX IF NOT EXISTS idx_report_summaries_content_report 
ON report_summaries(content_report_id, created_at DESC);