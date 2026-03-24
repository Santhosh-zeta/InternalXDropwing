CREATE TABLE IF NOT EXISTS marketing_leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_name TEXT NOT NULL,
    project_type TEXT NOT NULL,
    estimated_value NUMERIC DEFAULT 0,
    assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending_approval',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE marketing_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all authenticated users to read and insert marketing_leads"
  ON marketing_leads FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    title TEXT,
    message TEXT NOT NULL,
    type TEXT,
    read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow users to read own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Allow inserts to notifications"
  ON notifications FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow updates to notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);
