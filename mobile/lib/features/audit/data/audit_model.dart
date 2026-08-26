class AuditLog {
  final int id;
  final String action;
  final String? entityType;
  final int? entityId;
  final String? userName;
  final String? details;
  final String createdAt;

  AuditLog({
    required this.id,
    required this.action,
    this.entityType,
    this.entityId,
    this.userName,
    this.details,
    required this.createdAt,
  });

  factory AuditLog.fromJson(Map<String, dynamic> json) {
    return AuditLog(
      id: json['id'] as int? ?? 0,
      action: json['action'] as String? ?? '',
      entityType: json['entityType'] ?? json['entity_type'] as String?,
      entityId: json['entityId'] ?? json['entity_id'] as int?,
      userName: json['userName'] ?? json['user_name'] ?? json['user']?['fullName'] as String?,
      details: json['details'] as String?,
      createdAt: json['createdAt'] ?? json['created_at'] as String? ?? '',
    );
  }
}
