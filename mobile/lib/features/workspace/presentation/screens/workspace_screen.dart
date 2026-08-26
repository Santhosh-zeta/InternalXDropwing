import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../../../core/theme/nebula_colors.dart';

/// Launcher for everything that does not have its own bottom-nav tab.
///
/// Every tile here must point at a distinct, registered route. If a
/// destination does not exist yet, do not add a tile for it.
class WorkspaceScreen extends StatelessWidget {
  const WorkspaceScreen({super.key});

  @override
  Widget build(BuildContext context) {
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
                ),
              ],
            ),
            const SizedBox(height: 20),
            _buildSection(
              context,
              title: 'Strategy',
              icon: LucideIcons.lightbulb,
              color: Colors.orange,
              items: const [
                _WorkspaceItem(
                  title: 'Strategy',
                  subtitle: 'OKRs & risks',
                  icon: LucideIcons.target,
                  route: '/strategy',
                ),
                _WorkspaceItem(
                  title: 'KPIs',
                  subtitle: 'Metrics',
                  icon: LucideIcons.trendingUp,
                  route: '/kpis',
                ),
                _WorkspaceItem(
                  title: 'Analytics',
                  subtitle: 'Reports',
                  icon: LucideIcons.barChart2,
                  route: '/analytics',
                ),
              ],
            ),
            const SizedBox(height: 20),
            _buildSection(
              context,
              title: 'Operations',
              icon: LucideIcons.pieChart,
              color: Colors.teal,
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
                ),
                _WorkspaceItem(
                  title: 'Budget',
                  subtitle: 'Spend',
                  icon: LucideIcons.wallet,
                  route: '/budget',
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
                ),
                _WorkspaceItem(
                  title: 'Settings',
                  subtitle: 'Preferences',
                  icon: LucideIcons.settings,
                  route: '/settings',
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
    required List<_WorkspaceItem> items,
  }) {
    return Container(
      decoration: BoxDecoration(
        color: NebulaColors.surfaceCard,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.03),
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
                  color: color.withOpacity(0.1),
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
            children: items
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
          border: Border.all(color: sectionColor.withOpacity(0.3)),
        ),
        padding: const EdgeInsets.all(10),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(item.icon, color: sectionColor.withOpacity(0.9), size: 26),
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

  const _WorkspaceItem({
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.route,
  });
}
