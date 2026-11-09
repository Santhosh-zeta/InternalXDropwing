import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../features/auth/data/models/auth_models.dart';
import '../../features/notifications/presentation/providers/notifications_provider.dart';
import '../rbac/permissions.dart';
import '../rbac/rbac_widgets.dart';
import '../theme/nebula_colors.dart';
import '../theme/nebula_spacing.dart';
import '../theme/nebula_typography.dart';
import '../theme/theme_context.dart';
import '../widgets/motion.dart';
import '../widgets/primitives.dart';

/// The app shell: five tabs plus a drawer for everything else.
///
/// Two things were wrong here before. The bottom bar wrapped itself in a local
/// `NavigationBarTheme` and hardcoded a colour on every destination, bypassing
/// the configured `navigationBarTheme` entirely. And the drawer decided what
/// to show by substring-matching the user's level NAME — under which
/// "Managing Director" matched `contains('director')` and "Super Admin"
/// matched `contains('admin')`, so the menu a person saw depended on the
/// spelling of their job title. Both are now gone: the bar inherits the theme,
/// and every entry is gated on a numeric [Permission] mirrored from the
/// backend.
class MainLayoutScreen extends ConsumerWidget {
  const MainLayoutScreen({super.key, required this.navigationShell});

  final StatefulNavigationShell navigationShell;

  void _goBranch(int index) {
    navigationShell.goBranch(
      index,
      initialLocation: index == navigationShell.currentIndex,
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(currentUserProvider);

    return Scaffold(
      drawer: user == null ? null : _AppDrawer(user: user),
      body: navigationShell,
      bottomNavigationBar: NavigationBar(
        selectedIndex: navigationShell.currentIndex,
        onDestinationSelected: _goBranch,
        destinations: const [
          NavigationDestination(
            icon: Icon(LucideIcons.house),
            label: 'Today',
          ),
          NavigationDestination(
            icon: Icon(LucideIcons.squareCheck),
            label: 'Tasks',
          ),
          NavigationDestination(
            icon: Icon(LucideIcons.folder),
            label: 'Projects',
          ),
          NavigationDestination(
            icon: Icon(LucideIcons.layoutGrid),
            label: 'Workspace',
          ),
          NavigationDestination(
            icon: Icon(LucideIcons.user),
            label: 'You',
          ),
        ],
      ),
    );
  }
}

/// A drawer entry. [permission] null means everyone signed in may see it.
class DrawerLink {
  const DrawerLink(this.label, this.icon, this.route, {this.permission});

  final String label;
  final IconData icon;
  final String route;
  final Permission? permission;
}

/// The full navigation map, grouped.
///
/// Ten of these previously had `onTap: () {}` — Timesheets, Resources, OKRs,
/// KPIs, Risks, Analytics, Ventures, Teams, Employees and Help did nothing at
/// all when tapped, several of them despite having a working route.
const drawerSections = <({String title, List<DrawerLink> links})>[
  (
    title: 'Execution',
    links: [
      DrawerLink('Timesheets', LucideIcons.clock, '/timesheets',
          permission: Permission.viewTimesheets),
      DrawerLink('Approvals', LucideIcons.circleCheck, '/approvals',
          permission: Permission.viewApprovals),
      DrawerLink('Calendar', LucideIcons.calendar, '/calendar',
          permission: Permission.viewCalendar),
      DrawerLink('Documents', LucideIcons.fileText, '/documents',
          permission: Permission.viewDocuments),
    ],
  ),
  (
    title: 'Communication',
    links: [
      DrawerLink('Team chat', LucideIcons.messageSquare, '/chat',
          permission: Permission.viewChat),
      DrawerLink('Notifications', LucideIcons.bell, '/notifications'),
    ],
  ),
  (
    title: 'Insight',
    links: [
      DrawerLink('Reports', LucideIcons.chartBar, '/reports',
          permission: Permission.viewReports),
      DrawerLink('KPIs', LucideIcons.target, '/kpis',
          permission: Permission.viewKpis),
      DrawerLink('Strategy', LucideIcons.compass, '/strategy',
          permission: Permission.viewStrategy),
      DrawerLink('Budget', LucideIcons.wallet, '/budget',
          permission: Permission.viewBudget),
      DrawerLink('Invoices', LucideIcons.receipt, '/invoices',
          permission: Permission.viewInvoices),
    ],
  ),
  (
    title: 'Organisation',
    links: [
      DrawerLink('Team', LucideIcons.users, '/team',
          permission: Permission.viewTeam),
      DrawerLink('People', LucideIcons.userCog, '/user-management',
          permission: Permission.viewUsers),
    ],
  ),
  (
    title: 'Platform',
    links: [
      DrawerLink('Audit log', LucideIcons.scrollText, '/audit',
          permission: Permission.viewAudit),
    ],
  ),
  (
    title: 'Personal',
    links: [
      DrawerLink('Client portal', LucideIcons.briefcase, '/client-portal',
          permission: Permission.clientPortal),
      DrawerLink('Learning hub', LucideIcons.graduationCap, '/learning',
          permission: Permission.viewLearning),
      DrawerLink('Settings', LucideIcons.settings, '/settings'),
    ],
  ),
];

class _AppDrawer extends ConsumerWidget {
  const _AppDrawer({required this.user});

