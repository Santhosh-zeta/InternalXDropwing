const { body, param, validationResult } = require('express-validator');

/**
 * Collects express-validator results and rejects the request before it reaches
 * a controller. Without this the chains below would run and be ignored.
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();

  return res.status(400).json({
    success: false,
    message: 'Validation failed',
    errors: errors.array().map(e => ({ field: e.path, message: e.msg })),
  });
};

/**
 * Password rule, shared by register and reset so the two can never drift apart
 * and leave a weaker way in.
 */
const passwordRule = field =>
  body(field)
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters');

const registerRules = [
  body('email').isEmail().withMessage('A valid email address is required').normalizeEmail(),
  body('fullName').trim().notEmpty().withMessage('Full name is required')
    .isLength({ max: 255 }).withMessage('Full name is too long'),
  passwordRule('password'),
  validate,
];

const loginRules = [
  body('email').isEmail().withMessage('A valid email address is required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
  validate,
];

const emailOnlyRules = [
  body('email').isEmail().withMessage('A valid email address is required').normalizeEmail(),
  validate,
];

const verifyOtpRules = [
  body('email').isEmail().withMessage('A valid email address is required').normalizeEmail(),
  body('otp').trim().isLength({ min: 4, max: 8 }).withMessage('Invalid OTP'),
  validate,
];

const resetPasswordRules = [
  body('token').trim().notEmpty().withMessage('Reset token is required'),
  passwordRule('newPassword'),
  validate,
];

/* ───────────────────────────────────────────────────────────────────────────
 * Shared helpers for the rest of the API.
 *
 * Two different flavours of "optional" are used deliberately below, because
 * picking the wrong one changes behaviour for existing clients:
 *
 *   optional({ values: 'null' })   — skip when the field is absent or null.
 *     Used for fields a controller writes through as-is, where '' is a real
 *     value the user chose (a cleared description, for instance).
 *
 *   optional({ values: 'falsy' })  — also skip '' and 0.
 *     Used for dates and foreign keys, because the clients send '' for "not
 *     set" and every controller already normalises that with `x || null`.
 *     Rejecting '' here would break forms that submit empty date inputs.
 *
 * Required booleans use .exists() rather than .notEmpty(), since `false` is a
 * legitimate value that notEmpty() would reject.
 * ─────────────────────────────────────────────────────────────────────────── */

/** Every `:id` in a path is a SERIAL primary key. Anything else is a probe. */
const idParam = (name = 'id') =>
  param(name).isInt({ min: 1 }).withMessage('Invalid id');

/** Optional foreign key: absent, null or '' all mean "not set". */
const optionalFk = (field) =>
  body(field).optional({ values: 'falsy' }).isInt({ min: 1 })
    .withMessage(`${field} must be a valid id`);

/** Optional free text with an upper bound, so a column can never be overrun. */
const optionalText = (field, max) =>
  body(field).optional({ values: 'null' }).isString().withMessage(`${field} must be text`)
    .isLength({ max }).withMessage(`${field} must be ${max} characters or fewer`);

const optionalDate = (field) =>
  body(field).optional({ values: 'falsy' }).isISO8601()
    .withMessage(`${field} must be a valid date`);

const optionalEnum = (field, values) =>
  body(field).optional({ values: 'falsy' }).isIn(values)
    .withMessage(`${field} must be one of: ${values.join(', ')}`);

/**
 * A JSON object, not an array and not null — `permissions`,
 * `notification_preferences` and friends are all stringified straight into a
 * JSONB column, and an array there quietly produces a shape the readers cannot
 * parse.
 */
const optionalPlainObject = (field) =>
  body(field).optional({ values: 'null' }).custom(v =>
    typeof v === 'object' && v !== null && !Array.isArray(v)
  ).withMessage(`${field} must be an object`);

const TASK_STATUS = ['pending', 'in-progress', 'completed'];
const TASK_PRIORITY = ['low', 'medium', 'high', 'urgent'];
const PROJECT_STATUS = ['planning', 'active', 'completed', 'on-hold'];
const MILESTONE_STATUS = ['pending', 'completed'];
const RESOURCE_TYPE = ['link', 'video', 'doc', 'pdf'];

/** Access levels 1–9 exist in access_levels; access_level is a foreign key to it. */
const ACCESS_LEVEL_MIN = 1;
const ACCESS_LEVEL_MAX = 9;

/* ─── TASKS ───────────────────────────────────────────────────────────────── */

/**
 * `assigned_to` is read by the controller as either a single id or an array of
 * ids, so both shapes have to pass — but every element still has to be a
 * positive integer, because they are interpolated into task_assignees rows.
 */
const assigneeRule = (required) => {
  const chain = required
    ? body('assigned_to').exists().withMessage('Assignee is required')
    : body('assigned_to').optional({ values: 'null' });

  return chain.custom(value => {
    const list = Array.isArray(value) ? value : [value];
    if (list.length === 0) throw new Error('At least one assignee is required');
    for (const id of list) {
      if (id === null || id === undefined || id === '') continue;
      if (!Number.isInteger(Number(id)) || Number(id) < 1) {
        throw new Error('Each assignee must be a valid user id');
      }
    }
    return true;
  });
};

const createTaskRules = [
  body('title').trim().notEmpty().withMessage('Title is required')
    .isLength({ max: 255 }).withMessage('Title must be 255 characters or fewer'),
  optionalText('description', 10000),
  assigneeRule(true),
  optionalDate('due_date'),
  optionalEnum('priority', TASK_PRIORITY),
  optionalFk('project_id'),
  optionalFk('parent_task_id'),
  optionalFk('venture_id'),
  validate,
];

const updateTaskRules = [
  idParam(),
  body('title').optional({ values: 'falsy' }).trim().isLength({ min: 1, max: 255 })
    .withMessage('Title must be between 1 and 255 characters'),
  optionalText('description', 10000),
  optionalEnum('status', TASK_STATUS),
  optionalEnum('priority', TASK_PRIORITY),
  optionalDate('due_date'),
  optionalFk('project_id'),
  optionalFk('parent_task_id'),
  assigneeRule(false),
  validate,
];

const taskIdRules = [idParam(), validate];

/* ─── PROJECTS ────────────────────────────────────────────────────────────── */

/**
 * `members` and `milestones` are expanded into bulk INSERT rows, so a
 * malformed element does not fail validation — it fails halfway through a
 * transaction, or writes a row of nulls.
 */
const membersRule = body('members').optional({ values: 'null' }).isArray()
  .withMessage('members must be an array')
  .bail()
  .custom(list => {
    for (const m of list) {
      if (!m || typeof m !== 'object') throw new Error('Each member must be an object');
      if (!Number.isInteger(Number(m.user_id)) || Number(m.user_id) < 1) {
        throw new Error('Each member needs a valid user_id');
      }
      if (m.role !== undefined && m.role !== null && String(m.role).length > 50) {
        throw new Error('Member role is too long');
      }
    }
    return true;
  });

const milestonesRule = body('milestones').optional({ values: 'null' }).isArray()
  .withMessage('milestones must be an array')
  .bail()
  .custom(list => {
    for (const m of list) {
      if (!m || typeof m !== 'object') throw new Error('Each milestone must be an object');
      if (!m.title || String(m.title).trim() === '') throw new Error('Each milestone needs a title');
      if (String(m.title).length > 255) throw new Error('Milestone title is too long');
      if (m.status !== undefined && m.status !== null && m.status !== '' &&
          !MILESTONE_STATUS.includes(m.status)) {
        throw new Error(`Milestone status must be one of: ${MILESTONE_STATUS.join(', ')}`);
      }
    }
    return true;
  });

const tagsRule = body('tags').optional({ values: 'null' }).isArray()
  .withMessage('tags must be an array');

const projectBodyRules = [
  optionalText('description', 20000),
  optionalEnum('status', PROJECT_STATUS),
  optionalEnum('priority', TASK_PRIORITY),
  optionalText('category', 100),
  // budget is DECIMAL(15,2); a non-numeric value would otherwise reach the
  // driver and surface as a 500.
  body('budget').optional({ values: 'null' }).isFloat({ min: 0 })
    .withMessage('budget must be a positive number'),
  optionalFk('venture_id'),
  optionalDate('start_date'),
  optionalDate('end_date'),
  optionalText('client_name', 255),
  body('client_email').optional({ values: 'falsy' }).isEmail()
    .withMessage('client_email must be a valid email address'),
  membersRule,
  milestonesRule,
  tagsRule,
];

const createProjectRules = [
  body('name').trim().notEmpty().withMessage('Project name is required')
    .isLength({ max: 255 }).withMessage('Project name must be 255 characters or fewer'),
  ...projectBodyRules,
  validate,
];

const updateProjectRules = [
  idParam(),
  body('name').optional({ values: 'falsy' }).trim().isLength({ min: 1, max: 255 })
    .withMessage('Project name must be between 1 and 255 characters'),
  ...projectBodyRules,
  validate,
];

const projectIdRules = [idParam(), validate];

/* ─── TIMESHEETS ──────────────────────────────────────────────────────────── */

const logHoursRules = [
  // hours_worked is DECIMAL(5,2): an upper bound of 24 keeps a day's entry
  // sane and keeps the value inside the column's precision.
  body('hours').isFloat({ gt: 0, max: 24 })
    .withMessage('hours must be a number greater than 0 and no more than 24'),
  body('activityDate').isISO8601().withMessage('activityDate must be a valid date'),
  optionalFk('taskId'),
  optionalFk('projectId'),
  optionalFk('ventureId'),
  optionalText('notes', 5000),
  validate,
];

const approveTimesheetRules = [
  idParam(),
  body('status').isIn(['approved', 'rejected'])
    .withMessage('status must be either approved or rejected'),
  validate,
];

/* ─── DOCUMENTS ───────────────────────────────────────────────────────────── */

/**
 * Runs after multer, so req.body is populated from the multipart fields. The
 * file itself is validated by middleware/upload.middleware.js.
 */
const uploadDocumentRules = [
  optionalFk('ventureId'),
  optionalFk('projectId'),
  validate,
];

const documentIdRules = [idParam(), validate];

/* ─── INVOICES ────────────────────────────────────────────────────────────── */

/**
 * Invoice ids are synthesised, not stored: "INV-<ventureId>-<YYYY>-<MM>". The
 * controller splits on "-" and parseInt()s the pieces, so pinning the shape
 * here stops a malformed id producing NaN comparisons in the authorisation
 * check further down.
 */
const invoiceIdRules = [
  param('id').matches(/^INV-\d+-\d{4}-\d{2}$/)
    .withMessage('Invalid invoice id format'),
  validate,
];

/* ─── USERS (team-members) ────────────────────────────────────────────────── */

const createUserRules = [
  body('full_name').trim().notEmpty().withMessage('Full name is required')
    .isLength({ max: 100 }).withMessage('Full name must be 100 characters or fewer'),
  body('email').isEmail().withMessage('A valid email address is required')
    .isLength({ max: 150 }).withMessage('Email is too long').normalizeEmail(),
  passwordRule('password'),
  body('access_level').isInt({ min: ACCESS_LEVEL_MIN, max: ACCESS_LEVEL_MAX })
    .withMessage('access_level must be between 1 and 9'),
  optionalFk('venture_id'),
  optionalText('department', 100),
  optionalText('designation', 100),
  validate,
];

const updateUserRules = [
  idParam(),
  body('access_level').optional({ values: 'null' })
    .isInt({ min: ACCESS_LEVEL_MIN, max: ACCESS_LEVEL_MAX })
    .withMessage('access_level must be between 1 and 9'),
  // venture_id is the one foreign key where 0 is meaningful — the controller
  // maps it to NULL to unassign a user — so it cannot use optionalFk().
  body('venture_id').optional({ values: 'null' }).isInt({ min: 0 })
    .withMessage('venture_id must be a valid id'),
  body('is_active').optional({ values: 'null' }).isBoolean()
    .withMessage('is_active must be true or false'),
  body('full_name').optional({ values: 'falsy' }).trim().isLength({ min: 1, max: 100 })
    .withMessage('Full name must be between 1 and 100 characters'),
  optionalText('department', 100),
  optionalText('designation', 100),
  optionalText('phone', 20),
  validate,
];

const userIdRules = [idParam(), validate];

const updateProfileRules = [
  body('full_name').optional({ values: 'falsy' }).trim().isLength({ min: 1, max: 100 })
    .withMessage('Full name must be between 1 and 100 characters'),
  optionalText('phone', 20),
  optionalPlainObject('notification_preferences'),
  validate,
];

const changePasswordRules = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  passwordRule('newPassword'),
  validate,
];

