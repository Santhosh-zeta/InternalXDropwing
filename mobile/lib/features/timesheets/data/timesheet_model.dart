class TimesheetEntry {
  final int id;
  final int userId;
  final int? taskId;
  final int? projectId;
  final int? ventureId;
  final double hoursWorked;
  final String date;
  final String? notes;
  final String status;
  final int? approvedBy;
  final String? employeeName;
  final String? taskTitle;
  final String? projectName;
  final String? ventureName;
  final String? approverName;
  final String? createdAt;

  TimesheetEntry({
    required this.id,
    required this.userId,
    this.taskId,
    this.projectId,
    this.ventureId,
    required this.hoursWorked,
    required this.date,
    this.notes,
    this.status = 'pending',
    this.approvedBy,
    this.employeeName,
    this.taskTitle,
    this.projectName,
    this.ventureName,
    this.approverName,
    this.createdAt,
  });

  factory TimesheetEntry.fromJson(Map<String, dynamic> json) {
    return TimesheetEntry(
      id: json['id'] ?? 0,
      userId: json['user_id'] ?? json['userId'] ?? 0,
      taskId: json['task_id'] ?? json['taskId'],
      projectId: json['project_id'] ?? json['projectId'],
      ventureId: json['venture_id'] ?? json['ventureId'],
      hoursWorked: double.tryParse(
              (json['hours_worked'] ?? json['hoursWorked'] ?? 0).toString()) ??
          0.0,
      date: json['date']?.toString() ?? '',
      notes: json['notes'],
      status: json['status'] ?? 'pending',
      approvedBy: json['approved_by'] ?? json['approvedBy'],
      employeeName: json['employee_name'] ?? json['employeeName'],
      taskTitle: json['task_title'] ?? json['taskTitle'],
      projectName: json['project_name'] ?? json['projectName'],
      ventureName: json['venture_name'] ?? json['ventureName'],
      approverName: json['approver_name'] ?? json['approverName'],
      createdAt: json['created_at']?.toString() ?? json['createdAt']?.toString(),
    );
  }

  TimesheetEntry copyWith({String? status}) {
    return TimesheetEntry(
      id: id,
      userId: userId,
      taskId: taskId,
      projectId: projectId,
      ventureId: ventureId,
      hoursWorked: hoursWorked,
      date: date,
      notes: notes,
      status: status ?? this.status,
      approvedBy: approvedBy,
      employeeName: employeeName,
      taskTitle: taskTitle,
      projectName: projectName,
      ventureName: ventureName,
      approverName: approverName,
      createdAt: createdAt,
    );
  }
}

class TimesheetFinancials {
  final double totalHours;
  final double approvedHours;
  final double pendingHours;
  final int totalEntries;

  TimesheetFinancials({
    required this.totalHours,
    required this.approvedHours,
    required this.pendingHours,
    required this.totalEntries,
  });

  factory TimesheetFinancials.fromJson(Map<String, dynamic> json) {
    return TimesheetFinancials(
      totalHours:
          double.tryParse((json['total_hours'] ?? json['totalHours'] ?? 0).toString()) ?? 0.0,
      approvedHours:
          double.tryParse((json['approved_hours'] ?? json['approvedHours'] ?? 0).toString()) ?? 0.0,
      pendingHours:
          double.tryParse((json['pending_hours'] ?? json['pendingHours'] ?? 0).toString()) ?? 0.0,
      totalEntries: int.tryParse(
              (json['total_entries'] ?? json['totalEntries'] ?? 0).toString()) ??
          0,
    );
  }

  factory TimesheetFinancials.empty() {
    return TimesheetFinancials(
      totalHours: 0,
      approvedHours: 0,
      pendingHours: 0,
      totalEntries: 0,
    );
  }
}
