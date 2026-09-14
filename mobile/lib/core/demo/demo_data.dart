/// Canned data for demo mode. See `demo_mode.dart` for what this is and how
/// to remove it. Every shape here mirrors the real backend's response shape
/// exactly (field names, nesting, string vs number) — verified against the
/// actual controllers and the mobile models that parse these responses,
/// not guessed.
library;

// ── Ventures (matches deployment/postgres/init/03_seed.sql exactly) ───────
const ventures = [
  {'id': 1, 'name': 'Dropwing Design Studio', 'slug': 'dropwing', 'color': '#8B5CF6'},
  {'id': 2, 'name': 'Fenixa Solutions', 'slug': 'fenixa', 'color': '#06B6D4'},
  {'id': 3, 'name': 'PerSyniX', 'slug': 'persynix', 'color': '#F59E0B'},
  {'id': 4, 'name': 'Grovia', 'slug': 'grovia', 'color': '#10B981'},
];

// ── People (reused across tasks/projects/timesheets/team/chat so names
// line up consistently everywhere in the demo) ─────────────────────────────
const people = [
  {'id': 1, 'name': 'Aarav Sharma', 'email': 'sa@dropwinggroups.com', 'level': 1, 'levelName': 'Super Admin', 'dept': 'Executive', 'desig': 'Super Administrator', 'ventureId': null},
  {'id': 2, 'name': 'Ishita Verma', 'email': 'md@dropwinggroups.com', 'level': 2, 'levelName': 'Managing Director', 'dept': 'Executive', 'desig': 'Managing Director', 'ventureId': null},
  {'id': 3, 'name': 'Rohan Kapoor', 'email': 'ad@dropwing.in', 'level': 3, 'levelName': 'Admin', 'dept': 'Operations', 'desig': 'Administrator', 'ventureId': 1},
  {'id': 4, 'name': 'Karan Mehta', 'email': 'cx@fenixa.com', 'level': 4, 'levelName': 'CXO', 'dept': 'Executive', 'desig': 'Chief Technology Officer', 'ventureId': 2},
  {'id': 5, 'name': 'Ananya Iyer', 'email': 'mg@persynix.com', 'level': 5, 'levelName': 'Manager', 'dept': 'Product', 'desig': 'Product Manager', 'ventureId': 3},
  {'id': 6, 'name': 'Devika Nair', 'email': 'es@grovia.in', 'level': 6, 'levelName': 'Executive Staff', 'dept': 'Operations', 'desig': 'Executive Officer', 'ventureId': 4},
  {'id': 7, 'name': 'Sneha Reddy', 'email': 'st@dropwing.in', 'level': 7, 'levelName': 'Staff', 'dept': 'Design', 'desig': 'Senior Designer', 'ventureId': 1},
  {'id': 8, 'name': 'Vikram Nair', 'email': 'in@fenixa.com', 'level': 8, 'levelName': 'Intern', 'dept': 'Engineering', 'desig': 'Software Intern', 'ventureId': 2},
  {'id': 9, 'name': 'Meera Joshi', 'email': 'cl@persynix.com', 'level': 9, 'levelName': 'Client', 'dept': 'External', 'desig': 'Client', 'ventureId': 3},
  {'id': 10, 'name': 'Aditya Rao', 'email': 'st@fenixa.com', 'level': 7, 'levelName': 'Staff', 'dept': 'Engineering', 'desig': 'Software Engineer', 'ventureId': 2},
];

Map<String, dynamic> _venture(int id) => ventures.firstWhere((v) => v['id'] == id);
Map<String, dynamic> _person(int id) => people.firstWhere((p) => p['id'] == id);

