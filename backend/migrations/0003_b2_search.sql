-- Full-text search (GET /api/search). 'simple' config: no stemming, so names and
-- codes match literally and as-you-type prefix queries (word:*) work.
-- Expressions must match backend/src/services/search.service.js exactly.
CREATE INDEX IF NOT EXISTS idx_fts_tasks ON tasks
  USING GIN (to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(description, '')));
CREATE INDEX IF NOT EXISTS idx_fts_projects ON projects
  USING GIN (to_tsvector('simple', coalesce(name, '') || ' ' || coalesce(description, '') || ' ' || coalesce(client_name, '')));
CREATE INDEX IF NOT EXISTS idx_fts_documents ON documents
  USING GIN (to_tsvector('simple', regexp_replace(coalesce(original_name, ''), '[^[:alnum:]]+', ' ', 'g')));
CREATE INDEX IF NOT EXISTS idx_fts_announcements ON announcements
  USING GIN (to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(content, '')));
CREATE INDEX IF NOT EXISTS idx_fts_users ON users
  USING GIN (to_tsvector('simple', coalesce(full_name, '') || ' ' || coalesce(designation, '') || ' ' || coalesce(department, '')));
CREATE INDEX IF NOT EXISTS idx_fts_messages ON messages
  USING GIN (to_tsvector('simple', content));
