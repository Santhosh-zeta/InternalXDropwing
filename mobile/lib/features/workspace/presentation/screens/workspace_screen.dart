import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../../../core/theme/nebula_colors.dart';
import '../../../../core/constants/access_levels.dart';
import '../../../auth/presentation/providers/auth_provider.dart';

/// Launcher for everything that does not have its own bottom-nav tab.
///
/// Every tile here must point at a distinct, registered route. If a
/// destination does not exist yet, do not add a tile for it. Every tile also
/// carries the same access check its destination's backend route enforces —
/// showing a tile that will 403 is as much a bug as showing wrong data.
class WorkspaceScreen extends ConsumerWidget {
  const WorkspaceScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authProvider);
    final accessLevel = authState.maybeWhen(
      authenticated: (user) => user.accessLevel,
      orElse: () => AccessLevels.unknown,
    );

    return Scaffold(
      backgroundColor: NebulaColors.background,
      appBar: AppBar(
        title: const Text('Workspace',
            style: TextStyle(
                fontWeight: FontWeight.w600,
                color: NebulaColors.textPrimary)),
        backgroundColor: NebulaColors.surfaceCard,
        elevation: 0,
        centerTitle: false,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Your Hub for Knowledge & Strategy',
              style: TextStyle(fontSize: 16, color: NebulaColors.textSecondary),
            ),
            const SizedBox(height: 24),
            _buildSection(
              context,
              title: 'Communication',
              icon: Icons.forum_outlined,
              color: Colors.cyan,
              accessLevel: accessLevel,
              items: const [
                _WorkspaceItem(
                  title: 'Messages',
                  subtitle: 'Channels & DMs',
                  icon: Icons.chat_bubble_outline,
                  route: '/chat',
                ),
                _WorkspaceItem(
                  title: 'Notifications',
                  subtitle: 'Your alerts',
                  icon: LucideIcons.bell,
                  route: '/notifications',
                ),
                _WorkspaceItem(
                  title: 'Calendar',
                  subtitle: 'Schedule',
                  icon: LucideIcons.calendar,
                  route: '/calendar',
                ),
              ],
            ),
            const SizedBox(height: 20),
            _buildSection(
              context,
              title: 'Knowledge',
              icon: LucideIcons.graduationCap,
              color: Colors.purple,
              accessLevel: accessLevel,
              items: const [
                _WorkspaceItem(
                  title: 'Learning Hub',
                  subtitle: 'Courses',
                  icon: LucideIcons.bookOpen,
                  route: '/learning',
                ),
                _WorkspaceItem(
                  title: 'Documents',
                  subtitle: 'Files',
                  icon: LucideIcons.files,
                  route: '/documents',
                ),
                _WorkspaceItem(
                  title: 'Client Portal',
                  subtitle: 'Shared work',
                  icon: LucideIcons.briefcase,
                  route: '/client-portal',
                  minLevel: AccessLevels.client,
                ),
              ],
            ),
            const SizedBox(height: 20),
            _buildSection(
              context,
              title: 'Strategy',
              icon: LucideIcons.lightbulb,
              color: Colors.orange,
              accessLevel: accessLevel,
              items: const [
                _WorkspaceItem(
                  title: 'Strategy',
                  subtitle: 'OKRs & risks',
                  icon: LucideIcons.target,
                  route: '/strategy',
                  minLevel: AccessLevels.cxo,
                ),
                _WorkspaceItem(
                  title: 'KPIs',
                  subtitle: 'Metrics',
                  icon: LucideIcons.trendingUp,
                  route: '/kpis',
                  minLevel: AccessLevels.cxo,
                ),
                _WorkspaceItem(
                  title: 'Reports',
                  subtitle: 'Cross-venture analytics',
                  icon: LucideIcons.barChart2,
                  route: '/reports',
                  minLevel: AccessLevels.manager,
                ),
                _WorkspaceItem(
                  title: 'Invoices',
                  subtitle: 'Billing',
                  icon: LucideIcons.receipt,
                  route: '/invoices',
                  minLevel: AccessLevels.admin,
                  alsoExactLevel: AccessLevels.client,
                ),
              ],
            ),
            const SizedBox(height: 20),
            _buildSection(
              context,
              title: 'Operations',
              icon: LucideIcons.pieChart,
              color: Colors.teal,
              accessLevel: accessLevel,
              items: const [
                _WorkspaceItem(
                  title: 'Timesheets',
                  subtitle: 'Log time',
                  icon: LucideIcons.clock,
                  route: '/timesheets',
                ),
                _WorkspaceItem(
                  title: 'Approvals',
                  subtitle: 'Requests',
                  icon: LucideIcons.clipboardCheck,
                  route: '/approvals',
                  minLevel: AccessLevels.manager,
                ),
                _WorkspaceItem(
                  title: 'Budget',
                  subtitle: 'Spend',
                  icon: LucideIcons.wallet,
                  route: '/budget',
                  minLevel: AccessLevels.cxo,
                ),
                _WorkspaceItem(
                  title: 'Team',
                  subtitle: 'People',
                  icon: LucideIcons.users,
                  route: '/team',
                ),
                _WorkspaceItem(
                  title: 'Audit Logs',
                  subtitle: 'Activity',
                  icon: LucideIcons.shield,
                  route: '/audit',
                  minLevel: AccessLevels.superAdmin,
                ),
                _WorkspaceItem(
                  title: 'Settings',
                  subtitle: 'Preferences',
                  icon: LucideIcons.settings,
                  route: '/settings',
                ),
              ],
            ),
            const SizedBox(height: 20),
            _buildSection(
              context,
              title: 'Administration',
              icon: LucideIcons.shieldCheck,
              color: Colors.indigo,
              accessLevel: accessLevel,
              items: const [
                _WorkspaceItem(
                  title: 'User Management',
                  subtitle: 'Accounts',
                  icon: LucideIcons.userCog,
                  route: '/user-management',
                  minLevel: AccessLevels.admin,
                ),
                _WorkspaceItem(
                  title: 'Role Management',
                  subtitle: 'Venture roles',
                  icon: LucideIcons.users2,
                  route: '/role-management',
                  // Matches the web dashboard's own nav: Super Admin,
                  // Managing Director and CXO, but not Admin (L3).
                  exactLevels: [
                    AccessLevels.superAdmin,
                    AccessLevels.managingDirector,
                    AccessLevels.cxo,
                  ],
                ),
                _WorkspaceItem(
                  title: 'Access Control',
                  subtitle: 'Permission matrix',
                  icon: LucideIcons.lock,
                  route: '/access-control',
                  minLevel: AccessLevels.superAdmin,
                ),
                _WorkspaceItem(
                  title: 'Database',
                  subtitle: 'Read-only console',
                  icon: LucideIcons.database,
                  route: '/database',
                  minLevel: AccessLevels.superAdmin,
                ),
              ],
            ),
            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }

  Widget _buildSection(
    BuildContext context, {
    required String title,
    required IconData icon,
    required Color color,
    required int accessLevel,
    required List<_WorkspaceItem> items,
  }) {
    final visible = items.where((i) => i.isVisibleFor(accessLevel)).toList();
    if (visible.isEmpty) return const SizedBox.shrink();

    return Container(
      decoration: BoxDecoration(
        color: NebulaColors.surfaceCard,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(icon, color: color, size: 24),
              ),
              const SizedBox(width: 12),
              Text(
                title,
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: NebulaColors.textPrimary,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          GridView.count(
            crossAxisCount: 3,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            mainAxisSpacing: 16,
            crossAxisSpacing: 16,
            childAspectRatio: 0.85,
            children: visible
                .map((item) => _buildItemCard(context, item, color))
                .toList(),
          ),
        ],
      ),
    );
  }

  Widget _buildItemCard(
      BuildContext context, _WorkspaceItem item, Color sectionColor) {
    return InkWell(
      onTap: () => context.push(item.route),
      borderRadius: BorderRadius.circular(12),
      child: Container(
        decoration: BoxDecoration(
          color: NebulaColors.background,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: sectionColor.withValues(alpha: 0.3)),
        ),
        padding: const EdgeInsets.all(10),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(item.icon, color: sectionColor.withValues(alpha: 0.9), size: 26),
            const SizedBox(height: 10),
            Text(
              item.title,
              textAlign: TextAlign.center,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: NebulaColors.textPrimary,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              item.subtitle,
              textAlign: TextAlign.center,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                fontSize: 10,
                color: NebulaColors.textSecondary,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _WorkspaceItem {
  final String title;
  final String subtitle;
  final IconData icon;

  /// Must be a route registered in `lib/core/router/app_router.dart`.
  final String route;

  /// Visible to this level and everyone more privileged (a lower number).
  /// Null means visible to everyone.
  final int? minLevel;

  /// Visible to exactly this one extra level in addition to [minLevel] — for
  /// a feature with a client-facing view of the same route (e.g. Invoices).
  final int? alsoExactLevel;

  /// Visible to exactly these levels, and no others. Takes precedence over
  /// [minLevel]/[alsoExactLevel] when set — for a gate that doesn't follow
  /// the simple "this level and everyone above" shape.
  final List<int>? exactLevels;

  const _WorkspaceItem({
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.route,
    this.minLevel,
    this.alsoExactLevel,
    this.exactLevels,
  });

  bool isVisibleFor(int accessLevel) {
    if (exactLevels != null) return exactLevels!.contains(accessLevel);
    if (minLevel == null) return true;
    if (AccessLevels.hasAtLeast(accessLevel, minLevel!)) return true;
    return alsoExactLevel != null && accessLevel == alsoExactLevel;
  }
}