/// The signed-in demo user — Super Admin, so every module in the app is
/// reachable. Field names match `User.fromJson` in auth_models.dart exactly.
Map<String, dynamic> demoUserJson() => {
      'id': 1,
      'employeeId': 'DG-SA-001',
      'fullName': 'Aarav Sharma',
      'email': 'sa@dropwinggroups.com',
      'accessLevel': 1,
      'levelName': 'Super Admin',
      'department': 'Executive',
      'designation': 'Super Administrator',
      'phone': '+91 98765 43210',
      'avatarUrl': null,
      'lastLogin': DateTime.now().subtract(const Duration(hours: 2)).toIso8601String(),
      'createdAt': DateTime(2025, 1, 15).toIso8601String(),
      'venture': null,
    };

String _iso(int daysOffset, {int hour = 9}) =>
    DateTime.now().add(Duration(days: daysOffset, hours: hour - DateTime.now().hour)).toIso8601String();

// ── Tasks ───────────────────────────────────────────────────────────────
List<Map<String, dynamic>> tasksJson() {
  final defs = [
    ('Redesign onboarding flow', 'in-progress', 'high', 3, 7, 1, 1, -1),
    ('Fix payment gateway timeout', 'pending', 'urgent', 4, 10, 2, 2, 1),
    ('Write Q3 investor deck', 'completed', 'medium', 2, 5, null, null, -5),
    ('Migrate analytics to new schema', 'in-progress', 'high', 5, 8, 3, 3, 3),
    ('Update brand style guide', 'pending', 'low', 3, 7, 1, 1, 6),
    ('Client demo prep — Grovia', 'in-progress', 'medium', 6, 6, 4, 4, 2),
    ('Security review — auth flow', 'completed', 'urgent', 1, 5, null, null, -2),
    ('Draft intern onboarding checklist', 'pending', 'low', 5, 8, 3, null, 10),
  ];
  return List.generate(defs.length, (i) {
    final (title, status, priority, assignedBy, assignee, ventureId, projectId, due) = defs[i];
    final by = _person(assignedBy);
    final v = ventureId != null ? _venture(ventureId) : null;
    return {
      'id': i + 1,
      'title': title,
      'description': 'Demo task — $title.',
      'status': status,
      'priority': priority,
      'assigned_by': assignedBy,
      'venture_id': ventureId,
      'project_id': projectId,
      'parent_task_id': null,
      'due_date': _iso(due),
      'created_at': _iso(due - 14),
      'updated_at': _iso(due - 1),
      'assigned_by_name': by['name'],
      'assigned_by_avatar': null,
      'venture_name': v?['name'],
      'primary_color': v?['color'],
      'project_name': projectId != null ? _projectName(projectId) : null,
      'parent_task_title': null,
      'assignees': [
        {'id': assignee, 'name': _person(assignee)['name'], 'avatar': null},
      ],
    };
  });
}

String _projectName(int id) => const {
      1: 'Dropwing Brand Refresh',
      2: 'Fenixa Payments Platform',
      3: 'PerSyniX ML Pipeline',
      4: 'Grovia Growth Campaign',
    }[id]!;

// ── Projects ────────────────────────────────────────────────────────────
List<Map<String, dynamic>> projectsJson() {
  final defs = [
    (1, 'Dropwing Brand Refresh', 'active', 'high', 1, 250000.0, -30, 45, 12, 7),
    (2, 'Fenixa Payments Platform', 'active', 'urgent', 2, 1200000.0, -60, 20, 28, 14),
    (3, 'PerSyniX ML Pipeline', 'planning', 'medium', 3, 800000.0, -5, 90, 6, 1),
    (4, 'Grovia Growth Campaign', 'active', 'medium', 4, 400000.0, -20, 60, 15, 9),
    (5, 'Legacy Support — Dropwing', 'on-hold', 'low', 1, 60000.0, -120, null, 4, 4),
    (6, 'PerSyniX API v2', 'completed', 'high', 3, 300000.0, -90, -10, 10, 10),
  ];
  return defs.map((d) {
    final (id, name, status, priority, ventureId, budget, start, end, taskCount, done) = d;
    final v = _venture(ventureId);
    return {
      'id': id,
      'name': name,
      'description': 'Demo project — $name for ${v['name']}.',
      'status': status,
      'priority': priority,
      'category': 'Delivery',
      'budget': budget,
      'venture_id': ventureId,
      'venture_name': v['name'],
      'venture_color': v['color'],
      'start_date': _iso(start),
      'end_date': end != null ? _iso(end) : null,
      'client_name': null,
      'client_email': null,
      'tags': const ['demo'],
      'created_by': 1,
      'created_by_name': 'Aarav Sharma',
      'task_count': taskCount,
      'completed_task_count': done,
      'members': [
        {'user_id': ventureId + 2, 'full_name': _person(ventureId + 2)['name'], 'email': _person(ventureId + 2)['email'], 'role': 'Lead'},
      ],
      'milestones': [
        {'id': id * 10 + 1, 'title': 'Kickoff', 'description': null, 'due_date': _iso(start + 5), 'status': 'completed'},
        {'id': id * 10 + 2, 'title': 'Mid-review', 'description': null, 'due_date': _iso(start + 30), 'status': status == 'completed' ? 'completed' : 'pending'},
      ],
      'created_at': _iso(start),
      'updated_at': _iso(-1),
    };
  }).toList();
}

