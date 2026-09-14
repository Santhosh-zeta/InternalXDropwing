/// Models for `backend/src/routes/role_management.routes.js`
/// (`GET/POST/PUT/DELETE /api/role-management`).
///
/// A "role" here is a per-venture custom role (`venture_roles`), not one of
/// the nine fixed access levels — those live in the `access_control` module.
library;

int? _toIntOrNull(dynamic value) {
  if (value is int) return value;
  if (value is num) return value.round();
  if (value is String) return int.tryParse(value);
  return null;
}

String? _nonEmpty(dynamic value) {
  final text = value?.toString();
  return (text == null || text.isEmpty) ? null : text;
}

Map<String, bool> _permissions(dynamic raw) {
  if (raw is! Map) return const {};
  return raw.map((key, value) => MapEntry(key.toString(), value == true));
}

/// A user assigned to a role, from the role detail endpoint.
class RoleAssignedUser {
  final int id;
  final String fullName;
  final String email;
  final int accessLevel;
  final String levelName;
  final String? ventureName;

  const RoleAssignedUser({
    required this.id,
    required this.fullName,
    required this.email,
    required this.accessLevel,
    required this.levelName,
    required this.ventureName,
  });

  factory RoleAssignedUser.fromJson(Map<String, dynamic> json) {
    return RoleAssignedUser(
      id: _toIntOrNull(json['id']) ?? 0,
      fullName: json['full_name']?.toString() ?? '',
      email: json['email']?.toString() ?? '',
      accessLevel: _toIntOrNull(json['access_level']) ?? 0,
      levelName: json['level_name']?.toString() ?? '',
      ventureName: _nonEmpty(json['venture_name']),
    );
  }
}

/// A row of `GET /api/role-management` (and, with `assignedUsers`, the
/// response of `GET /api/role-management/:id`).
class VentureRole {
  final int id;
  final int? ventureId;
  final String? ventureName;
  final String? ventureColor;
  final String roleName;
  final String roleKey;
  final String? description;
  final String color;
  final String icon;
  final int baseLevel;
  final Map<String, bool> permissions;
  final bool isActive;
  final int sortOrder;
  final String? createdByName;
  final int assignedUsersCount;
  final List<RoleAssignedUser> assignedUsers;

  const VentureRole({
    required this.id,
    required this.ventureId,
    required this.ventureName,
    required this.ventureColor,
    required this.roleName,
    required this.roleKey,
    required this.description,
    required this.color,
    required this.icon,
    required this.baseLevel,
    required this.permissions,
    required this.isActive,
    required this.sortOrder,
    required this.createdByName,
    required this.assignedUsersCount,
    required this.assignedUsers,
  });

  factory VentureRole.fromJson(Map<String, dynamic> json) {
    final rawAssigned = json['assignedUsers'];
    return VentureRole(
      id: _toIntOrNull(json['id']) ?? 0,
      ventureId: _toIntOrNull(json['venture_id']),
      ventureName: _nonEmpty(json['venture_name']),
      ventureColor: _nonEmpty(json['venture_color']),
      roleName: json['role_name']?.toString() ?? '',
      roleKey: json['role_key']?.toString() ?? '',
      description: _nonEmpty(json['description']),
      color: json['color']?.toString() ?? '#6366f1',
      icon: json['icon']?.toString() ?? '🔷',
      baseLevel: _toIntOrNull(json['base_level']) ?? 5,
      permissions: _permissions(json['permissions']),
      isActive: json['is_active'] != false,
      sortOrder: _toIntOrNull(json['sort_order']) ?? 100,
      createdByName: _nonEmpty(json['created_by_name']),
      assignedUsersCount: _toIntOrNull(json['assigned_users_count']) ?? 0,
      assignedUsers: rawAssigned is List
          ? rawAssigned
              .whereType<Map<String, dynamic>>()
              .map(RoleAssignedUser.fromJson)
              .toList()
          : const <RoleAssignedUser>[],
    );
  }
}

/// A row of `GET /api/role-management/ventures`.
class RoleVentureOption {
  final int id;
  final String name;
  final String? slug;
  final String? primaryColor;

  const RoleVentureOption({
    required this.id,
    required this.name,
    required this.slug,
    required this.primaryColor,
  });

  factory RoleVentureOption.fromJson(Map<String, dynamic> json) {
    return RoleVentureOption(
      id: _toIntOrNull(json['id']) ?? 0,
      name: json['name']?.toString() ?? '',
      slug: _nonEmpty(json['slug']),
      primaryColor: _nonEmpty(json['primary_color']),
    );
  }
}

/// A row of `GET /api/role-management/assign-team-members`. `string_agg`
/// columns come back as `,`/`||`-delimited strings that are split here into
/// parallel lists of already-assigned roles.
class AssignableTeamMember {
  final int id;
  final String fullName;
  final String email;
  final int accessLevel;
  final String? department;
  final String? designation;
  final String levelName;
  final String? ventureName;
  final String? ventureColor;
  final List<int> assignedRoleIds;
  final List<String> assignedRoleNames;

  const AssignableTeamMember({
    required this.id,
    required this.fullName,
    required this.email,
    required this.accessLevel,
    required this.department,
    required this.designation,
    required this.levelName,
    required this.ventureName,
    required this.ventureColor,
    required this.assignedRoleIds,
    required this.assignedRoleNames,
  });

  factory AssignableTeamMember.fromJson(Map<String, dynamic> json) {
    final idsRaw = json['assigned_role_ids']?.toString() ?? '';
    final namesRaw = json['assigned_role_names']?.toString() ?? '';
    final ids = idsRaw.isEmpty
        ? <int>[]
        : idsRaw
            .split(',')
            .map((s) => int.tryParse(s.trim()))
            .whereType<int>()
            .toList();
    final names = namesRaw.isEmpty
        ? <String>[]
        : namesRaw.split('||').map((s) => s.trim()).toList();

    return AssignableTeamMember(
      id: _toIntOrNull(json['id']) ?? 0,
      fullName: json['full_name']?.toString() ?? '',
      email: json['email']?.toString() ?? '',
      accessLevel: _toIntOrNull(json['access_level']) ?? 0,
      department: _nonEmpty(json['department']),
      designation: _nonEmpty(json['designation']),
      levelName: json['level_name']?.toString() ?? '',
      ventureName: _nonEmpty(json['venture_name']),
      ventureColor: _nonEmpty(json['venture_color']),
      assignedRoleIds: ids,
      assignedRoleNames: names,
    );
  }
}
