/**
 * Read-only tools the assistant may call. Each one is a thin wrapper over a
 * scoped query in ./queries.js and receives the caller's scope, re-read from
 * the database for every call by the agent (never cached from the request and
 * never built from anything the model says).
 *
 * The model chooses arguments; the arguments are validated here and can only
 * narrow an already scoped result. There is no raw SQL, no write tool, and no
 * tool that takes a venture or user id.
 */
const Q = require('./queries');

const OUTPUT_CHAR_CAP = 12000;
const STR_CAP = 300;

const obj = (properties = {}, required = []) => ({
  type: 'object', properties, required, additionalProperties: false,
});

const LIMIT = { type: 'integer', minimum: 1, maximum: 50, description: 'Max rows to return (default 20).' };

const BASE = [
  {
    name: 'my_tasks',
    label: 'your tasks',
    description: 'Tasks assigned to the signed-in user. Defaults to open (not completed) tasks, overdue first.',
    input_schema: obj({
      status: { type: 'string', enum: ['open', 'pending', 'in-progress', 'completed', 'all'], description: 'Default open.' },
      limit: LIMIT,
    }),
    run: (scope, i) => Q.myTasks(scope, { status: i.status, limit: i.limit }),
  },
  {
    name: 'list_projects',
    label: 'projects',
    description: 'Projects the user can see, with open and overdue task counts. Most overdue first.',
    input_schema: obj({
      status: { type: 'string', enum: Q.PROJECT_STATUSES },
      limit: LIMIT,
    }),
    run: (scope, i) => Q.listProjects(scope, { status: i.status, limit: i.limit }),
  },
  {
    name: 'project_summary',
    label: 'a project summary',
    description: 'Status of one project: task counts, overdue tasks, members, milestones, hours logged (only the hours the user may see). Get the project id from list_projects or search.',
    input_schema: obj({ project_id: { type: 'integer', minimum: 1 } }, ['project_id']),
    run: (scope, i) => Q.projectSummary(scope, { projectId: i.project_id }),
  },
  {
    name: 'overdue_tasks',
    label: 'overdue tasks',
    description: 'Overdue tasks (not completed, due date passed) among everything the user can see, optionally for one project.',
    input_schema: obj({ project_id: { type: 'integer', minimum: 1 }, limit: LIMIT }),
    run: (scope, i) => Q.overdueTasks(scope, { projectId: i.project_id, limit: i.limit }),
  },
  {
    name: 'upcoming_deadlines',
    label: 'upcoming deadlines',
    description: 'Open tasks, project end dates and milestones due in the next N days (default 14, max 90).',
    input_schema: obj({ days: { type: 'integer', minimum: 1, maximum: 90 } }),
    run: (scope, i) => Q.upcomingDeadlines(scope, { days: i.days }),
  },
  {
    name: 'timesheet_summary',
    label: 'timesheet hours',
    description: 'Hours logged in a date range (default last 30 days), grouped by status, project, user or week. Staff see their own hours; managers see their venture.',
    input_schema: obj({
      from: { type: 'string', description: 'YYYY-MM-DD' },
      to: { type: 'string', description: 'YYYY-MM-DD' },
      group_by: { type: 'string', enum: ['status', 'project', 'user', 'week'] },
    }),
    run: (scope, i) => Q.timesheetSummary(scope, { from: i.from, to: i.to, groupBy: i.group_by }),
  },
  {
    name: 'search',
    label: 'a search',
    description: 'Full-text search across tasks, projects, documents, people, announcements and chat messages the user can read. Use it to find ids.',
    input_schema: obj({ query: { type: 'string', minLength: 2, maxLength: 100 } }, ['query']),
    run: (scope, i) => Q.searchTool(scope, { query: i.query }),
  },
  {
    name: 'announcements',
    label: 'announcements',
    description: 'Latest company and venture announcements.',
    input_schema: obj({ limit: { type: 'integer', minimum: 1, maximum: 10 } }),
    run: (scope, i) => Q.listAnnouncements(scope, { limit: i.limit }),
  },
];