// ── Timesheets ──────────────────────────────────────────────────────────
List<Map<String, dynamic>> timesheetsJson() {
  final defs = [
    (1, 7, 1, 1, 8.0, -1, 'approved'),
    (2, 10, 2, 2, 7.5, -1, 'pending'),
    (3, 5, 3, 3, 6.0, -2, 'pending'),
    (4, 6, 4, 4, 8.0, -2, 'approved'),
    (5, 7, 1, 1, 4.5, -3, 'rejected'),
    (6, 8, null, 2, 5.0, -3, 'pending'),
  ];
  return defs.map((d) {
    final (id, userId, taskId, ventureId, hours, dayOffset, status) = d;
    final p = _person(userId);
    final v = _venture(ventureId);
    return {
      'id': id,
      'user_id': userId,
      'task_id': taskId,
      'project_id': ventureId,
      'venture_id': ventureId,
      'hours_worked': hours,
      'date': _iso(dayOffset).split('T').first,
      'notes': 'Demo timesheet entry.',
      'status': status,
      'approved_by': status == 'approved' ? 1 : null,
      'employee_name': p['name'],
      'task_title': taskId != null ? tasksJson()[taskId - 1]['title'] : null,
      'project_name': _projectName(ventureId),
      'venture_name': v['name'],
      'approver_name': status == 'approved' ? 'Aarav Sharma' : null,
      'created_at': _iso(dayOffset),
    };
  }).toList();
}

// ── Notifications ───────────────────────────────────────────────────────
List<Map<String, dynamic>> notificationsJson() => [
      {'id': 1, 'type': 'task_assigned', 'title': 'New task assigned', 'message': 'You were assigned "Redesign onboarding flow".', 'link': '/tasks/1', 'is_read': false, 'created_at': _iso(0)},
      {'id': 2, 'type': 'deadline', 'title': 'Deadline approaching', 'message': '"Fix payment gateway timeout" is due tomorrow.', 'link': '/tasks/2', 'is_read': false, 'created_at': _iso(-1)},
      {'id': 3, 'type': 'project_update', 'title': 'Project milestone completed', 'message': 'Kickoff milestone completed for Grovia Growth Campaign.', 'link': '/projects/4', 'is_read': true, 'created_at': _iso(-2)},
      {'id': 4, 'type': 'mention', 'title': 'You were mentioned', 'message': 'Karan Mehta mentioned you in Fenixa Payments Platform.', 'link': '/projects/2', 'is_read': true, 'created_at': _iso(-4)},
    ];

