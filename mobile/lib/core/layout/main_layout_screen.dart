import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../features/auth/presentation/providers/auth_provider.dart';
import '../../features/notifications/presentation/providers/notifications_provider.dart';
import '../../features/auth/data/models/auth_models.dart';
import '../theme/nebula_colors.dart';

class MainLayoutScreen extends ConsumerWidget {
  final StatefulNavigationShell navigationShell;

  const MainLayoutScreen({
    super.key,
    required this.navigationShell,
  });

  void _goBranch(int index) {
    navigationShell.goBranch(
      index,
      initialLocation: index == navigationShell.currentIndex,
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authProvider);
    final unreadCount = ref.watch(unreadCountProvider);

    return Scaffold(
      drawer: authState.maybeWhen(
        authenticated: (user) => _DGOSDrawer(
          user: user,
          unreadCount: unreadCount,
        ),
        orElse: () => null,
      ),
      body: navigationShell,
      bottomNavigationBar: NavigationBarTheme(
        data: NavigationBarThemeData(
          labelTextStyle: WidgetStateProperty.resolveWith((states) {
            if (states.contains(WidgetState.selected)) {
              return const TextStyle(
                  color: NebulaColors.primary,
                  fontSize: 12,
                  fontWeight: FontWeight.bold);
            }
            return const TextStyle(
                color: NebulaColors.textSecondary, fontSize: 12);
          }),
        ),
        child: NavigationBar(
          backgroundColor: NebulaColors.background,
          indicatorColor: NebulaColors.primary.withOpacity(0.15),
          selectedIndex: navigationShell.currentIndex,
          onDestinationSelected: _goBranch,
          destinations: [
            const NavigationDestination(
                icon: Icon(LucideIcons.home,
                    color: NebulaColors.textSecondary),
                selectedIcon:
                    Icon(LucideIcons.home, color: NebulaColors.primary),
                label: 'Home'),
            const NavigationDestination(
                icon: Icon(LucideIcons.checkSquare,
                    color: NebulaColors.textSecondary),
                selectedIcon: Icon(LucideIcons.checkSquare,
                    color: NebulaColors.primary),
                label: 'Tasks'),
            const NavigationDestination(
                icon: Icon(LucideIcons.folder,
                    color: NebulaColors.textSecondary),
                selectedIcon:
                    Icon(LucideIcons.folder, color: NebulaColors.primary),
                label: 'Projects'),
            const NavigationDestination(
                icon: Icon(LucideIcons.briefcase,
                    color: NebulaColors.textSecondary),
                selectedIcon: Icon(LucideIcons.briefcase,
                    color: NebulaColors.primary),
                label: 'Workspace'),
            NavigationDestination(
                icon: _NotificationIcon(count: unreadCount, selected: false),
                selectedIcon:
                    _NotificationIcon(count: unreadCount, selected: true),
                label: 'Alerts'),
          ],
        ),
      ),
    );
  }
}

class _NotificationIcon extends StatelessWidget {
  final int count;
  final bool selected;

  const _NotificationIcon({required this.count, required this.selected});

  @override
  Widget build(BuildContext context) {
    return Stack(
      clipBehavior: Clip.none,
      children: [
        Icon(
          LucideIcons.bell,
          color: selected ? NebulaColors.primary : NebulaColors.textSecondary,
        ),
        if (count > 0)
          Positioned(
            right: -6,
            top: -4,
            child: Container(
              padding: const EdgeInsets.all(3),
              decoration: const BoxDecoration(
                color: NebulaColors.critical,
                shape: BoxShape.circle,
              ),
              constraints: const BoxConstraints(minWidth: 16, minHeight: 16),
              child: Text(
                count > 99 ? '99+' : '$count',
                style: const TextStyle(
                    color: Colors.white,
                    fontSize: 8,
                    fontWeight: FontWeight.bold),
                textAlign: TextAlign.center,
              ),
            ),
          ),
      ],
    );
  }
}

class _DGOSDrawer extends ConsumerWidget {
  final User user;
  final int unreadCount;

  const _DGOSDrawer({
    required this.user,
    required this.unreadCount,
  });

