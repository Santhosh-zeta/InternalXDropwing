/// The nine access levels, and the one rule everybody gets wrong about them.
///
/// **Lower number means MORE access.** Level 1 is the Super Admin; level 9 is
/// an external Client. Every comparison in this file is therefore `<=`, and a
/// check written as `accessLevel >= 4` is backwards — that bug shipped in the
/// previous version of this app, where tiles labelled "Managing Director and
/// above" were gated on `>= 4` and so were visible to interns and hidden from
/// the Managing Director.
///
/// This mirrors `backend/src/middleware/auth.middleware.js`:
///
/// ```js
/// if (levels.includes(userLevel) || levels.some(l => userLevel <= l)) next();
/// ```
library;

class AccessLevel {
  const AccessLevel._();

  static const int superAdmin = 1;
  static const int managingDirector = 2;
  static const int admin = 3;
  static const int cxo = 4;
  static const int manager = 5;
  static const int executiveStaff = 6;
  static const int staff = 7;
  static const int intern = 8;
  static const int client = 9;

  static const int highest = superAdmin;
  static const int lowest = client;

  static const Map<int, String> names = {
    superAdmin: 'Super Admin',
    managingDirector: 'Managing Director',
    admin: 'Admin',
    cxo: 'CXO',
    manager: 'Manager',
    executiveStaff: 'Executive Staff',
    staff: 'Staff',
    intern: 'Intern',
    client: 'Client',
  };

  static String nameOf(int level) => names[level] ?? 'Level $level';

  /// True when [level] is at or above [required].
  ///
  /// Read it as "a level-3 Admin satisfies a requirement of level 5", which is
  /// true precisely because 3 <= 5.
  static bool satisfies(int level, int required) => level <= required;

  /// Everyone from [required] upward, most-privileged first. Used to render
  /// "who can do this" in the access-control screen.
  static List<int> atOrAbove(int required) =>
      [for (var l = highest; l <= required; l++) l];
}