/* ─── ROLE MANAGEMENT ─────────────────────────────────────────────────────── */

const roleBodyRules = [
  optionalText('description', 5000),
  // color goes into VARCHAR(7) and is rendered as a CSS value in the clients.
  body('color').optional({ values: 'falsy' }).isHexColor()
    .withMessage('color must be a hex colour such as #6366f1')
    .isLength({ max: 7 }).withMessage('color must be 7 characters or fewer'),
  optionalText('icon', 10),
  body('base_level').optional({ values: 'null' })
    .isInt({ min: ACCESS_LEVEL_MIN, max: ACCESS_LEVEL_MAX })
    .withMessage('base_level must be between 1 and 9'),
  optionalPlainObject('permissions'),
  body('sort_order').optional({ values: 'null' }).isInt({ min: 0, max: 100000 })
    .withMessage('sort_order must be a non-negative integer'),
];

const createRoleRules = [
  body('role_name').trim().notEmpty().withMessage('role_name is required')
    .isLength({ max: 100 }).withMessage('role_name must be 100 characters or fewer'),
  body('role_key').trim().notEmpty().withMessage('role_key is required')
    .isLength({ max: 60 }).withMessage('role_key must be 60 characters or fewer'),
  optionalFk('venture_id'),
  ...roleBodyRules,
  validate,
];

