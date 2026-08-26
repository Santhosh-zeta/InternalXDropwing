import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../../../core/theme/nebula_colors.dart';

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
              title: 'Learning',
              icon: LucideIcons.graduationCap,
              color: Colors.purple,
              items: [
                _WorkspaceItem(
                  title: 'Learning Hub',
                  icon: LucideIcons.bookOpen,
                  route: '/learning',
                ),
                _WorkspaceItem(
                  title: 'Resources',
                  icon: LucideIcons.library,
                  route: '/learning',
                ),
                _WorkspaceItem(
                  title: 'Checklists',
                  icon: LucideIcons.listChecks,
                  route: '/learning',
                ),
              ],
            ),
            const SizedBox(height: 20),
            _buildSection(
              context,
              title: 'Documents',
              icon: Icons.folder_open_outlined,
              color: Colors.blue,
              items: [
                _WorkspaceItem(
                  title: 'All Files',
                  icon: LucideIcons.files,
                  route: '/documents',
                ),
                _WorkspaceItem(
                  title: 'Upload',
                  icon: LucideIcons.upload,
                  route: '/documents',
                ),
                _WorkspaceItem(
                  title: 'Shared',
                  icon: LucideIcons.share2,
                  route: '/documents',
                ),
              ],
            ),
            const SizedBox(height: 20),
            _buildSection(
              context,
              title: 'Strategy',
              icon: LucideIcons.lightbulb,
              color: Colors.orange,
              items: [
                _WorkspaceItem(
                  title: 'OKRs',
                  icon: LucideIcons.target,
                  route: '/strategy',
                  comingSoon: false,
                ),
                _WorkspaceItem(
                  title: 'KPIs',
                  icon: LucideIcons.trendingUp,
                  route: '/kpis',
                  comingSoon: false,
                ),
                _WorkspaceItem(
                  title: 'Risks',
                  icon: LucideIcons.alertTriangle,
                  route: '/strategy',
                  comingSoon: false,
                ),
              ],
            ),
            const SizedBox(height: 20),
            _buildSection(
              context,
              title: 'Analytics & Management',
              icon: LucideIcons.pieChart,
              color: Colors.teal,
              items: [
                _WorkspaceItem(
                  title: 'Timesheets',
                  icon: LucideIcons.clock,
                  route: '/timesheets',
                  comingSoon: false,
                ),
                _WorkspaceItem(
                  title: 'Audit Logs',
                  icon: LucideIcons.shield,
                  route: '/audit',
                  comingSoon: false,
                ),
                _WorkspaceItem(
                  title: 'Team Mgmt',
                  icon: LucideIcons.users,
                  route: '/team',
                  comingSoon: false,
                ),
                _WorkspaceItem(
                  title: 'Budget',
                  icon: LucideIcons.wallet,
                  route: '/budget',
                  comingSoon: false,
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
    final isAvailable = item.route != null;

    return InkWell(
      onTap: () {
        if (isAvailable && item.route != null) {
          context.push(item.route!);
        } else if (item.comingSoon) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('${item.title} — Coming Soon'),
              behavior: SnackBarBehavior.floating,
              backgroundColor: NebulaColors.surfaceCard,
            ),
          );
        }
      },
      borderRadius: BorderRadius.circular(12),
      child: Container(
        decoration: BoxDecoration(
          color: NebulaColors.background,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isAvailable
                ? sectionColor.withOpacity(0.3)
                : NebulaColors.surface,
          ),
        ),
        padding: const EdgeInsets.all(12),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(item.icon,
                color: isAvailable
                    ? sectionColor.withOpacity(0.9)
                    : NebulaColors.textSecondary.withOpacity(0.4),
                size: 28),
            const SizedBox(height: 12),
            Text(
              item.title,
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: isAvailable
                    ? NebulaColors.textPrimary
                    : NebulaColors.textSecondary.withOpacity(0.5),
              ),
            ),
            if (item.comingSoon) ...[
              const SizedBox(height: 4),
              const Text(
                'Soon',
                style: TextStyle(
                    fontSize: 9,
                    color: NebulaColors.textSecondary,
                    fontStyle: FontStyle.italic),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _WorkspaceItem {
  final String title;
  final IconData icon;
  final String? route;
  final bool comingSoon;

  _WorkspaceItem({
    required this.title,
    required this.icon,
    this.route,
    this.comingSoon = false,
  });
}
