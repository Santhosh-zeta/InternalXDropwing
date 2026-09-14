import '../../features/auth/data/models/auth_models.dart';
import 'access_level.dart';

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
      exact ? userLevel == level : AccessLevel.satisfies(userLevel, level);
}

class Rbac {
  const Rbac._();

  /// Permissions marked `AccessLevel.client` are open to every signed-in user
  /// — the backend gates those routes with `authenticate` only.
  static const Map<Permission, _Rule> _rules = {
    // Tasks
    Permission.viewTasks: _Rule.atOrAbove(AccessLevel.client),
    Permission.createTask: _Rule.atOrAbove(AccessLevel.staff), // requireLevel(7)
    Permission.updateTask: _Rule.atOrAbove(AccessLevel.staff), // requireLevel(7)
    Permission.deleteTask: _Rule.atOrAbove(AccessLevel.manager), // requireLevel(5)

    // Projects
    Permission.viewProjects: _Rule.atOrAbove(AccessLevel.client),
    Permission.createProject: _Rule.atOrAbove(AccessLevel.cxo), // requireLevel(4)
    Permission.updateProject: _Rule.atOrAbove(AccessLevel.cxo), // requireLevel(4)
    Permission.deleteProject: _Rule.atOrAbove(AccessLevel.admin), // requireLevel(3)

    // People
    Permission.viewUsers: _Rule.atOrAbove(AccessLevel.manager),
    Permission.createUser: _Rule.atOrAbove(AccessLevel.admin), // requireLevel(3)
    Permission.updateUser: _Rule.atOrAbove(AccessLevel.cxo), // requireLevel(4)
    Permission.deleteUser: _Rule.atOrAbove(AccessLevel.admin), // requireLevel(3)

    // Roles
    Permission.viewRoles: _Rule.atOrAbove(AccessLevel.cxo),
    Permission.manageRoles: _Rule.atOrAbove(AccessLevel.cxo),

    // Platform administration
    Permission.viewAccessControl: _Rule.atOrAbove(AccessLevel.superAdmin),
    Permission.manageAccessControl: _Rule.atOrAbove(AccessLevel.superAdmin),
    Permission.databaseConsole: _Rule.atOrAbove(AccessLevel.superAdmin),
    Permission.viewAudit: _Rule.atOrAbove(AccessLevel.superAdmin),

    // Finance
    Permission.viewBudget: _Rule.atOrAbove(AccessLevel.cxo),
    Permission.viewBudgetAllVentures:
        _Rule.atOrAbove(AccessLevel.managingDirector),
    Permission.viewInvoices: _Rule.atOrAbove(AccessLevel.manager),
    Permission.manageInvoices: _Rule.atOrAbove(AccessLevel.cxo),

    // Operations
    Permission.viewApprovals: _Rule.atOrAbove(AccessLevel.manager),
    Permission.actOnApprovals: _Rule.atOrAbove(AccessLevel.manager),
    Permission.viewReports: _Rule.atOrAbove(AccessLevel.manager),
    Permission.viewKpis: _Rule.atOrAbove(AccessLevel.manager),
    Permission.viewStrategy: _Rule.atOrAbove(AccessLevel.manager),
    Permission.viewTeam: _Rule.atOrAbove(AccessLevel.executiveStaff),
    Permission.manageTeam: _Rule.atOrAbove(AccessLevel.cxo),

    // Everyday
    Permission.viewLearning: _Rule.atOrAbove(AccessLevel.client),
    Permission.manageLearning: _Rule.atOrAbove(AccessLevel.manager), // <= 5
    Permission.viewDocuments: _Rule.atOrAbove(AccessLevel.client),
    Permission.manageDocuments: _Rule.atOrAbove(AccessLevel.staff),
    Permission.viewChat: _Rule.atOrAbove(AccessLevel.intern),
    Permission.viewTimesheets: _Rule.atOrAbove(AccessLevel.intern),
    Permission.viewCalendar: _Rule.atOrAbove(AccessLevel.client),

    Permission.clientPortal: _Rule.exactly(AccessLevel.client),
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
      _rules[permission]?.level ?? AccessLevel.superAdmin;

  static bool isExact(Permission permission) =>
      _rules[permission]?.exact ?? false;

  /// Human-readable requirement, e.g. "Manager and above" or "Clients only".
  static String requirementLabel(Permission permission) {
    final rule = _rules[permission];
    if (rule == null) return 'Restricted';
    final name = AccessLevel.nameOf(rule.level);
    if (rule.exact) return '$name accounts only';
    if (rule.level == AccessLevel.client) return 'All signed-in staff';
    return '$name and above';
  }

  // ── Venture scoping ──────────────────────────────────────────────────────

  /// Levels 1-2 see every venture; everyone else is scoped to their own.
  /// Mirrors `isGlobal = accessLevel <= 2` in budget.routes.js.
  static bool seesAllVentures(User? user) =>
      user != null &&
      AccessLevel.satisfies(user.accessLevel, AccessLevel.managingDirector);

  /// Whether [user] may look at data belonging to [ventureId].
  static bool canSeeVenture(User? user, int? ventureId) {
    if (user == null) return false;
    if (seesAllVentures(user)) return true;
    if (ventureId == null) return true; // group-wide record
    return user.venture?.id == ventureId;
  }
}