const updateRoleRules = [
  idParam(),
  body('role_name').optional({ values: 'falsy' }).trim().isLength({ min: 1, max: 100 })
    .withMessage('role_name must be between 1 and 100 characters'),
  body('role_key').optional({ values: 'falsy' }).trim().isLength({ min: 1, max: 60 })
    .withMessage('role_key must be between 1 and 60 characters'),
  ...roleBodyRules,
  validate,
];

const roleIdRules = [idParam(), validate];

const roleAssignmentRules = [
  body('user_id').isInt({ min: 1 }).withMessage('user_id must be a valid user id'),
  body('role_id').isInt({ min: 1 }).withMessage('role_id must be a valid role id'),
  validate,
];

/* ─── ACCESS CONTROL ──────────────────────────────────────────────────────── */

const twoFactorConfigRules = [
  body('enable2FA').exists().withMessage('enable2FA is required')
    .isBoolean().withMessage('enable2FA must be true or false'),
  validate,
];

const updateAccessLevelRules = [
  param('level').isInt({ min: ACCESS_LEVEL_MIN, max: ACCESS_LEVEL_MAX })
    .withMessage('level must be between 1 and 9'),
  body('permissions').custom(v =>
    typeof v === 'object' && v !== null && !Array.isArray(v)
  ).withMessage('permissions must be an object'),
  validate,
];

