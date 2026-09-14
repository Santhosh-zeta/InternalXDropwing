/// Models for `GET /api/platform-metrics` (mounted from
/// `backend/src/routes/analytics.routes.js`).
///
/// The route answers with `{ success, data: { budgetDistribution, taskVelocity,
/// userDistribution, recentActivity, monthlyPerformance, announcements } }`.
/// Announcements are deliberately not modelled here — they belong to the home
/// overview, not to reporting.
library;

/// Postgres returns `COUNT`/`SUM` aggregates as strings, so every numeric field
/// is coerced defensively.
double _toDouble(dynamic value) {
  if (value is num) return value.toDouble();
  if (value is String) return double.tryParse(value) ?? 0;
  return 0;
}

int _toInt(dynamic value) {
  if (value is int) return value;
  if (value is num) return value.round();
  if (value is String) return int.tryParse(value) ?? 0;
  return 0;
}

/// One venture's total project budget. Only populated for Level 4 and above —
/// the route returns an empty list for anyone less privileged.
class VentureBudgetSlice {
  final String venture;

  /// `#RRGGBB` brand colour of the venture, or null when unset.
  final String? color;
  final double totalBudget;

  const VentureBudgetSlice({
    required this.venture,
    required this.color,
    required this.totalBudget,
  });

  factory VentureBudgetSlice.fromJson(Map<String, dynamic> json) {
    return VentureBudgetSlice(
      venture: json['venture']?.toString() ?? '',
      color: json['color']?.toString(),
      totalBudget: _toDouble(json['total_budget']),
    );
  }
}

/// Tasks completed per day over the last seven days. `name` is the weekday
/// abbreviation the route formats server-side (e.g. `Mon`).
class TaskVelocityPoint {
  final String name;
  final int completed;

  const TaskVelocityPoint({required this.name, required this.completed});

  factory TaskVelocityPoint.fromJson(Map<String, dynamic> json) {
    return TaskVelocityPoint(
      name: json['name']?.toString() ?? '',
      completed: _toInt(json['completed']),
    );
  }
}

/// Active users per venture.
class UserDistributionSlice {
  final String name;
  final int value;
  final String? color;

  const UserDistributionSlice({
    required this.name,
    required this.value,
    required this.color,
  });

  factory UserDistributionSlice.fromJson(Map<String, dynamic> json) {
    return UserDistributionSlice(
      name: json['name']?.toString() ?? '',
      value: _toInt(json['value']),
      color: json['color']?.toString(),
    );
  }
}

/// Completed tasks and projects per month over the last six months.
class MonthlyPerformancePoint {
  final String name;
  final int tasks;
  final int projects;

  const MonthlyPerformancePoint({
    required this.name,
    required this.tasks,
    required this.projects,
  });

  factory MonthlyPerformancePoint.fromJson(Map<String, dynamic> json) {
    return MonthlyPerformancePoint(
      name: json['name']?.toString() ?? '',
      tasks: _toInt(json['tasks']),
      projects: _toInt(json['projects']),
    );
  }
}

/// The ten most recent audit-log entries visible to the caller.
class RecentActivityEntry {
  final String action;
  final String? createdAt;
  final String? userName;

  const RecentActivityEntry({
    required this.action,
    required this.createdAt,
    required this.userName,
  });

  factory RecentActivityEntry.fromJson(Map<String, dynamic> json) {
    return RecentActivityEntry(
      action: json['action']?.toString() ?? '',
      createdAt: json['created_at']?.toString(),
      userName: json['user_name']?.toString(),
    );
  }
}

/// The whole `data` payload of `GET /api/platform-metrics`.
class PlatformMetrics {
  final List<VentureBudgetSlice> budgetDistribution;
  final List<TaskVelocityPoint> taskVelocity;
  final List<UserDistributionSlice> userDistribution;
  final List<MonthlyPerformancePoint> monthlyPerformance;
  final List<RecentActivityEntry> recentActivity;

  const PlatformMetrics({
    required this.budgetDistribution,
    required this.taskVelocity,
    required this.userDistribution,
    required this.monthlyPerformance,
    required this.recentActivity,
  });

  static List<T> _list<T>(
    dynamic raw,
    T Function(Map<String, dynamic>) parse,
  ) {
    if (raw is! List) return <T>[];
    return raw.whereType<Map<String, dynamic>>().map(parse).toList();
  }

  factory PlatformMetrics.fromJson(Map<String, dynamic> json) {
    return PlatformMetrics(
      budgetDistribution:
          _list(json['budgetDistribution'], VentureBudgetSlice.fromJson),
      taskVelocity: _list(json['taskVelocity'], TaskVelocityPoint.fromJson),
      userDistribution:
          _list(json['userDistribution'], UserDistributionSlice.fromJson),
      monthlyPerformance:
          _list(json['monthlyPerformance'], MonthlyPerformancePoint.fromJson),
      recentActivity:
          _list(json['recentActivity'], RecentActivityEntry.fromJson),
    );
  }

  /// True when the whole payload came back empty, so the screen can show one
  /// clear empty state instead of four blank charts.
  bool get isEmpty =>
      budgetDistribution.isEmpty &&
      taskVelocity.isEmpty &&
      userDistribution.isEmpty &&
      monthlyPerformance.isEmpty &&
      recentActivity.isEmpty;
}
