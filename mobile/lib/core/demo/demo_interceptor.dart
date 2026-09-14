import 'package:dio/dio.dart';
import 'demo_data.dart' as demo;

/// Answers every API call with canned data instead of hitting the network.
/// See `demo_mode.dart` for what this is and how to remove it.
///
/// Registered at the front of `dioProvider`'s interceptor chain (see
/// `core/api/api_client.dart`) so it runs before anything else and resolves
/// the request immediately — no real network attempt, no timeout, no auth
/// header needed.
class DemoInterceptor extends Interceptor {
  static final List<_Route> _routes = _buildRoutes();

  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    final method = options.method.toUpperCase();
    final path = options.path.split('?').first;

    for (final route in _routes) {
      if (route.method != method) continue;
      final match = route.pattern.firstMatch(path);
      if (match == null) continue;
      final params = <String>[
        for (var i = 1; i <= match.groupCount; i++) match.group(i) ?? '',
      ];
      final body = route.build(params, options);
      handler.resolve(_ok(body));
      return;
    }

    // No explicit mock for this endpoint — degrade gracefully rather than
    // timing out against a server that doesn't exist. A GET becomes an
    // empty (but validly-shaped) list; anything else reports a no-op
    // success, since nothing in demo mode is actually persisted anyway.
    final fallback = method == 'GET'
        ? <String, dynamic>{'success': true, 'data': <dynamic>[]}
        : <String, dynamic>{'success': true, 'message': 'Demo mode — not persisted.', 'data': <String, dynamic>{}};
    handler.resolve(_ok(fallback));
  }

  Response<dynamic> _ok(dynamic data) => Response<dynamic>(
        requestOptions: RequestOptions(path: ''),
        statusCode: 200,
        data: data,
      );
}

class _Route {
  final String method;
  final RegExp pattern;
  final dynamic Function(List<String> params, RequestOptions options) build;

  _Route(this.method, String template, this.build) : pattern = _compile(template);

  static RegExp _compile(String template) {
    final segments = template.split('/').map((seg) {
      if (seg.startsWith(':')) return '([^/]+)';
      return RegExp.escape(seg);
    });
    return RegExp('^${segments.join('/')}\$');
  }
}

Map<String, dynamic> _envelope(dynamic data) => {'success': true, 'data': data};

