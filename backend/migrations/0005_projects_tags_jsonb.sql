-- projects.tags is JSONB in the schema; databases that went through the retired
-- create_missing_tables.js script have it as TEXT. Convert when needed.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = current_schema() AND table_name = 'projects'
               AND column_name = 'tags' AND data_type = 'text') THEN
    ALTER TABLE projects ALTER COLUMN tags DROP DEFAULT;
    ALTER TABLE projects ALTER COLUMN tags TYPE JSONB
      USING (CASE WHEN tags IS NULL OR btrim(tags) = '' THEN NULL ELSE tags::jsonb END);
  END IF;
END $$;
