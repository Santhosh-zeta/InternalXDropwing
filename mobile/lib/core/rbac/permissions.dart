import '../../features/auth/data/models/auth_models.dart';
import '../constants/access_levels.dart';

/// What each role may do, mirrored from the backend.
///
/// **This is not a security boundary.** The server is the enforcement point;
/// everything here exists so the UI does not offer an action that is about to
/// come back 403, and so restricted modules explain themselves instead of
/// rendering an error. Never treat a passing [Rbac.can] as authorisation —
/// the request still has to survive the backend check.
///
/// Every rule below is annotated with the backend code it mirrors. When the
/// backend changes, this table changes with it; a drift here shows up as a
/// button that looks enabled and then fails.
enum Permission {
  // ── Tasks — backend/src/routes/task.routes.js ──────────────────────────
  viewTasks,
  createTask,
  updateTask,
  deleteTask,

  // ── Projects — project.routes.js ───────────────────────────────────────
  viewProjects,
  createProject,
  updateProject,
  deleteProject,

  // ── People — user.routes.js ────────────────────────────────────────────
  viewUsers,
  createUser,
  updateUser,
  deleteUser,

  // ── Roles — role_management.routes.js (inline `accessLevel > 4` → 403) ─
  viewRoles,
  manageRoles,

  // ── Platform administration ────────────────────────────────────────────
  viewAccessControl, // access_control.routes.js — requireLevel(1)
  manageAccessControl, // access_control.routes.js — requireLevel(1)
  databaseConsole, // database.routes.js — requireLevel(1)
  viewAudit, // audit.routes.js — requireLevel(1)

  // ── Finance ────────────────────────────────────────────────────────────
  viewBudget, // budget.routes.js — inline `accessLevel > 4` → 403
  viewBudgetAllVentures, // budget.routes.js — `isGlobal = accessLevel <= 2`
  viewInvoices,
  manageInvoices,

  // ── Operations ─────────────────────────────────────────────────────────
  viewApprovals,
  actOnApprovals,
  viewReports,
  viewKpis,
  viewStrategy,
  viewTeam,
  manageTeam,

  // ── Everyday ───────────────────────────────────────────────────────────
  viewLearning,
  manageLearning, // learning.routes.js — `isManager = accessLevel <= 5`
  viewDocuments,
  manageDocuments,
  viewChat,
  viewTimesheets,
  viewCalendar,

  /// client_portal.routes.js refuses anything that is not exactly level 9 —
  /// a Super Admin gets 403 here too. Encoded as equality, not `atOrAbove`.
  clientPortal,
}

/// A rule is either "this level or better" or "exactly this level".
class _Rule {
  const _Rule.atOrAbove(this.level) : exact = false;
  const _Rule.exactly(this.level) : exact = true;

  final int level;
  final bool exact;

  bool test(int userLevel) =>
      exact ? userLevel == level : AccessLevels.satisfies(userLevel, level);
}

class Rbac {
  const Rbac._();