List<_Route> _buildRoutes() {
  return [
    // ── Auth (kept for safety; auth is bypassed at the provider level so
    // these normally never fire — see auth_provider.dart) ────────────────
    _Route('GET', '/team-members/me', (_, __) => _envelope(demo.demoUserJson())),
    _Route('GET', '/auth/me', (_, __) => _envelope(demo.demoUserJson())),

    // ── Home / platform metrics ──────────────────────────────────────────
    _Route('GET', '/platform-metrics', (_, __) => _envelope(demo.platformMetricsJson())),

    // ── Tasks ─────────────────────────────────────────────────────────────
    _Route('GET', '/tasks', (_, __) => _envelope(demo.tasksJson())),
    _Route('GET', '/tasks/:id', (p, __) {
      final id = int.tryParse(p[0]) ?? 1;
      final tasks = demo.tasksJson();
      return _envelope(tasks.firstWhere((t) => t['id'] == id, orElse: () => tasks.first));
    }),
    _Route('POST', '/tasks', (_, o) => _envelope({...demo.tasksJson().first, 'id': 9001, 'title': (o.data is Map ? o.data['title'] : null) ?? 'New demo task'})),
    _Route('PUT', '/tasks/:id', (p, o) {
      final id = int.tryParse(p[0]) ?? 1;
      final tasks = demo.tasksJson();
      final base = tasks.firstWhere((t) => t['id'] == id, orElse: () => tasks.first);
      final updates = o.data is Map ? Map<String, dynamic>.from(o.data as Map) : <String, dynamic>{};
      return _envelope({...base, ...updates});
    }),
    _Route('DELETE', '/tasks/:id', (_, __) => {'success': true, 'message': 'Task deleted (demo mode).'}),

    // ── Projects ──────────────────────────────────────────────────────────
    _Route('GET', '/projects', (_, __) => _envelope(demo.projectsJson())),
    _Route('GET', '/projects/:id', (p, __) {
      final id = int.tryParse(p[0]) ?? 1;
      final projects = demo.projectsJson();
      return _envelope(projects.firstWhere((pr) => pr['id'] == id, orElse: () => projects.first));
    }),
    _Route('POST', '/projects', (_, __) => _envelope({'id': 9002})),
    _Route('PUT', '/projects/:id', (p, o) {
      final id = int.tryParse(p[0]) ?? 1;
      final projects = demo.projectsJson();
      final base = projects.firstWhere((pr) => pr['id'] == id, orElse: () => projects.first);
      final updates = o.data is Map ? Map<String, dynamic>.from(o.data as Map) : <String, dynamic>{};
      return _envelope({...base, ...updates});
    }),
    _Route('DELETE', '/projects/:id', (_, __) => {'success': true, 'message': 'Project deleted (demo mode).'}),

    // ── Timesheets ────────────────────────────────────────────────────────
    _Route('GET', '/timesheets/financials', (_, __) => _envelope({
          'total_hours': 240.5,
          'approved_hours': 180.0,
          'pending_hours': 42.5,
          'total_entries': demo.timesheetsJson().length,
        })),
    _Route('GET', '/timesheets', (_, __) => _envelope(demo.timesheetsJson())),
    _Route('POST', '/timesheets', (_, o) => _envelope({...demo.timesheetsJson().first, 'id': 9003})),
    _Route('PATCH', '/timesheets/:id/approve', (p, o) {
      final id = int.tryParse(p[0]) ?? 1;
      final status = (o.data is Map ? o.data['status'] : null) ?? 'approved';
      final entries = demo.timesheetsJson();
      final base = entries.firstWhere((t) => t['id'] == id, orElse: () => entries.first);
      return _envelope({...base, 'status': status});
    }),

    // ── Notifications (its own envelope shape: data + unreadCount) ──────
    _Route('GET', '/notifications', (_, __) {
      final list = demo.notificationsJson();
      return {
        'success': true,
        'data': list,
        'unreadCount': list.where((n) => n['is_read'] == false).length,
      };
    }),
    _Route('PATCH', '/notifications/:id/read', (_, __) => {'success': true}),
    _Route('PATCH', '/notifications/read-all', (_, __) => {'success': true}),
    _Route('DELETE', '/notifications/clear', (_, __) => {'success': true}),

    // ── Documents ─────────────────────────────────────────────────────────
    _Route('GET', '/documents', (_, __) => _envelope(demo.documentsJson())),
    _Route('POST', '/documents', (_, __) => _envelope({...demo.documentsJson().first, 'id': 9004, 'original_name': 'uploaded-file.pdf'})),
    _Route('DELETE', '/documents/:id', (_, __) => {'success': true, 'message': 'Document deleted (demo mode).'}),

    // ── Budget ────────────────────────────────────────────────────────────
    _Route('GET', '/budget/summary', (_, __) => _envelope(demo.budgetSummaryJson())),
    _Route('GET', '/budget/expenses', (_, __) => _envelope(demo.budgetExpensesJson())),
    _Route('GET', '/budget/monthly', (_, __) => _envelope(demo.budgetMonthlyJson())),

    // ── KPIs ──────────────────────────────────────────────────────────────
    _Route('GET', '/kpis/hr', (_, __) => _envelope(demo.hrKpisJson())),
    _Route('GET', '/kpis/department', (_, __) => _envelope(demo.deptKpisJson())),

    // ── Strategy ──────────────────────────────────────────────────────────
    _Route('GET', '/strategy', (_, __) => demo.strategyJson()),

    // ── Team (read-only) ─────────────────────────────────────────────────
    _Route('GET', '/team/members', (_, __) => _envelope(demo.teamMembersJson())),
    _Route('PATCH', '/team/members/:userId/level', (_, __) => {'success': true}),
    _Route('DELETE', '/team/members/:userId', (_, __) => {'success': true}),

    // ── Learning Hub ──────────────────────────────────────────────────────
    _Route('GET', '/learning/checklist', (_, __) => _envelope(demo.learningChecklistJson())),
    _Route('GET', '/learning/resources', (_, __) => _envelope(demo.learningResourcesJson())),
    _Route('GET', '/learning/feedback', (_, __) => _envelope(demo.learningFeedbackJson())),
    _Route('PATCH', '/learning/progress/:id', (_, __) => {'success': true}),

    // ── Client Portal ─────────────────────────────────────────────────────
    _Route('GET', '/client-portal/overview', (_, __) => _envelope(demo.clientPortalOverviewJson())),
    _Route('GET', '/client-portal/invoices/:id/pdf-url', (_, __) => _envelope({'pdf_url': null})),

    // ── Chat (REST parts only — the socket connection is real and will
    // simply fail to connect in the background; see demo_mode.dart) ────
    _Route('GET', '/chat/rooms', (_, __) => _envelope(demo.chatRoomsJson())),
    _Route('GET', '/chat/messages', (_, o) => _envelope(demo.chatMessagesJson((o.queryParameters['roomId'] ?? 'global').toString()))),

    // ── Invoices ──────────────────────────────────────────────────────────
    _Route('GET', '/invoices', (_, __) => _envelope(demo.invoicesJson())),
    _Route('GET', '/invoices/:id', (p, __) => _envelope(demo.invoiceDetailJson(p[0]))),

    // ── Reports ───────────────────────────────────────────────────────────
    // (shares `/platform-metrics`, already mocked above)

    // ── User management (admin) ─────────────────────────────────────────
    _Route('GET', '/team-members/ventures', (_, __) => _envelope(demo.venturesRolesJson())),
    _Route('GET', '/team-members/access-levels', (_, __) => _envelope(demo.accessControlJson()
        .map((l) => {'level_number': l['level_number'], 'level_name': l['level_name'], 'description': l['description']})
        .toList())),
    _Route('GET', '/team-members', (_, __) => _envelope(demo.teamMembersJson())),
    _Route('GET', '/team-members/:id', (p, __) {
      final id = int.tryParse(p[0]) ?? 1;
      final user = demo.teamMembersJson().firstWhere((u) => u['id'] == id, orElse: () => demo.teamMembersJson().first);
      return _envelope({
        'user': user,
        'activity': demo.tasksJson().take(3).map((t) => {'id': t['id'], 'title': t['title'], 'status': t['status'], 'priority': t['priority'], 'updated_at': t['updated_at']}).toList(),
      });
    }),
    _Route('POST', '/team-members', (_, __) => _envelope({...demo.teamMembersJson().first, 'id': 9005})),
    _Route('PUT', '/team-members/:id', (p, o) {
      final id = int.tryParse(p[0]) ?? 1;
      final base = demo.teamMembersJson().firstWhere((u) => u['id'] == id, orElse: () => demo.teamMembersJson().first);
      final updates = o.data is Map ? Map<String, dynamic>.from(o.data as Map) : <String, dynamic>{};
      return _envelope({...base, ...updates});
    }),
    _Route('DELETE', '/team-members/:id', (_, __) => {'success': true, 'message': 'User deactivated (demo mode).'}),
    _Route('POST', '/team-members/me/avatar', (_, __) => _envelope({'avatar_url': null})),
    _Route('PUT', '/team-members/me/profile', (_, __) => {'success': true}),
    _Route('PUT', '/team-members/me/password', (_, __) => {'success': true}),

    // ── Role management ───────────────────────────────────────────────────
    _Route('GET', '/role-management/ventures', (_, __) => _envelope(demo.venturesRolesJson())),
    _Route('GET', '/role-management/assign-team-members', (_, __) => _envelope(demo.assignableTeamMembersJson())),
    _Route('GET', '/role-management', (_, __) => _envelope(demo.rolesJson())),
    _Route('GET', '/role-management/:id', (p, __) {
      final id = int.tryParse(p[0]) ?? 1;
      return _envelope(demo.rolesJson().firstWhere((r) => r['id'] == id, orElse: () => demo.rolesJson().first));
    }),
    _Route('POST', '/role-management/:id/duplicate', (_, __) => _envelope({...demo.rolesJson().first, 'id': 9006, 'role_name': '${demo.rolesJson().first['role_name']} (copy)'})),
    _Route('POST', '/role-management/assign', (_, __) => {'success': true}),
    _Route('DELETE', '/role-management/assign', (_, __) => {'success': true}),
    _Route('POST', '/role-management', (_, __) => _envelope({...demo.rolesJson().first, 'id': 9007})),
    _Route('PUT', '/role-management/:id', (p, o) {
      final id = int.tryParse(p[0]) ?? 1;
      final base = demo.rolesJson().firstWhere((r) => r['id'] == id, orElse: () => demo.rolesJson().first);
      final updates = o.data is Map ? Map<String, dynamic>.from(o.data as Map) : <String, dynamic>{};
      return _envelope({...base, ...updates});
    }),
    _Route('DELETE', '/role-management/:id', (_, __) => {'success': true, 'message': 'Role deleted (demo mode).'}),

    // ── Access control (Super Admin) ─────────────────────────────────────
    _Route('GET', '/access-control/2fa-config', (_, __) => {'success': true, 'enable2FA': false}),
    _Route('PUT', '/access-control/2fa-config', (_, __) => {'success': true, 'enable2FA': false}),
    _Route('GET', '/access-control', (_, __) => _envelope(demo.accessControlJson())),
    _Route('PUT', '/access-control/:level', (_, __) => {'success': true, 'message': 'Level 1 cannot be edited.'}),

    // ── Database console (Super Admin) — flat envelope, not `{data: ...}` ─
    _Route('GET', '/database/tables', (_, __) => {'success': true, 'tables': demo.dbTablesJson()}),
    _Route('GET', '/database/table/:name', (p, __) => {'success': true, ...demo.dbTablePreviewJson(p[0])}),
    _Route('POST', '/database/query', (_, o) {
      final query = (o.data is Map ? o.data['query']?.toString() : null) ?? '';
      if (!query.trim().toUpperCase().startsWith('SELECT')) {
        return {'success': false, 'message': 'Only SELECT queries are permitted on this console.'};
      }
      final preview = demo.dbTablePreviewJson('users');
      return {'success': true, 'results': preview['rows'], 'fields': (preview['columns'] as List).map((c) => c['Field']).toList()};
    }),
  ];
}