const MANAGER = [
  {
    name: 'team_workload',
    label: 'team workload',
    description: 'Open, in-progress and overdue task counts per person in the venture (managers and above).',
    input_schema: obj(),
    run: (scope) => Q.teamWorkload(scope),
  },
];

const FINANCE = [
  {
    name: 'finance_summary',
    label: 'finance figures',
    description: 'Project budgets vs labour cost per venture (levels 1-4). Labour cost counts only hours that have an hourly rate; always mention unrated_hours when it is not zero.',
    input_schema: obj(),
    run: (scope) => Q.financeSummary(scope),
  },
  {
    name: 'project_finance',
    label: 'project finance',
    description: 'Budget vs labour cost for one project (levels 1-4). Always mention unrated_hours when it is not zero.',
    input_schema: obj({ project_id: { type: 'integer', minimum: 1 } }, ['project_id']),
    run: (scope, i) => Q.projectFinance(scope, { projectId: i.project_id }),
  },
];

/** Tools offered to this scope. Clients get none (the feature is off for them). */
const toolsFor = (scope) => {
  if (scope.isClient) return [];
  return [
    ...BASE,
    ...(scope.global || scope.isVentureAdmin ? MANAGER : []),
    ...(scope.level <= 4 ? FINANCE : []),
  ];
};

/** Provider-neutral definitions: name, description, JSON schema. Each provider translates them. */
const toolDefs = (tools) => tools.map((t) => ({
  name: t.name, description: t.description, input_schema: t.input_schema,
}));

const labelFor = (name) => {
  const t = [...BASE, ...MANAGER, ...FINANCE].find((x) => x.name === name);
  return t ? t.label : name;
};

/** Cap strings and total size so one tool result cannot flood the context. */
const shrink = (value) => {
  const walk = (v, depth = 0) => {
    if (typeof v === 'string') return v.length > STR_CAP ? `${v.slice(0, STR_CAP)}…` : v;
    if (Array.isArray(v)) return v.slice(0, 50).map((x) => walk(x, depth + 1));
    if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x, depth + 1)]));
    return v;
  };
  return walk(value);
};

/**
 * Tool output is data, not instructions: it is JSON-encoded (so quotes are
 * escaped), `<` and `>` are escaped so injected text cannot imitate markup, and
 * the whole thing is size capped.
 */
const wrapResult = (data) => {
  const build = (d, truncated) => JSON.stringify({ untrusted_data: true, ...(truncated ? { truncated: true } : {}), data: d });
  let body = shrink(data);
  let text = build(body, false);
  while (text.length > OUTPUT_CHAR_CAP) {
    const arrKey = Object.keys(body).find((k) => Array.isArray(body[k]) && body[k].length > 1);
    if (!arrKey) { text = build({}, true); break; }
    body = { ...body, [arrKey]: body[arrKey].slice(0, Math.ceil(body[arrKey].length / 2)) };
    text = build(body, true);
  }
  return text.replace(/</g, '\\u003c').replace(/>/g, '\\u003e');
};

/** Drop unknown keys and wrong types: only the declared properties reach the query. */
const cleanInput = (tool, raw) => {
  const props = tool.input_schema.properties;
  const out = {};
  const input = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  for (const [key, spec] of Object.entries(props)) {
    const v = input[key];
    if (v === undefined || v === null) continue;
    if (spec.type === 'integer') { if (Number.isInteger(v)) out[key] = v; }
    else if (spec.type === 'string') {
      if (typeof v === 'string' && v.length <= 200 && (!spec.enum || spec.enum.includes(v))) out[key] = v;
    }
  }
  for (const key of tool.input_schema.required) {
    if (out[key] === undefined) throw new Q.ToolError(`Missing or invalid argument: ${key}`);
  }
  return out;
};

module.exports = { toolsFor, toolDefs, labelFor, wrapResult, cleanInput, OUTPUT_CHAR_CAP };
