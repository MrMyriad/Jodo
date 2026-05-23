-- JODO optional Supabase/Postgres RLS template.
-- Apply only after the application sets `app.current_user_id` for every DB request.
-- Prisma server-side authorization remains the source of truth until this is applied.

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.executions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS users_own_rows ON public.users;
CREATE POLICY users_own_rows ON public.users
  USING (id = current_setting('app.current_user_id', true));

DROP POLICY IF EXISTS integrations_own_rows ON public.integrations;
CREATE POLICY integrations_own_rows ON public.integrations
  USING ("userId" = current_setting('app.current_user_id', true))
  WITH CHECK ("userId" = current_setting('app.current_user_id', true));

DROP POLICY IF EXISTS workflows_own_rows ON public.workflows;
CREATE POLICY workflows_own_rows ON public.workflows
  USING ("userId" = current_setting('app.current_user_id', true))
  WITH CHECK ("userId" = current_setting('app.current_user_id', true));

DROP POLICY IF EXISTS executions_own_rows ON public.executions;
CREATE POLICY executions_own_rows ON public.executions
  USING ("userId" = current_setting('app.current_user_id', true))
  WITH CHECK ("userId" = current_setting('app.current_user_id', true));

-- Templates are product-owned read data. Keep writes admin-only in application code.
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS templates_read_all ON public.templates;
CREATE POLICY templates_read_all ON public.templates
  FOR SELECT USING (true);

ALTER TABLE public.gst_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gst_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gst_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gst_invoice_extractions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gst_checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gst_reminder_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gst_review_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gst_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS gst_clients_own_rows ON public.gst_clients;
CREATE POLICY gst_clients_own_rows ON public.gst_clients
  USING ("userId" = current_setting('app.current_user_id', true))
  WITH CHECK ("userId" = current_setting('app.current_user_id', true));

DROP POLICY IF EXISTS gst_periods_own_rows ON public.gst_periods;
CREATE POLICY gst_periods_own_rows ON public.gst_periods
  USING ("userId" = current_setting('app.current_user_id', true))
  WITH CHECK ("userId" = current_setting('app.current_user_id', true));

DROP POLICY IF EXISTS gst_documents_own_rows ON public.gst_documents;
CREATE POLICY gst_documents_own_rows ON public.gst_documents
  USING ("userId" = current_setting('app.current_user_id', true))
  WITH CHECK ("userId" = current_setting('app.current_user_id', true));

DROP POLICY IF EXISTS gst_invoice_extractions_own_rows ON public.gst_invoice_extractions;
CREATE POLICY gst_invoice_extractions_own_rows ON public.gst_invoice_extractions
  USING ("userId" = current_setting('app.current_user_id', true))
  WITH CHECK ("userId" = current_setting('app.current_user_id', true));

DROP POLICY IF EXISTS gst_checklist_items_own_rows ON public.gst_checklist_items;
CREATE POLICY gst_checklist_items_own_rows ON public.gst_checklist_items
  USING ("userId" = current_setting('app.current_user_id', true))
  WITH CHECK ("userId" = current_setting('app.current_user_id', true));

DROP POLICY IF EXISTS gst_reminder_drafts_own_rows ON public.gst_reminder_drafts;
CREATE POLICY gst_reminder_drafts_own_rows ON public.gst_reminder_drafts
  USING ("userId" = current_setting('app.current_user_id', true))
  WITH CHECK ("userId" = current_setting('app.current_user_id', true));

DROP POLICY IF EXISTS gst_review_notes_own_rows ON public.gst_review_notes;
CREATE POLICY gst_review_notes_own_rows ON public.gst_review_notes
  USING ("userId" = current_setting('app.current_user_id', true))
  WITH CHECK ("userId" = current_setting('app.current_user_id', true));

DROP POLICY IF EXISTS gst_audit_logs_own_rows ON public.gst_audit_logs;
CREATE POLICY gst_audit_logs_own_rows ON public.gst_audit_logs
  USING ("userId" = current_setting('app.current_user_id', true))
  WITH CHECK ("userId" = current_setting('app.current_user_id', true));