/* ─── LEARNING HUB ────────────────────────────────────────────────────────── */

const createChecklistItemRules = [
  body('title').trim().notEmpty().withMessage('Title is required')
    .isLength({ max: 255 }).withMessage('Title must be 255 characters or fewer'),
  optionalText('description', 5000),
  optionalText('category', 100),
  body('sort_order').optional({ values: 'null' }).isInt({ min: 0, max: 100000 })
    .withMessage('sort_order must be a non-negative integer'),
  body('due_days').optional({ values: 'null' }).isInt({ min: 0, max: 3650 })
    .withMessage('due_days must be a non-negative integer'),
  validate,
];

const progressRules = [
  param('checklistItemId').isInt({ min: 1 }).withMessage('Invalid checklist item id'),
  body('completed').exists().withMessage('completed is required')
    .isBoolean().withMessage('completed must be true or false'),
  validate,
];

const createResourceRules = [
  body('title').trim().notEmpty().withMessage('Title is required')
    .isLength({ max: 255 }).withMessage('Title must be 255 characters or fewer'),
  // Resource URLs are rendered as links in the clients. Restricting the
  // protocol keeps javascript: and data: out of an href other staff will click.
  body('url').trim().notEmpty().withMessage('URL is required')
    .isLength({ max: 500 }).withMessage('URL must be 500 characters or fewer')
    .isURL({ protocols: ['http', 'https'], require_protocol: true })
    .withMessage('URL must be a valid http(s) address'),
  optionalText('description', 5000),
  optionalText('category', 100),
  optionalEnum('resource_type', RESOURCE_TYPE),
  validate,
];

const createFeedbackRules = [
  body('intern_id').isInt({ min: 1 }).withMessage('intern_id must be a valid user id'),
  body('note').trim().notEmpty().withMessage('note is required')
    .isLength({ max: 10000 }).withMessage('note must be 10000 characters or fewer'),
  // rating is a SMALLINT rendered as stars.
  body('rating').optional({ values: 'null' }).isInt({ min: 1, max: 5 })
    .withMessage('rating must be between 1 and 5'),
  optionalText('week_label', 50),
  validate,
];

const learningIdRules = [idParam(), validate];

module.exports = {
  validate,

  // auth
  registerRules,
  loginRules,
  emailOnlyRules,
  verifyOtpRules,
  resetPasswordRules,

  // tasks
  createTaskRules,
  updateTaskRules,
  taskIdRules,

  // projects
  createProjectRules,
  updateProjectRules,
  projectIdRules,

  // timesheets
  logHoursRules,
  approveTimesheetRules,

  // documents
  uploadDocumentRules,
  documentIdRules,

  // invoices
  invoiceIdRules,

  // users
  createUserRules,
  updateUserRules,
  userIdRules,
  updateProfileRules,
  changePasswordRules,

  // role management
  createRoleRules,
  updateRoleRules,
  roleIdRules,
  roleAssignmentRules,

  // access control
  twoFactorConfigRules,
  updateAccessLevelRules,

  // learning
  createChecklistItemRules,
  progressRules,
  createResourceRules,
  createFeedbackRules,
  learningIdRules,
};
