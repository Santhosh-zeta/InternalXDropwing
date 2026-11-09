-- Seed Script for PostgreSQL Migration

-- 1. Ventures
INSERT INTO ventures (id, name, slug, primary_color, description) VALUES
(1, 'Dropwing Design Studio', 'dropwing', '#8B5CF6', 'Creative design studio specializing in brand identity and UI/UX'),
(2, 'Fenixa Solutions', 'fenixa', '#06B6D4', 'Software development and SaaS solutions'),
(3, 'PerSyniX', 'persynix', '#F59E0B', 'AI & ML solutions platform'),
(4, 'Grovia', 'grovia', '#10B981', 'Marketing and growth solutions')
ON CONFLICT (id) DO NOTHING;

-- Reset sequence for ventures
SELECT setval('ventures_id_seq', (SELECT MAX(id) FROM ventures));

-- 2. Access Levels
INSERT INTO access_levels (level_number, level_name, description) VALUES
(1, 'Super Admin', 'Full system access — all ventures, all data, all settings'),
(2, 'Managing Director', 'Strategic oversight across all ventures'),
(3, 'Admin', 'Administrative access to assigned venture'),
(4, 'CXO', 'C-level executive with cross-departmental visibility'),
(5, 'Manager', 'Team management and reporting access'),
(6, 'Executive Staff', 'Senior staff with expanded task access'),
(7, 'Staff', 'Standard employee access'),
(8, 'Intern', 'Limited access for internship period'),
(9, 'Client', 'External client portal access')
ON CONFLICT (level_number) DO NOTHING;

-- 3. Users
-- Intentionally NO user rows are seeded here: a seeded account with a known
-- password in a public repo is a standing backdoor. The first Super Admin is
-- created on first boot by backend/src/services/bootstrap.js from the
-- BOOTSTRAP_ADMIN_EMAIL / BOOTSTRAP_ADMIN_PASSWORD env vars, or at any time with
-- `npm run create-admin` in backend/.

-- 4. Initial Strategy OKRs
INSERT INTO okrs (venture_id, objective, progress, color) VALUES
(1, 'Establish Global Brand Presence', 40, '#8B5CF6'),
(2, 'Accelerate Enterprise AI Adoption', 35, '#06B6D4'),
(3, 'Optimize Supply Chain Analytics', 50, '#F59E0B'),
(4, 'Expand Grovia Market Reach', 45, '#10B981');

-- Reset sequence for okrs
SELECT setval('okrs_id_seq', (SELECT MAX(id) FROM okrs));

INSERT INTO key_results (okr_id, text, is_done) VALUES
(1, 'Deploy new core engine', TRUE),
(1, 'Acquire 10 enterprise clients', FALSE),
(2, 'Deploy new core engine', TRUE),
(2, 'Acquire 10 enterprise clients', FALSE);

-- 5. Announcements
INSERT INTO announcements (title, content, type) VALUES
('Q3 Townhall Meeting Scheduled', 'Please join us next Friday at 2 PM for the quarterly townhall. Calendar invites have been sent out.', 'update'),
('Submit Timesheets', 'Don''t forget to submit your weekly timesheets by Friday 5 PM.', 'reminder');

