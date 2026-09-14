import 'dart:convert';

/// One row of `audit_logs`, from `GET /api/action-logs`.
///
/// The backend selects `a.*` joined to the actor, so every field arrives in
/// snake_case, and it JSON-parses `details` before sending — meaning that
/// column reaches us as an **object**, not a string. The previous parser cast
/// it with `json['details'] as String?`, which threw a `TypeError` on every
/// single record and made the whole screen show "Failed to load audit logs".
/// Everything below is read defensively for that reason.
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
    final user = json['user'];
    return AuditLog(
      id: _asInt(json['id']) ?? 0,
      action: json['action']?.toString() ?? '',
      entityType: _asString(json['entityType']) ?? _asString(json['entity_type']),
      entityId: _asInt(json['entityId'] ?? json['entity_id']),
      userName: _asString(json['userName']) ??
          _asString(json['user_name']) ??
          (user is Map ? _asString(user['fullName']) : null),
      details: _asDetails(json['details']),
      createdAt:
          _asString(json['createdAt']) ?? _asString(json['created_at']) ?? '',
    );
  }
}

String? _asString(Object? value) {
  if (value == null) return null;
  final text = value.toString();
  return text.isEmpty ? null : text;
}

int? _asInt(Object? value) {
  if (value is int) return value;
  if (value is num) return value.round();
  return int.tryParse(value?.toString() ?? '');
}

/// `details` is a JSON object on the wire. An empty one carries nothing worth
/// a row in the UI, so it becomes null rather than a literal "{}".
String? _asDetails(Object? value) {
  if (value == null) return null;
  if (value is String) return value.trim().isEmpty ? null : value;
  if (value is Map) {
    if (value.isEmpty) return null;
    try {
      return jsonEncode(value);
    } catch (_) {
      return value.toString();
    }
  }
  return value.toString();
}
