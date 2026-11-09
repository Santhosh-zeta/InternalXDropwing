-- D. PostgreSQL Index Script

-- In PostgreSQL, foreign keys do NOT automatically create indexes.
-- It is highly recommended to index foreign keys to improve JOIN performance and cascading deletes.

-- users
CREATE INDEX idx_users_access_level ON users(access_level);
CREATE INDEX idx_users_venture_id ON users(venture_id);

-- sessions
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
-- Every authenticated request looks a session up by token_hash
-- (src/services/session.service.js#isSessionActive) — this is the hottest
-- query in the app and was previously an unindexed sequential scan.
CREATE INDEX idx_sessions_token_hash ON sessions(token_hash);
-- Backs both the "AND expires_at > CURRENT_TIMESTAMP" half of that same
-- lookup and the hourly cleanup sweep's "WHERE expires_at <= CURRENT_TIMESTAMP".
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);


-- projects & members
CREATE INDEX idx_projects_venture_id ON projects(venture_id);
CREATE INDEX idx_projects_created_by ON projects(created_by);
CREATE INDEX idx_project_members_project_id ON project_members(project_id);
CREATE INDEX idx_project_members_user_id ON project_members(user_id);
CREATE INDEX idx_project_milestones_project_id ON project_milestones(project_id);

-- tasks
CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX idx_tasks_assigned_by ON tasks(assigned_by);
CREATE INDEX idx_tasks_venture_id ON tasks(venture_id);
CREATE INDEX idx_tasks_project_id ON tasks(project_id);
CREATE INDEX idx_tasks_parent_task_id ON tasks(parent_task_id);

-- timesheets
CREATE INDEX idx_timesheets_user_id ON timesheets(user_id);
CREATE INDEX idx_timesheets_task_id ON timesheets(task_id);
CREATE INDEX idx_timesheets_project_id ON timesheets(project_id);
CREATE INDEX idx_timesheets_venture_id ON timesheets(venture_id);

-- documents
CREATE INDEX idx_documents_venture_id ON documents(venture_id);
CREATE INDEX idx_documents_project_id ON documents(project_id);
CREATE INDEX idx_documents_uploaded_by ON documents(uploaded_by);

-- messages
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_receiver_id ON messages(receiver_id);
CREATE INDEX idx_messages_venture_id ON messages(venture_id);

-- notifications
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);

-- audit_logs
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);

-- learning hub
CREATE INDEX idx_learning_checklist_venture_id ON learning_checklist_items(venture_id);
CREATE INDEX idx_learning_intern_progress_user_id ON learning_intern_progress(user_id);
CREATE INDEX idx_learning_intern_progress_item_id ON learning_intern_progress(checklist_item_id);
CREATE INDEX idx_learning_resources_added_by ON learning_resources(added_by);
CREATE INDEX idx_learning_resources_venture_id ON learning_resources(venture_id);
CREATE INDEX idx_learning_feedback_manager_id ON learning_feedback(manager_id);
CREATE INDEX idx_learning_feedback_intern_id ON learning_feedback(intern_id);

-- strategy (okrs)
CREATE INDEX idx_okrs_venture_id ON okrs(venture_id);
CREATE INDEX idx_key_results_okr_id ON key_results(okr_id);
CREATE INDEX idx_strategic_risks_venture_id ON strategic_risks(venture_id);

-- announcements
CREATE INDEX idx_announcements_venture_id ON announcements(venture_id);

-- Task assignees: both directions are hot — "tasks for a user" on every
-- dashboard load, "assignees of a task" on every task detail view.
CREATE INDEX IF NOT EXISTS idx_task_assignees_user ON task_assignees(user_id);
CREATE INDEX IF NOT EXISTS idx_task_assignees_task ON task_assignees(task_id);