  bool _canSee(String feature) {
    final role = user.levelName.toLowerCase();

    if (role.contains('super admin')) return true;

    final isMD = role.contains('managing director') || role.contains('md');
    final isAdmin = role.contains('admin');
    final isCXO = role.contains('cxo') || role.contains('director');
    final isManager = role.contains('manager') || role.contains('head');
    final isStaff = role.contains('staff') || role.contains('employee');
    final isIntern = role.contains('intern');

    // Administration
    if (['user management', 'venture management', 'access control', 'audit logs'].contains(feature)) {
      return isAdmin; // MD doesn't see System Settings as per spec
    }

    if (isMD) return true;

    // Strategy
    if (['okrs', 'kpis', 'risks', 'analytics'].contains(feature)) {
      return isAdmin || isCXO;
    }

    // Organization
    if (['ventures', 'employees'].contains(feature)) {
      return isAdmin || isCXO;
    }
    if (feature == 'teams') {
      return isManager || isAdmin || isCXO;
    }

    // Execution
    if (feature == 'approvals') {
      return isManager || isAdmin || isCXO;
    }
    if (feature == 'timesheets') {
      return isStaff || isManager || isAdmin || isCXO;
    }
    if (feature == 'projects') {
      return isStaff || isManager || isAdmin || isCXO;
    }

    // Knowledge
    if (feature == 'resources') {
      return isStaff || isManager || isAdmin || isCXO;
    }

    // Command Center & Basics
    if (feature == 'calendar') {
      return isStaff || isManager || isAdmin || isCXO;
    }

    // Intern / Staff / Manager basics
    if (['home', 'tasks', 'learning hub', 'documents', 'profile', 'settings', 'help', 'logout', 'notifications'].contains(feature)) {
      return true; // Everyone sees these
    }

    return false;
  }