  final User user;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final unread = ref.watch(unreadCountProvider);

    return Drawer(
      child: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _DrawerHeader(user: user),
            Expanded(
              child: ListView(
                padding: const EdgeInsets.only(bottom: NebulaSpacing.lg),
                children: [
                  for (final section in drawerSections)
                    ..._section(context, ref, section, unread),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  List<Widget> _section(
    BuildContext context,
    WidgetRef ref,
    ({String title, List<DrawerLink> links}) section,
    int unread,
  ) {
    // Build only the links this user may actually open, then drop the whole
    // section if nothing survives — an empty heading is worse than no heading.
    final visible = section.links
        .where((l) =>
            l.permission == null || Rbac.can(user, l.permission!))
        .toList();
    if (visible.isEmpty) return const [];

    return [
      Padding(
        padding: const EdgeInsets.fromLTRB(
          NebulaSpacing.md,
          NebulaSpacing.md,
          NebulaSpacing.md,
          NebulaSpacing.xs,
        ),
        child: Text(
          section.title.toUpperCase(),
          style: NebulaTypography.monoLabel(color: context.dl.textTertiary),
        ),
      ),
      for (final link in visible)
        _DrawerTile(
          link: link,
          badge: link.route == '/notifications' && unread > 0 ? unread : null,
        ),
    ];
  }
}

class _DrawerTile extends StatelessWidget {
  const _DrawerTile({required this.link, this.badge});

  final DrawerLink link;
  final int? badge;

  @override
  Widget build(BuildContext context) {
    final active = GoRouterState.of(context).uri.path == link.route;
    final color = active ? context.scheme.primary : context.scheme.onSurfaceVariant;

    return PressScale(
      onTap: () {
        Navigator.of(context).pop();
        context.push(link.route);
      },
      child: Container(
        margin: const EdgeInsets.symmetric(
          horizontal: NebulaSpacing.sm,
          vertical: 1,
        ),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 11),
        decoration: BoxDecoration(
          color: active
              ? context.scheme.primary.withValues(alpha: 0.10)
              : Colors.transparent,
          borderRadius: BorderRadius.circular(NebulaSpacing.radiusSm),
        ),
        child: Row(
          children: [
            Icon(link.icon, size: 18, color: color),
            const SizedBox(width: 13),
            Expanded(
              child: Text(
                link.label,
                style: context.text.bodyMedium?.copyWith(
                  color: active ? context.scheme.onSurface : null,
                  fontWeight: active ? FontWeight.w600 : FontWeight.w500,
                ),
              ),
            ),
            if (badge != null) DTag('$badge', tone: DTone.critical),
          ],
        ),
      ),
    );
  }
}

class _DrawerHeader extends StatelessWidget {
  const _DrawerHeader({required this.user});

  final User user;

  @override
  Widget build(BuildContext context) {
    final dl = context.dl;
    final ventureColor = user.venture == null
        ? null
        : NebulaColors.parseHex(
            user.venture!.primaryColor,
            fallback: NebulaColors.forVentureId(user.venture!.id),
          );

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(
        NebulaSpacing.md,
        NebulaSpacing.md,
        NebulaSpacing.md,
        NebulaSpacing.md,
      ),
      decoration: BoxDecoration(
        border: Border(bottom: BorderSide(color: dl.border)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              DAvatar(user.fullName, size: 44, imageUrl: user.avatarUrl),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      user.fullName,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: context.text.titleMedium,
                    ),
                    const SizedBox(height: 2),
                    Text(
                      user.employeeId,
                      style: NebulaTypography.mono(
                        fontSize: 10,
                        color: dl.textTertiary,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: NebulaSpacing.sm),
          Wrap(
            spacing: 6,
            runSpacing: 6,
            children: [
              DTag(user.levelName, tone: DTone.accent),
              if (user.venture != null && ventureColor != null)
                DTag.venture(user.venture!.name, color: ventureColor),
            ],
          ),
        ],
      ),
    );
  }
}