  /// Permissions marked `AccessLevels.client` are open to every signed-in user
  /// — the backend gates those routes with `authenticate` only.
  ///
  /// Where a rule corresponds to an endpoint already described in [ApiAccess],
  /// it reuses that constant rather than restating the number, so each backend
  /// guard has exactly one value in this app.
  static const Map<Permission, _Rule> _rules = {
    // Tasks
    Permission.viewTasks: _Rule.atOrAbove(AccessLevels.client),
    Permission.createTask: _Rule.atOrAbove(ApiAccess.createTask),
    Permission.updateTask: _Rule.atOrAbove(ApiAccess.updateTask),
    Permission.deleteTask: _Rule.atOrAbove(ApiAccess.deleteTask),

    // Projects
    Permission.viewProjects: _Rule.atOrAbove(AccessLevels.client),
    Permission.createProject: _Rule.atOrAbove(ApiAccess.createProject),
    Permission.updateProject: _Rule.atOrAbove(ApiAccess.updateProject),
    Permission.deleteProject: _Rule.atOrAbove(ApiAccess.deleteProject),

    // People
    Permission.viewUsers: _Rule.atOrAbove(AccessLevels.manager),
    Permission.createUser: _Rule.atOrAbove(AccessLevels.admin), // requireLevel(3)
    Permission.updateUser: _Rule.atOrAbove(AccessLevels.cxo), // requireLevel(4)
    Permission.deleteUser: _Rule.atOrAbove(AccessLevels.admin), // requireLevel(3)

    // Roles
    Permission.viewRoles: _Rule.atOrAbove(AccessLevels.cxo),
    Permission.manageRoles: _Rule.atOrAbove(AccessLevels.cxo),

    // Platform administration
    Permission.viewAccessControl: _Rule.atOrAbove(AccessLevels.superAdmin),
    Permission.manageAccessControl: _Rule.atOrAbove(AccessLevels.superAdmin),
    Permission.databaseConsole: _Rule.atOrAbove(AccessLevels.superAdmin),
    Permission.viewAudit: _Rule.atOrAbove(AccessLevels.superAdmin),

    // Finance
    Permission.viewBudget: _Rule.atOrAbove(AccessLevels.cxo),
    Permission.viewBudgetAllVentures:
        _Rule.atOrAbove(AccessLevels.managingDirector),
    Permission.viewInvoices: _Rule.atOrAbove(AccessLevels.manager),
    Permission.manageInvoices: _Rule.atOrAbove(AccessLevels.cxo),

    // Operations
    Permission.viewApprovals: _Rule.atOrAbove(AccessLevels.manager),
    Permission.actOnApprovals: _Rule.atOrAbove(ApiAccess.approveTimesheet),
    Permission.viewReports: _Rule.atOrAbove(AccessLevels.manager),
    Permission.viewKpis: _Rule.atOrAbove(AccessLevels.manager),
    Permission.viewStrategy: _Rule.atOrAbove(AccessLevels.manager),
    Permission.viewTeam: _Rule.atOrAbove(AccessLevels.executiveStaff),
    Permission.manageTeam: _Rule.atOrAbove(AccessLevels.cxo),

    // Everyday
    Permission.viewLearning: _Rule.atOrAbove(AccessLevels.client),
    Permission.manageLearning: _Rule.atOrAbove(AccessLevels.manager), // <= 5
    Permission.viewDocuments: _Rule.atOrAbove(AccessLevels.client),
    Permission.manageDocuments: _Rule.atOrAbove(AccessLevels.staff),
    Permission.viewChat: _Rule.atOrAbove(AccessLevels.intern),
    Permission.viewTimesheets: _Rule.atOrAbove(AccessLevels.intern),
    Permission.viewCalendar: _Rule.atOrAbove(AccessLevels.client),

    Permission.clientPortal: _Rule.exactly(AccessLevels.client),
  };

  /// Signed-out users can do nothing.
  static bool can(User? user, Permission permission) =>
      user != null && canAtLevel(user.accessLevel, permission);

  static bool canAtLevel(int? level, Permission permission) {
    if (level == null) return false;
    final rule = _rules[permission];
    // An unmapped permission denies rather than allows: a new enum value that
    // someone forgot to add here should hide a button, not expose one.
    if (rule == null) return false;
    return rule.test(level);
  }

  /// The minimum level that satisfies [permission] — for "Managers and above"
  /// copy in restricted-state screens.
  static int requiredLevel(Permission permission) =>
      _rules[permission]?.level ?? AccessLevels.superAdmin;

  static bool isExact(Permission permission) =>
      _rules[permission]?.exact ?? false;

  /// Human-readable requirement, e.g. "Manager and above" or "Clients only".
  static String requirementLabel(Permission permission) {
    final rule = _rules[permission];
    if (rule == null) return 'Restricted';
    final name = AccessLevels.nameOf(rule.level);
    if (rule.exact) return '$name accounts only';
    if (rule.level == AccessLevels.client) return 'All signed-in staff';
    return '$name and above';
  }

  // ── Venture scoping ──────────────────────────────────────────────────────

  /// Levels 1-2 see every venture; everyone else is scoped to their own.
  /// Mirrors `isGlobal = accessLevel <= 2` in budget.routes.js.
  static bool seesAllVentures(User? user) =>
      user != null &&
      AccessLevels.satisfies(user.accessLevel, AccessLevels.managingDirector);

  /// Whether [user] may look at data belonging to [ventureId].
  static bool canSeeVenture(User? user, int? ventureId) {
    if (user == null) return false;
    if (seesAllVentures(user)) return true;
    if (ventureId == null) return true; // group-wide record
    return user.venture?.id == ventureId;
  }
}
