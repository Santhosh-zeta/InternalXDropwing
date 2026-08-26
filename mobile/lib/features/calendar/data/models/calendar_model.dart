class CalendarEvent {
  final int id;
  final String title;
  final DateTime date;
  final String type; // 'milestone' | 'deadline' | 'event'
  final int? projectId;
  final String? projectName;
  final bool completed;
  final String? description;

  CalendarEvent({
    required this.id,
    required this.title,
    required this.date,
    required this.type,
    this.projectId,
    this.projectName,
    this.completed = false,
    this.description,
  });

  factory CalendarEvent.fromJson(Map<String, dynamic> json) {
    return CalendarEvent(
      id: json['id'] ?? 0,
      title: json['title'] ?? '',
      date: DateTime.parse(json['date'] ?? DateTime.now().toIso8601String()),
      type: json['type'] ?? 'event',
      projectId: json['project_id'],
      projectName: json['project_name'],
      completed: json['completed'] ?? false,
      description: json['description'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'date': date.toIso8601String(),
      'type': type,
      'project_id': projectId,
      'project_name': projectName,
      'completed': completed,
      'description': description,
    };
  }
}
