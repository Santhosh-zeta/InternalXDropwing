class VentureBreakdown {
  final String name;
  final int count;
  final String? color;

  VentureBreakdown({required this.name, required this.count, this.color});

  factory VentureBreakdown.fromJson(Map<String, dynamic> json) {
    return VentureBreakdown(
      name: json['name'] as String? ?? '',
      count: (json['count'] ?? json['employeeCount'] ?? json['employee_count'] ?? 0) as int,
      color: json['color'] as String?,
    );
  }
}

class HRKPIData {
  final int totalEmployees;
  final int activeProjects;
  final double avgCompletionRate;
  final List<VentureBreakdown> ventureBreakdown;

  HRKPIData({
    required this.totalEmployees,
    required this.activeProjects,
    required this.avgCompletionRate,
    required this.ventureBreakdown,
  });

  factory HRKPIData.fromJson(Map<String, dynamic> json) {
    final vbList = (json['ventureBreakdown'] ?? json['venture_breakdown'] ?? json['ventures'] ?? []) as List;
    return HRKPIData(
      totalEmployees: (json['totalEmployees'] ?? json['total_employees'] ?? 0) as int,
      activeProjects: (json['activeProjects'] ?? json['active_projects'] ?? 0) as int,
      avgCompletionRate: (json['avgCompletionRate'] ?? json['avg_completion_rate'] ?? 0).toDouble(),
      ventureBreakdown: vbList.map((v) => VentureBreakdown.fromJson(v as Map<String, dynamic>)).toList(),
    );
  }
}

class DeptKPIData {
  final String department;
  final int headcount;
  final double taskCompletionRate;
  final double avgHoursPerWeek;

  DeptKPIData({
    required this.department,
    required this.headcount,
    required this.taskCompletionRate,
    required this.avgHoursPerWeek,
  });

  factory DeptKPIData.fromJson(Map<String, dynamic> json) {
    return DeptKPIData(
      department: json['department'] as String? ?? '',
      headcount: (json['headcount'] ?? json['count'] ?? 0) as int,
      taskCompletionRate: (json['taskCompletionRate'] ?? json['task_completion_rate'] ?? 0).toDouble(),
      avgHoursPerWeek: (json['avgHoursPerWeek'] ?? json['avg_hours_per_week'] ?? 0).toDouble(),
    );
  }
}
