/// Models for `backend/src/routes/access_control.routes.js`
/// (`/api/access-control`). Level 1 (Super Admin) only.
library;

int _toInt(dynamic value) {
  if (value is int) return value;
  if (value is num) return value.round();
  if (value is String) return int.tryParse(value) ?? 0;
  return 0;
}

Map<String, bool> _permissions(dynamic raw) {
  if (raw is! Map) return const {};
  return raw.map((key, value) => MapEntry(key.toString(), value == true));
}

/// A row of `GET /api/access-control`: one of the nine fixed access levels
/// and the feature permissions currently granted to it.
class AccessLevelPermissions {
  final int levelNumber;
  final String levelName;
  final String? description;
  final Map<String, bool> permissions;

  const AccessLevelPermissions({
    required this.levelNumber,
    required this.levelName,
    required this.description,
    required this.permissions,
  });

  factory AccessLevelPermissions.fromJson(Map<String, dynamic> json) {
    final description = json['description']?.toString();
    return AccessLevelPermissions(
      levelNumber: _toInt(json['level_number']),
      levelName: json['level_name']?.toString() ?? '',
      description: (description == null || description.isEmpty) ? null : description,
      permissions: _permissions(json['permissions']),
    );
  }
}
