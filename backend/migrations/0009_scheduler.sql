-- Weekly digest + daily alert scheduler (services/scheduler.js).
-- scheduler_runs: one row per completed job occurrence, so a restart or a second
-- instance never sends the same Monday digest / daily alert run twice.
CREATE TABLE IF NOT EXISTS scheduler_runs (
  job VARCHAR(40) NOT NULL,
  run_key VARCHAR(40) NOT NULL,
  ran_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (job, run_key)
);

-- scheduler_alerts: a persistent finding (e.g. a project with an overdue cluster) is
-- announced to a manager once per week, not every day.
CREATE TABLE IF NOT EXISTS scheduler_alerts (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  finding_key VARCHAR(80) NOT NULL,
  sent_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, finding_key)
);
