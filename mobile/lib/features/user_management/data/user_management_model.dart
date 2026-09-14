/// Models for the admin user-management surface, backed by
/// `backend/src/routes/user.routes.js` (mounted at `/api/team-members`).
///
/// This is the write-capable admin counterpart to the read-only `team` feature.
library;

bool _toBool(dynamic value) {
  if (value is bool) return value;
  if (value is num) return value != 0;
  if (value is String) {
    final lower = value.toLowerCase();
    return lower == 'true' || lower == 't' || lower == '1';
  }
  return false;
}

int? _toIntOrNull(dynamic value) {
  if (value is int) return value;
  if (value is num) return value.round();
  if (value is String) return int.tryParse(value);
  return null;
}

/// A row of `GET /api/team-members`, or the `user` object of
/// `GET /api/team-members/:id`.
class ManagedUser {
  final int id;
  final String? employeeId;
  final String fullName;
  final String email;
  final String? phone;
  final int accessLevel;
  final String? department;
  final String? designation;
  final bool isActive;
  final String? lastLogin;
  final String? createdAt;
  final String levelName;

  /// Only present on the detail endpoint (`al.description`).
  final String? levelDescription;
  final String? ventureName;
  final int? ventureId;
  final String? avatarUrl;

  const ManagedUser({
    required this.id,
    required this.employeeId,
    required this.fullName,
    required this.email,
    required this.phone,
    required this.accessLevel,
    required this.department,
    required this.designation,
    required this.isActive,
    required this.lastLogin,
    required this.createdAt,
    required this.levelName,
    required this.levelDescription,
    required this.ventureName,
    required this.ventureId,
    required this.avatarUrl,
  });

  factory ManagedUser.fromJson(Map<String, dynamic> json) {
    String? nonEmpty(dynamic value) {
      final text = value?.toString();
      return (text == null || text.isEmpty) ? null : text;
    }

    return ManagedUser(
      id: _toIntOrNull(json['id']) ?? 0,
      employeeId: nonEmpty(json['employee_id']),
      fullName: json['full_name']?.toString() ?? '',
      email: json['email']?.toString() ?? '',
      phone: nonEmpty(json['phone']),
      accessLevel: _toIntOrNull(json['access_level']) ?? 0,
      department: nonEmpty(json['department']),
      designation: nonEmpty(json['designation']),
      isActive: _toBool(json['is_active']),
      lastLogin: nonEmpty(json['last_login']),
      createdAt: nonEmpty(json['created_at']),
      levelName: json['level_name']?.toString() ?? '',
      levelDescription: nonEmpty(json['level_description']),
      ventureName: nonEmpty(json['venture_name']),
      ventureId: _toIntOrNull(json['venture_id']),
      avatarUrl: nonEmpty(json['avatar_url']),
    );
  }

  /// Initials used by the avatar placeholder.
  String get initials {
    final parts =
        fullName.trim().split(RegExp(r'\s+')).where((p) => p.isNotEmpty).toList();
    if (parts.isEmpty) return '?';
    if (parts.length == 1) return parts.first[0].toUpperCase();
    return '${parts.first[0]}${parts.last[0]}'.toUpperCase();
  }
}

/// A task surfaced in the `activity` array of `GET /api/team-members/:id`.
class UserActivityEntry {
  final int id;
  final String title;
  final String? status;
  final String? priority;
  final String? updatedAt;

  const UserActivityEntry({
    required this.id,
    required this.title,
    required this.status,
    required this.priority,
    required this.updatedAt,
  });

  factory UserActivityEntry.fromJson(Map<String, dynamic> json) {
    return UserActivityEntry(
      id: _toIntOrNull(json['id']) ?? 0,
      title: json['title']?.toString() ?? '',
      status: json['status']?.toString(),
      priority: json['priority']?.toString(),
      updatedAt: json['updated_at']?.toString() ?? json['created_at']?.toString(),
    );
  }
}

/// The whole `data` payload of `GET /api/team-members/:id`.
class ManagedUserDetail {
  final ManagedUser user;
  final List<UserActivityEntry> activity;

  const ManagedUserDetail({required this.user, required this.activity});

  factory ManagedUserDetail.fromJson(Map<String, dynamic> json) {
    final rawActivity = json['activity'];
    return ManagedUserDetail(
      user: ManagedUser.fromJson(
          (json['user'] as Map?)?.cast<String, dynamic>() ?? const {}),
      activity: rawActivity is List
          ? rawActivity
              .whereType<Map<String, dynamic>>()
              .map(UserActivityEntry.fromJson)
              .toList()
          : const <UserActivityEntry>[],
    );
  }
}

/// A row of `GET /api/team-members/ventures`, used by the venture picker.
class VentureOption {
  final int id;
  final String name;
  final String? primaryColor;

  const VentureOption({
    required this.id,
    required this.name,
    required this.primaryColor,
  });

  factory VentureOption.fromJson(Map<String, dynamic> json) {
    return VentureOption(
      id: _toIntOrNull(json['id']) ?? 0,
      name: json['name']?.toString() ?? '',
      primaryColor: json['primary_color']?.toString(),
    );
  }
}

/// A row of `GET /api/team-members/access-levels`, used by the level picker.
class AccessLevelOption {
  final int levelNumber;
  final String levelName;
  final String? description;

  const AccessLevelOption({
    required this.levelNumber,
    required this.levelName,
    required this.description,
  });

  factory AccessLevelOption.fromJson(Map<String, dynamic> json) {
    final description = json['description']?.toString();
    return AccessLevelOption(
      levelNumber: _toIntOrNull(json['level_number']) ?? 0,
      levelName: json['level_name']?.toString() ?? '',
      description: (description == null || description.isEmpty) ? null : description,
    );
  }
}