  Widget _buildSectionHeader(String title) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title.toUpperCase(),
            style: const TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.bold,
              color: NebulaColors.textSecondary,
              letterSpacing: 1.2,
            ),
          ),
          const SizedBox(height: 8),
          const Divider(height: 1, color: NebulaColors.surface),
          const SizedBox(height: 4),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Drawer(
      backgroundColor: NebulaColors.background,
      child: Column(
        children: [
          Container(
            padding: EdgeInsets.only(
              top: MediaQuery.of(context).padding.top + 16,
              left: 16,
              right: 16,
              bottom: 16,
            ),
            decoration: const BoxDecoration(
              color: NebulaColors.surfaceCard,
              border: Border(bottom: BorderSide(color: NebulaColors.surface, width: 1)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Row(
                  children: [
                    Icon(LucideIcons.hexagon, color: NebulaColors.primary, size: 24),
                    SizedBox(width: 8),
                    Text('DGOS',
                        style: TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.bold,
                            color: NebulaColors.textPrimary)),
                  ],
                ),
                const SizedBox(height: 20),
                Row(
                  children: [
                    CircleAvatar(
                      radius: 24,
                      backgroundColor: NebulaColors.primary.withOpacity(0.1),
                      backgroundImage: user.avatarUrl != null ? NetworkImage(user.avatarUrl!) : null,
                      child: user.avatarUrl == null
                          ? Text(
                              user.fullName.isNotEmpty ? user.fullName[0].toUpperCase() : '?',
                              style: const TextStyle(
                                  color: NebulaColors.primary,
                                  fontSize: 20,
                                  fontWeight: FontWeight.bold),
                            )
                          : null,
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            user.fullName,
                            style: const TextStyle(
                                fontWeight: FontWeight.bold,
                                fontSize: 15,
                                color: NebulaColors.textPrimary),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                          Text(
                            user.levelName,
                            style: const TextStyle(
                                fontSize: 12, color: NebulaColors.textSecondary),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                          if (user.venture?.name != null)
                            Text(
                              user.venture!.name,
                              style: const TextStyle(
                                  fontSize: 11,
                                  color: NebulaColors.primary,
                                  fontWeight: FontWeight.w600),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                        ],
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          Expanded(
            child: ListView(
              padding: EdgeInsets.zero,
              children: [
                _buildSectionHeader('Command Center'),
                if (_canSee('home'))
                  _DrawerTile(
                      title: 'Home',
                      icon: LucideIcons.home,
                      onTap: () => context.go('/home')),
                if (_canSee('notifications'))
                  _DrawerTileBadge(
                      title: 'Notifications',
                      icon: LucideIcons.bell,
                      badge: unreadCount,
                      onTap: () => context.push('/notifications')),
                if (_canSee('calendar'))
                  _DrawerTile(
                      title: 'Calendar',
                      icon: LucideIcons.calendar,
                      onTap: () {}),

                _buildSectionHeader('Execution'),
                if (_canSee('tasks'))
                  _DrawerTile(
                      title: 'Tasks',
                      icon: LucideIcons.checkSquare,
                      onTap: () => context.go('/tasks')),
                if (_canSee('projects'))
                  _DrawerTile(
                      title: 'Projects',
                      icon: LucideIcons.folder,
                      onTap: () => context.go('/projects')),
                if (_canSee('approvals'))
                  _DrawerTile(
                      title: 'Approvals',
                      icon: LucideIcons.clipboardCheck,
                      onTap: () {}),
                if (_canSee('timesheets'))
                  _DrawerTile(
                      title: 'Timesheets',
                      icon: LucideIcons.clock,
                      onTap: () {}),

                _buildSectionHeader('Knowledge'),
                if (_canSee('learning hub'))
                  _DrawerTile(
                      title: 'Learning Hub',
                      icon: LucideIcons.graduationCap,
                      onTap: () => context.push('/learning')),
                if (_canSee('documents'))
                  _DrawerTile(
                      title: 'Documents',
                      icon: LucideIcons.fileText,
                      onTap: () => context.push('/documents')),
                if (_canSee('resources'))
                  _DrawerTile(
                      title: 'Resources',
                      icon: LucideIcons.bookOpen,
                      onTap: () {}),

                if (_canSee('okrs') ||
                    _canSee('kpis') ||
                    _canSee('risks') ||
                    _canSee('analytics'))
                  _buildSectionHeader('Strategy'),
                if (_canSee('okrs'))
                  _DrawerTile(
                      title: 'OKRs',
                      icon: LucideIcons.target,
                      onTap: () {}),
                if (_canSee('kpis'))
                  _DrawerTile(
                      title: 'KPIs',
                      icon: LucideIcons.trendingUp,
                      onTap: () {}),
                if (_canSee('risks'))
                  _DrawerTile(
                      title: 'Risks',
                      icon: LucideIcons.alertTriangle,
                      onTap: () {}),
                if (_canSee('analytics'))
                  _DrawerTile(
                      title: 'Analytics',
                      icon: LucideIcons.barChart2,
                      onTap: () {}),

                if (_canSee('ventures') ||
                    _canSee('teams') ||
                    _canSee('employees'))
                  _buildSectionHeader('Organization'),
                if (_canSee('ventures'))
                  _DrawerTile(
                      title: 'Ventures',
                      icon: LucideIcons.building,
                      onTap: () {}),
                if (_canSee('teams'))
                  _DrawerTile(
                      title: 'Teams',
                      icon: LucideIcons.users,
                      onTap: () {}),
                if (_canSee('employees'))
                  _DrawerTile(
                      title: 'Employees',
                      icon: LucideIcons.userPlus,
                      onTap: () {}),

                _buildSectionHeader('Personal'),
                if (_canSee('profile'))
                  _DrawerTile(
                      title: 'Profile',
                      icon: LucideIcons.user,
                      onTap: () => context.go('/profile')),
                if (_canSee('settings'))
                  _DrawerTile(
                      title: 'Settings',
                      icon: LucideIcons.settings,
                      onTap: () {}),
                if (_canSee('help'))
                  _DrawerTile(
                      title: 'Help',
                      icon: LucideIcons.helpCircle,
                      onTap: () {}),
                if (_canSee('logout'))
                  _DrawerTile(
                    title: 'Logout',
                    icon: LucideIcons.logOut,
                    textColor: NebulaColors.critical,
                    iconColor: NebulaColors.critical,
                    onTap: () {
                      ref.read(authProvider.notifier).logout();
                    },
                  ),
                const SizedBox(height: 24),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _DrawerTile extends StatelessWidget {
  final String title;
  final IconData icon;
  final VoidCallback onTap;
  final Color? textColor;
  final Color? iconColor;

  const _DrawerTile({
    required this.title,
    required this.icon,
    required this.onTap,
    this.textColor,
    this.iconColor,
  });

  @override
  Widget build(BuildContext context) {
    return ListTile(
      leading: Icon(icon, color: iconColor ?? NebulaColors.textSecondary, size: 20),
      title: Text(title,
          style: TextStyle(
              fontWeight: FontWeight.w500,
              fontSize: 14,
              color: textColor ?? NebulaColors.textPrimary)),
      contentPadding: const EdgeInsets.symmetric(horizontal: 24),
      dense: true,
      onTap: () {
        Scaffold.of(context).closeDrawer();
        onTap();
      },
    );
  }
}

class _DrawerTileBadge extends StatelessWidget {
  final String title;
  final IconData icon;
  final int badge;
  final VoidCallback onTap;

  const _DrawerTileBadge({
    required this.title,
    required this.icon,
    required this.badge,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return ListTile(
      leading: Icon(icon, color: NebulaColors.textSecondary, size: 20),
      title: Text(title,
          style: const TextStyle(
              fontWeight: FontWeight.w500,
              fontSize: 14,
              color: NebulaColors.textPrimary)),
      contentPadding: const EdgeInsets.symmetric(horizontal: 24),
      dense: true,
      trailing: badge > 0
          ? Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
              decoration: BoxDecoration(
                color: NebulaColors.critical,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Text(
                '$badge',
                style: const TextStyle(
                    color: Colors.white,
                    fontSize: 11,
                    fontWeight: FontWeight.bold),
              ),
            )
          : null,
      onTap: () {
        Scaffold.of(context).closeDrawer();
        onTap();
      },
    );
  }
}