// ── Documents ───────────────────────────────────────────────────────────
List<Map<String, dynamic>> documentsJson() => [
      {'id': 1, 'original_name': 'Brand-Guidelines-v3.pdf', 'stored_name': 'demo1.pdf', 'mime_type': 'application/pdf', 'file_size': 2456000, 'file_path': '/uploads/demo1.pdf', 'uploaded_by': 3, 'uploaded_by_name': 'Rohan Kapoor', 'related_to': 'project', 'related_id': 1, 'created_at': _iso(-10)},
      {'id': 2, 'original_name': 'Q3-Investor-Deck.pptx', 'stored_name': 'demo2.pptx', 'mime_type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'file_size': 5830000, 'file_path': '/uploads/demo2.pptx', 'uploaded_by': 2, 'uploaded_by_name': 'Ishita Verma', 'related_to': null, 'related_id': null, 'created_at': _iso(-5)},
      {'id': 3, 'original_name': 'API-Spec-v2.pdf', 'stored_name': 'demo3.pdf', 'mime_type': 'application/pdf', 'file_size': 890000, 'file_path': '/uploads/demo3.pdf', 'uploaded_by': 4, 'uploaded_by_name': 'Karan Mehta', 'related_to': 'project', 'related_id': 2, 'created_at': _iso(-15)},
    ];

// ── Budget ──────────────────────────────────────────────────────────────
Map<String, dynamic> budgetSummaryJson() => {
      'totalBudget': 3010000,
      'spent': 1840000,
      'remaining': 1170000,
      'utilizationPct': 61.1,
      'ventureBreakdown': ventures.map((v) {
        final id = v['id'] as int;
        return {'name': v['name'], 'amount': 250000.0 * id * 1.6, 'percentage': (15 + id * 8).toDouble()};
      }).toList(),
    };

List<Map<String, dynamic>> budgetExpensesJson() => [
      {'id': 1, 'category': 'Software licenses', 'amount': 45000.0, 'date': _iso(-3).split('T').first, 'description': 'Design tooling renewal', 'venture_name': 'Dropwing Design Studio'},
      {'id': 2, 'category': 'Cloud infrastructure', 'amount': 128000.0, 'date': _iso(-7).split('T').first, 'description': 'AWS — Fenixa payments', 'venture_name': 'Fenixa Solutions'},
      {'id': 3, 'category': 'Contractor fees', 'amount': 76000.0, 'date': _iso(-12).split('T').first, 'description': 'ML consulting', 'venture_name': 'PerSyniX'},
    ];

List<Map<String, dynamic>> budgetMonthlyJson() => List.generate(6, (i) {
      final month = DateTime.now().subtract(Duration(days: (5 - i) * 30));
      const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return {'month': names[month.month - 1], 'target': 500000.0, 'actual': 420000.0 + i * 15000};
    });

// ── KPIs ────────────────────────────────────────────────────────────────
Map<String, dynamic> hrKpisJson() => {
      'totalEmployees': 42,
      'activeProjects': 5,
      'avgCompletionRate': 78.5,
      'ventureBreakdown': ventures.map((v) => {'name': v['name'], 'count': 8 + (v['id'] as int) * 3, 'color': v['color']}).toList(),
    };

List<Map<String, dynamic>> deptKpisJson() => [
      {'department': 'Engineering', 'headcount': 16, 'taskCompletionRate': 82.0, 'avgHoursPerWeek': 38.5},
      {'department': 'Design', 'headcount': 8, 'taskCompletionRate': 90.0, 'avgHoursPerWeek': 36.0},
      {'department': 'Product', 'headcount': 6, 'taskCompletionRate': 75.0, 'avgHoursPerWeek': 40.0},
      {'department': 'Operations', 'headcount': 12, 'taskCompletionRate': 70.0, 'avgHoursPerWeek': 37.0},
    ];

// ── Strategy ────────────────────────────────────────────────────────────
Map<String, dynamic> strategyJson() => {
      'okrs': [
        {
          'id': 1, 'title': 'Expand PerSyniX into two new verticals', 'description': 'Land the first enterprise ML client outside fintech.',
          'progress': 65, 'quarter': 'Q3', 'year': 2026, 'status': 'active', 'owner_name': 'Ananya Iyer',
          'key_results': [
            {'id': 1, 'title': 'Sign 2 pilot customers', 'target_value': 2, 'current_value': 1, 'unit': 'customers'},
            {'id': 2, 'title': 'Reduce model latency', 'target_value': 100, 'current_value': 68, 'unit': 'ms'},
          ],
        },
        {
          'id': 2, 'title': 'Grovia: double organic lead volume', 'description': 'Content + SEO push across all campaigns.',
          'progress': 40, 'quarter': 'Q3', 'year': 2026, 'status': 'active', 'owner_name': 'Devika Nair',
          'key_results': [
            {'id': 3, 'title': 'Organic leads / month', 'target_value': 1000, 'current_value': 420, 'unit': 'leads'},
          ],
        },
      ],
      'risks': [
        {'id': 1, 'title': 'Fenixa payment provider contract renewal', 'description': 'Current vendor contract expires next quarter.', 'severity': 'high', 'status': 'open', 'mitigation': 'Negotiating renewal terms; backup vendor shortlisted.'},
        {'id': 2, 'title': 'Key engineer attrition risk — PerSyniX', 'description': 'Two senior ML engineers approached by competitors.', 'severity': 'medium', 'status': 'open', 'mitigation': 'Retention conversations in progress.'},
      ],
    };

// ── Team ────────────────────────────────────────────────────────────────
List<Map<String, dynamic>> teamMembersJson() => people.map((p) {
      final ventureId = p['ventureId'] as int?;
      final v = ventureId != null ? _venture(ventureId) : null;
      return {
        'id': p['id'],
        'employee_id': 'DG-${(p['id'] as int).toString().padLeft(3, '0')}',
        'full_name': p['name'],
        'email': p['email'],
        'access_level': p['level'],
        'level_name': p['levelName'],
        'department': p['dept'],
        'designation': p['desig'],
        'phone': '+91 90000 0${(p['id'] as int).toString().padLeft(4, '0')}',
        'avatar_url': null,
        'venture_name': v?['name'],
        'venture_color': v?['color'],
        'venture_id': ventureId,
        'created_at': _iso(-200),
      };
    }).toList();

// ── Documents already above; Learning Hub ──────────────────────────────
List<Map<String, dynamic>> learningChecklistJson() => [
      {'id': 1, 'title': 'Complete HR onboarding paperwork', 'description': 'NDA, offer letter, emergency contacts.', 'category': 'Onboarding', 'sort_order': 1, 'due_days': 3, 'venture_id': null, 'completed': true, 'completed_at': _iso(-40), 'completions': 6, 'total_interns': 8},
      {'id': 2, 'title': 'Set up development environment', 'description': 'Install tools, clone repos, run locally.', 'category': 'Setup', 'sort_order': 2, 'due_days': 5, 'venture_id': null, 'completed': true, 'completed_at': _iso(-38), 'completions': 7, 'total_interns': 8},
      {'id': 3, 'title': 'Complete first assigned task', 'description': 'Pick up and finish your first board task.', 'category': 'Milestones', 'sort_order': 5, 'due_days': 14, 'venture_id': null, 'completed': false, 'completed_at': null, 'completions': 3, 'total_interns': 8},
    ];

List<Map<String, dynamic>> learningResourcesJson() => [
      {'id': 1, 'title': 'InternalX Architecture Overview', 'description': 'How the four ventures share one platform.', 'url': 'https://example.com/architecture', 'category': 'Onboarding', 'resource_type': 'doc', 'added_by': 2, 'added_by_name': 'Ishita Verma', 'venture_id': null, 'created_at': _iso(-60)},
      {'id': 2, 'title': 'Brand Guidelines Walkthrough', 'description': 'Video tour of the design system.', 'url': 'https://example.com/brand-video', 'category': 'Learning', 'resource_type': 'video', 'added_by': 3, 'added_by_name': 'Rohan Kapoor', 'venture_id': 1, 'created_at': _iso(-55)},
    ];

List<Map<String, dynamic>> learningFeedbackJson() => [
      {'id': 1, 'manager_id': 5, 'intern_id': 8, 'note': 'Strong progress on the API integration task this week.', 'rating': 4, 'week_label': 'Week 3', 'intern_name': 'Vikram Nair', 'manager_name': 'Ananya Iyer', 'venture_id': 2, 'created_at': _iso(-4)},
    ];

// ── Client Portal ───────────────────────────────────────────────────────
Map<String, dynamic> clientPortalOverviewJson() => {
      'projects': [
        {
          'id': 4, 'name': 'Grovia Growth Campaign', 'status': 'active', 'progress': 68.0,
          'description': 'Q3 multi-channel growth campaign.',
          'deliverables': const ['Landing pages', 'Ad creative set', 'Monthly report'],
          'team_members': [
            {'id': 6, 'name': 'Devika Nair', 'email': 'es@grovia.in', 'role': 'Account Lead'},
          ],
        },
      ],
      'deliverables': [
        {'id': 1, 'name': 'Campaign creative — round 2', 'type': 'design', 'due_date': _iso(5), 'status': 'pending', 'description': 'Revised ad creative for review.'},
        {'id': 2, 'name': 'Monthly performance report', 'type': 'document', 'due_date': _iso(-2), 'status': 'completed', 'description': 'August performance summary.'},
      ],
      'invoices': [
        {'id': 1, 'invoice_number': 'INV-4-2026-08', 'amount': 84000.0, 'date': _iso(-10), 'status': 'paid', 'pdf_url': null, 'description': 'August retainer'},
        {'id': 2, 'invoice_number': 'INV-4-2026-09', 'amount': 84000.0, 'date': _iso(-1), 'status': 'pending', 'pdf_url': null, 'description': 'September retainer'},
      ],
    };

// ── Platform metrics / Reports (also used by Home) ─────────────────────
Map<String, dynamic> platformMetricsJson() => {
      'budgetDistribution': ventures.map((v) => {'venture': v['name'], 'color': v['color'], 'total_budget': 250000.0 * (v['id'] as int) * 1.6}).toList(),
      'taskVelocity': const [
        {'name': 'Mon', 'completed': 3}, {'name': 'Tue', 'completed': 5}, {'name': 'Wed', 'completed': 2},
        {'name': 'Thu', 'completed': 6}, {'name': 'Fri', 'completed': 4}, {'name': 'Sat', 'completed': 1}, {'name': 'Sun', 'completed': 0},
      ],
      'userDistribution': ventures.map((v) => {'name': v['name'], 'value': 8 + (v['id'] as int) * 3, 'color': v['color']}).toList(),
      'monthlyPerformance': List.generate(6, (i) {
        const names = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'];
        return {'name': names[i], 'tasks': 20 + i * 4, 'projects': 2 + (i % 3), 'm': i + 4};
      }),
      'recentActivity': [
        {'action': 'Approved timesheet for Sneha Reddy', 'created_at': _iso(0), 'user_name': 'Aarav Sharma'},
        {'action': 'Created project "Grovia Growth Campaign"', 'created_at': _iso(-2), 'user_name': 'Ishita Verma'},
        {'action': 'Completed milestone "Kickoff"', 'created_at': _iso(-3), 'user_name': 'Karan Mehta'},
        {'action': 'Uploaded document "API-Spec-v2.pdf"', 'created_at': _iso(-15), 'user_name': 'Karan Mehta'},
      ],
      'announcements': [
        {'id': 1, 'type': 'general', 'title': 'All-hands next Friday', 'content': 'Quarterly all-hands at 4pm — join from the Team Chat global channel.'},
      ],
    };

// ── Invoices ────────────────────────────────────────────────────────────
List<Map<String, dynamic>> invoicesJson() => ventures.map((v) {
      final id = v['id'] as int;
      return {
        'id': 'INV-$id-2026-09',
        'invoice_number': 'INV-$id-2026-09',
        'venture_id': id,
        'venture_name': v['name'],
        'month': '2026-09',
        'total_hours': 160.0 + id * 8,
        'total_amount': 12800.0 + id * 900,
        'status': id.isEven ? 'paid' : 'pending',
        'issue_date': _iso(-5).split('T').first,
      };
    }).toList();

Map<String, dynamic> invoiceDetailJson(String id) {
  final ventureId = int.tryParse(id.split('-').length > 1 ? id.split('-')[1] : '1') ?? 1;
  final v = _venture(ventureId);
  return {
    'id': id,
    'invoice_number': id,
    'month': '2026-09',
    'venture_name': v['name'],
    'items': [
      {'id': 1, 'date': _iso(-8).split('T').first, 'developer': 'Sneha Reddy', 'project': _projectName(ventureId), 'task': 'Redesign onboarding flow', 'hours': 8.0, 'amount': 640.0},
      {'id': 2, 'date': _iso(-7).split('T').first, 'developer': 'Aditya Rao', 'project': _projectName(ventureId), 'task': null, 'hours': 6.5, 'amount': 520.0},
    ],
    'total_hours': 14.5,
    'total_amount': 1160.0,
    'billing_rate': 80.0,
    'issue_date': _iso(-5).split('T').first,
    'due_date': _iso(10).split('T').first,
  };
}

// ── Role management / access control / db explorer ─────────────────────
List<Map<String, dynamic>> venturesRolesJson() => ventures;

List<Map<String, dynamic>> rolesJson() => [
      {
        'id': 1, 'venture_id': 1, 'venture_name': 'Dropwing Design Studio', 'venture_color': '#8B5CF6',
        'role_name': 'Design Lead', 'role_key': 'design_lead', 'description': 'Owns creative direction for Dropwing projects.',
        'color': '#8B5CF6', 'icon': '🎨', 'base_level': 5,
        'permissions': const {'projects.manage': true, 'documents.upload': true, 'tasks.assign': true},
        'is_active': true, 'sort_order': 1, 'created_by_name': 'Aarav Sharma', 'assigned_users_count': 2,
        'assignedUsers': [
          {'id': 7, 'full_name': 'Sneha Reddy', 'email': 'st@dropwing.in', 'access_level': 7, 'level_name': 'Staff', 'venture_name': 'Dropwing Design Studio'},
        ],
      },
      {
        'id': 2, 'venture_id': 2, 'venture_name': 'Fenixa Solutions', 'venture_color': '#06B6D4',
        'role_name': 'Payments Engineer', 'role_key': 'payments_engineer', 'description': 'Owns the payments platform on-call rotation.',
        'color': '#06B6D4', 'icon': '💳', 'base_level': 6,
        'permissions': const {'tasks.assign': true, 'projects.view': true},
        'is_active': true, 'sort_order': 2, 'created_by_name': 'Aarav Sharma', 'assigned_users_count': 1,
        'assignedUsers': [
          {'id': 10, 'full_name': 'Aditya Rao', 'email': 'st@fenixa.com', 'access_level': 7, 'level_name': 'Staff', 'venture_name': 'Fenixa Solutions'},
        ],
      },
    ];

List<Map<String, dynamic>> assignableTeamMembersJson() => people
    .map((p) => {
          'id': p['id'],
          'full_name': p['name'],
          'email': p['email'],
          'access_level': p['level'],
          'department': p['dept'],
          'designation': p['desig'],
          'level_name': p['levelName'],
          'venture_name': p['ventureId'] != null ? _venture(p['ventureId'] as int)['name'] : null,
          'venture_color': p['ventureId'] != null ? _venture(p['ventureId'] as int)['color'] : null,
          'assigned_role_ids': p['id'] == 7 ? '1' : (p['id'] == 10 ? '2' : ''),
          'assigned_role_names': p['id'] == 7 ? 'Design Lead' : (p['id'] == 10 ? 'Payments Engineer' : ''),
        })
    .toList();

const _permissionKeys = [
  'dashboard.view', 'projects.view', 'projects.manage', 'tasks.view', 'tasks.assign',
  'documents.view', 'documents.upload', 'invoices.view', 'budget.view', 'users.manage',
  'roles.manage', 'reports.view', 'database.access',
];

List<Map<String, dynamic>> accessControlJson() => const [
      {'levelNumber': 1, 'levelName': 'Super Admin', 'description': 'Full system access.'},
      {'levelNumber': 2, 'levelName': 'Managing Director', 'description': 'Strategic oversight across all ventures.'},
      {'levelNumber': 3, 'levelName': 'Admin', 'description': 'Administrative access to assigned venture.'},
      {'levelNumber': 4, 'levelName': 'CXO', 'description': 'Cross-departmental visibility.'},
      {'levelNumber': 5, 'levelName': 'Manager', 'description': 'Team management and reporting.'},
      {'levelNumber': 6, 'levelName': 'Executive Staff', 'description': 'Expanded task access.'},
      {'levelNumber': 7, 'levelName': 'Staff', 'description': 'Standard employee access.'},
      {'levelNumber': 8, 'levelName': 'Intern', 'description': 'Limited internship access.'},
      {'levelNumber': 9, 'levelName': 'Client', 'description': 'External client portal access.'},
    ].map((lvl) {
      final level = lvl['levelNumber'] as int;
      return {
        'level_number': level,
        'level_name': lvl['levelName'],
        'description': lvl['description'],
        'permissions': {for (final k in _permissionKeys) k: level <= 5},
      };
    }).toList();

List<String> dbTablesJson() => const [
      'users', 'ventures', 'access_levels', 'projects', 'tasks', 'task_assignees',
      'timesheets', 'documents', 'messages', 'notifications', 'audit_logs',
      'okrs', 'key_results', 'strategic_risks', 'venture_roles', 'announcements',
    ];

Map<String, dynamic> dbTablePreviewJson(String name) {
  if (name == 'ventures') {
    return {
      'columns': const [
        {'Field': 'id', 'Type': 'integer'}, {'Field': 'name', 'Type': 'character varying'},
        {'Field': 'slug', 'Type': 'character varying'}, {'Field': 'primary_color', 'Type': 'character varying'},
      ],
      'rows': ventures.map((v) => {'id': v['id'], 'name': v['name'], 'slug': v['slug'], 'primary_color': v['color']}).toList(),
      'totalCount': ventures.length,
    };
  }
  return {
    'columns': const [
      {'Field': 'id', 'Type': 'integer'}, {'Field': 'full_name', 'Type': 'character varying'}, {'Field': 'access_level', 'Type': 'integer'},
    ],
    'rows': teamMembersJson().map((u) => {'id': u['id'], 'full_name': u['full_name'], 'access_level': u['access_level']}).toList(),
    'totalCount': teamMembersJson().length,
  };
}

// ── Chat ────────────────────────────────────────────────────────────────
List<Map<String, dynamic>> chatRoomsJson() => [
      {'id': 'global', 'name': 'Global HQ', 'type': 'venture', 'ventureId': null, 'isOnline': true, 'unreadCount': 2, 'avatar': null, 'lastMessageTime': _iso(0)},
      ...ventures.map((v) => {
            'id': 'venture_${v['id']}', 'name': v['name'], 'type': 'venture', 'ventureId': v['id'],
            'isOnline': true, 'unreadCount': 0, 'avatar': null, 'lastMessageTime': _iso(-1),
          }),
      {'id': 'dm_2', 'name': 'Ishita Verma', 'type': 'dm', 'ventureId': null, 'isOnline': true, 'unreadCount': 1, 'avatar': null, 'lastMessageTime': _iso(0)},
    ];

List<Map<String, dynamic>> chatMessagesJson(String roomId) => [
      {'id': 1, 'sender_id': 2, 'sender_name': 'Ishita Verma', 'sender_avatar': '', 'content': 'Morning! Q3 board deck is in Documents if anyone wants a look before Friday.', 'created_at': _iso(0), 'room_id': roomId, 'is_read': true},
      {'id': 2, 'sender_id': 1, 'sender_name': 'Aarav Sharma', 'sender_avatar': '', 'content': 'On it — will review this afternoon.', 'created_at': _iso(0), 'room_id': roomId, 'is_read': true},
    ];
