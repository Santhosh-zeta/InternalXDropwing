class TeamMember {
  final int id;
  final String employeeId;
  final String fullName;
  final String email;
  final int accessLevel;
  final String levelName;
  final String? department;
  final String? designation;
  final String? phone;
  final String? avatarUrl;
  final String? ventureName;
  final String? ventureColor;
  final int? ventureId;
  final String? createdAt;

  TeamMember({
    required this.id,
    required this.employeeId,
    required this.fullName,
    required this.email,
    required this.accessLevel,
    required this.levelName,
    this.department,
    this.designation,
    this.phone,
    this.avatarUrl,
    this.ventureName,
    this.ventureColor,
    this.ventureId,
    this.createdAt,
  });

  factory TeamMember.fromJson(Map<String, dynamic> json) {
    // Support nested venture object or flat fields
    final venture = json['venture'] as Map<String, dynamic>?;
    return TeamMember(
      id: json['id'] ?? 0,
      employeeId: json['employee_id']?.toString() ?? json['employeeId']?.toString() ?? '',
      fullName: json['full_name'] ?? json['fullName'] ?? '',
      email: json['email'] ?? '',
      accessLevel: int.tryParse((json['access_level'] ?? json['accessLevel'] ?? 9).toString()) ?? 9,
      levelName: json['level_name'] ?? json['levelName'] ?? 'L9',
      department: json['department'],
      designation: json['designation'],
      phone: json['phone'],
      avatarUrl: json['avatar_url'] ?? json['avatarUrl'],
      ventureName: venture?['name'] ?? json['venture_name'] ?? json['ventureName'],
      ventureColor: venture?['primary_color'] ?? venture?['primaryColor'] ?? json['venture_color'],
      ventureId: venture?['id'] ?? json['venture_id'] ?? json['ventureId'],
      createdAt: json['created_at']?.toString() ?? json['createdAt']?.toString(),
    );
  }

  String get initials {
    final parts = fullName.trim().split(' ');
    if (parts.length >= 2) {
      return '${parts.first[0]}${parts.last[0]}'.toUpperCase();
    }
    return fullName.isNotEmpty ? fullName[0].toUpperCase() : '?';
  }

  /// Role bucket for filter chips
  String get roleBucket {
    if (accessLevel <= 2) return 'super_admin';
    if (accessLevel <= 4) return 'admin';
    if (accessLevel == 5) return 'manager';
    if (accessLevel <= 7) return 'staff';
    return 'intern';
  }
}
