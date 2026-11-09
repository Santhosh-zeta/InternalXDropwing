-- Existing databases only (fresh installs no longer create these).
-- Removes the permission-matrix / venture-role tables, which were editable in
-- the UI but never enforced by any route. Access is governed by the numeric
-- level, the user's venture and project membership only. Idempotent.
--   psql -d internalx -f deployment/postgres/migrations/002_drop_unenforced_permissions.sql
DROP TABLE IF EXISTS venture_role_assignments;
DROP TABLE IF EXISTS venture_roles;
ALTER TABLE access_levels DROP COLUMN IF EXISTS permissions;
