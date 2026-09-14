/// The platform's nine access levels.
///
/// **A lower number means more access.** Level 1 (Super Admin) can do
/// everything; level 9 (Client) the least. This mirrors the `access_levels`
/// table seeded in `deployment/postgres/init/03_seed.sql` and the backend's
/// `requireLevel` guard in `backend/src/middleware/auth.middleware.js`, which
/// admits a request when `userLevel <= requiredLevel`.
///
/// Always compare through [hasAtLeast] rather than writing a bare `>=`/`<=` —
/// the inverted-looking `<=` is the single most common source of backwards
/// permission checks in this codebase.
class AccessLevels {
  const AccessLevels._();

  static const int superAdmin = 1;
  static const int managingDirector = 2;
  static const int admin = 3;
  static const int cxo = 4;
  static const int manager = 5;
  static const int executiveStaff = 6;
  static const int staff = 7;
  static const int intern = 8;
  static const int client = 9;

  /// The level assumed for a user whose level is unknown: the least
  /// privileged one, so an unresolved user is never over-trusted.
  static const int unknown = client;

  /// Every level, most privileged first.
  static const List<int> all = <int>[
    superAdmin,
    managingDirector,
    admin,
    cxo,
    manager,
    executiveStaff,
    staff,
    intern,
    client,
  ];

  /// Whether [userLevel] is at least as privileged as [required].
  ///
  /// Because lower numbers carry more access this is a `<=` test, matching
  /// `requireLevel(required)` on the backend. For example
  /// `hasAtLeast(user.accessLevel, AccessLevels.manager)` is true for levels
  /// 1 through 5.
  static bool hasAtLeast(int userLevel, int required) => userLevel <= required;

  /// Whether [userLevel] is strictly less privileged than [required].
  static bool isBelow(int userLevel, int required) => userLevel > required;

  /// Whether [userLevel] falls inside the inclusive band between the more
  /// privileged [from] and the less privileged [to].
  static bool isBetween(int userLevel, int from, int to) =>
      userLevel >= from && userLevel <= to;

  /// Display name for [level], e.g. `Managing Director`.
  static String nameOf(int level) {
    switch (level) {
      case superAdmin:
        return 'Super Admin';
      case managingDirector:
        return 'Managing Director';
      case admin:
        return 'Admin';
      case cxo:
        return 'CXO';
      case manager:
        return 'Manager';
      case executiveStaff:
        return 'Executive Staff';
      case staff:
        return 'Staff';
      case intern:
        return 'Intern';
      case client:
        return 'Client';
      default:
        return 'Unknown';
    }
  }

  /// Short badge label for [level], e.g. `L5`.
  static String badgeOf(int level) => 'L$level';

  /// The least privileged level. Used as the assumption for an unresolved
  /// user so nobody is ever over-trusted by default.
  static const int lowest = client;

  /// Alias for [hasAtLeast], reading naturally at a call site:
  /// `AccessLevels.satisfies(user.accessLevel, AccessLevels.manager)`.
  static bool satisfies(int userLevel, int required) =>
      hasAtLeast(userLevel, required);

  /// Every level from [required] upward, most privileged first — for
  /// rendering "who can do this" in the access-control screen.
  static List<int> atOrAbove(int required) =>
      [for (var l = superAdmin; l <= required; l++) l];
}

/// The minimum access level each backend endpoint demands.
///
/// These mirror the `requireLevel(...)` guards on the Express routes one for
/// one, so the UI can hide an action instead of letting the user tap it into
/// a 403. Keep them in sync with `backend/src/routes/`.
class ApiAccess {
  const ApiAccess._();

  /// `POST /api/tasks` and `PUT /api/tasks/:id` — `requireLevel(7)`.
  static const int createTask = AccessLevels.staff;

  /// `PUT /api/tasks/:id` — `requireLevel(7)`.
  static const int updateTask = AccessLevels.staff;

  /// `DELETE /api/tasks/:id` — `requireLevel(5)`.
  static const int deleteTask = AccessLevels.manager;

  /// `POST /api/projects` and `PUT /api/projects/:id` — `requireLevel(4)`.
  static const int createProject = AccessLevels.cxo;

  /// `PUT /api/projects/:id` — `requireLevel(4)`.
  static const int updateProject = AccessLevels.cxo;

  /// `DELETE /api/projects/:id` — `requireLevel(3)`.
  static const int deleteProject = AccessLevels.admin;

  /// `POST /api/documents/upload` — authenticated only, no level guard.
  static const int uploadDocument = AccessLevels.client;

  /// `PATCH /api/timesheets/:id/approve` — the controller rejects level 6
  /// and below, so managers (5) and above may decide approvals.
  static const int approveTimesheet = AccessLevels.manager;
}
