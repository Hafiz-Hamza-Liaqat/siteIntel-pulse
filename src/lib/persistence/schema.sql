-- SiteIntel Pulse Database Schema
-- Production PostgreSQL / Supabase Schema with Tenant & Row-Level Security (RLS)

-- 1. Scan Requests Table
CREATE TABLE IF NOT EXISTS scan_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID,
    target_url TEXT NOT NULL,
    platform_name TEXT,
    business_category TEXT DEFAULT 'ecommerce',
    target_market TEXT DEFAULT 'US',
    preferred_language TEXT DEFAULT 'en',
    business_goal TEXT,
    target_audience TEXT,
    competitors JSONB DEFAULT '[]'::jsonb,
    max_pages INT DEFAULT 50,
    max_depth INT DEFAULT 3,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Scan Jobs Table
CREATE TABLE IF NOT EXISTS scan_jobs (
    id TEXT PRIMARY KEY,
    tenant_id UUID,
    request_id UUID REFERENCES scan_requests(id) ON DELETE CASCADE,
    target_url TEXT NOT NULL,
    status TEXT NOT NULL, -- queued, validating, discovering, collecting_evidence, assessing, scoring, generating_report, completed, failed, canceled, partially_completed
    current_stage TEXT NOT NULL,
    progress_percentage INT DEFAULT 0,
    discovered_count INT DEFAULT 0,
    tested_count INT DEFAULT 0,
    error_count INT DEFAULT 0,
    coverage JSONB,
    results JSONB DEFAULT '[]'::jsonb,
    report JSONB,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- 3. Page Observations Table (Milestone 2 ready)
CREATE TABLE IF NOT EXISTS page_observations (
    id TEXT PRIMARY KEY,
    scan_id TEXT REFERENCES scan_jobs(id) ON DELETE CASCADE,
    requested_url TEXT NOT NULL,
    final_url TEXT NOT NULL,
    status_code INT NOT NULL,
    response_time_ms INT NOT NULL,
    content_type TEXT NOT NULL,
    title TEXT,
    meta_description TEXT,
    canonical_candidate TEXT,
    headings JSONB,
    links JSONB DEFAULT '[]'::jsonb,
    resources JSONB DEFAULT '[]'::jsonb,
    structured_data JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Evidence Records Table
CREATE TABLE IF NOT EXISTS evidence_records (
    id TEXT PRIMARY KEY,
    scan_id TEXT REFERENCES scan_jobs(id) ON DELETE CASCADE,
    test_id TEXT NOT NULL,
    url TEXT,
    observation_type TEXT NOT NULL,
    measured_value JSONB,
    provenance JSONB NOT NULL,
    redacted_for_owner BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Owner Reports Table
CREATE TABLE IF NOT EXISTS owner_reports (
    id TEXT PRIMARY KEY,
    scan_id TEXT REFERENCES scan_jobs(id) ON DELETE CASCADE,
    report_version TEXT NOT NULL DEFAULT '1.0.0',
    company_name TEXT NOT NULL,
    target_url TEXT NOT NULL,
    overall_score JSONB NOT NULL,
    category_scores JSONB NOT NULL,
    issue_distribution JSONB NOT NULL,
    priority_opportunities JSONB NOT NULL,
    full_report_payload JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Report Artifacts Table (PDFs & Exports)
CREATE TABLE IF NOT EXISTS report_artifacts (
    id TEXT PRIMARY KEY,
    report_id TEXT REFERENCES owner_reports(id) ON DELETE CASCADE,
    scan_id TEXT REFERENCES scan_jobs(id) ON DELETE CASCADE,
    artifact_type TEXT NOT NULL, -- pdf, json, html
    file_url TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    file_size_bytes INT NOT NULL,
    share_token TEXT UNIQUE,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row-Level Security (RLS) Setup
ALTER TABLE scan_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE scan_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE owner_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_artifacts ENABLE ROW LEVEL SECURITY;

-- Tenant Isolation Policies
CREATE POLICY tenant_scan_jobs_policy ON scan_jobs
    USING (tenant_id IS NULL OR tenant_id = auth.uid());

CREATE POLICY tenant_owner_reports_policy ON owner_reports
    USING (scan_id IN (SELECT id FROM scan_jobs WHERE tenant_id IS NULL OR tenant_id = auth.uid()));
