import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../features/auth/presentation/providers/auth_provider.dart';

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

    return Scaffold(
      drawer: authState.maybeWhen(
        authenticated: (user) => _DGOSDrawer(
          levelName: user.levelName,
          userName: user.fullName,
          userEmail: user.email,
          avatarUrl: user.avatarUrl,
        ),
        orElse: () => null,
      ),
      body: navigationShell,
      bottomNavigationBar: NavigationBar(
        selectedIndex: navigationShell.currentIndex,
        onDestinationSelected: _goBranch,
        destinations: const [
          NavigationDestination(
              icon: Icon(Icons.home_outlined),
              selectedIcon: Icon(Icons.home),
              label: 'Home'),
          NavigationDestination(
              icon: Icon(Icons.task_outlined),
              selectedIcon: Icon(Icons.task),
              label: 'Tasks'),
          NavigationDestination(
              icon: Icon(Icons.folder_outlined),
              selectedIcon: Icon(Icons.folder),
              label: 'Projects'),
          NavigationDestination(
              icon: Icon(Icons.work_outline),
              selectedIcon: Icon(Icons.work),
              label: 'Workspace'),
          NavigationDestination(
              icon: Icon(Icons.person_outline),
              selectedIcon: Icon(Icons.person),
              label: 'Profile'),
        ],
      ),
    );
  }
}

class _DGOSDrawer extends StatelessWidget {
  final String levelName;
  final String userName;
  final String userEmail;
  final String? avatarUrl;

  const _DGOSDrawer({
    required this.levelName,
    required this.userName,
    required this.userEmail,
    this.avatarUrl,
  });

  bool _canSee(String feature) {
    final role = levelName.toLowerCase();

    if (role.contains('super admin')) return true;

    if (role.contains('managing director')) {
      return [
        'ventures',
        'analytics',
        'strategy',
        'projects',
        'tasks',
        'dashboard'
      ].contains(feature);
    }

    if (role.contains('manager')) {
      return ['projects', 'tasks', 'team', 'reports', 'dashboard']
          .contains(feature);
    }

    if (role.contains('intern')) {
      return ['tasks', 'learning', 'profile', 'dashboard'].contains(feature);
    }

    // Default basic access
    return ['dashboard', 'profile'].contains(feature);
  }

  @override
  Widget build(BuildContext context) {
    return Drawer(
      child: Column(
        children: [
          UserAccountsDrawerHeader(
            accountName: Text(userName,
                style: const TextStyle(fontWeight: FontWeight.bold)),
            accountEmail:
                Text(levelName), // Show role here instead of email for clarity
            currentAccountPicture: CircleAvatar(
              backgroundImage:
                  avatarUrl != null ? NetworkImage(avatarUrl!) : null,
              child: avatarUrl == null ? Text(userName[0].toUpperCase()) : null,
            ),
            decoration: BoxDecoration(
              color: Theme.of(context).primaryColor,
            ),
          ),
          Expanded(
            child: ListView(
              padding: EdgeInsets.zero,
              children: [
                if (_canSee('dashboard'))
                  _DrawerTile(
                      title: 'Dashboard',
                      icon: Icons.dashboard_outlined,
                      onTap: () => context.go('/')),
                if (_canSee('tasks'))
                  _DrawerTile(
                      title: 'Tasks',
                      icon: Icons.task_outlined,
                      onTap: () => context.go('/tasks')),
                if (_canSee('projects'))
                  _DrawerTile(
                      title: 'Projects',
                      icon: Icons.folder_outlined,
                      onTap: () => context.go('/projects')),
                if (_canSee('learning'))
                  _DrawerTile(
                      title: 'Learning Hub',
                      icon: Icons.school_outlined,
                      onTap: () {}),
                if (_canSee('documents'))
                  _DrawerTile(
                      title: 'Documents',
                      icon: Icons.description_outlined,
                      onTap: () {}),
                if (_canSee('notifications'))
                  _DrawerTile(
                      title: 'Notifications',
                      icon: Icons.notifications_outlined,
                      onTap: () {}),
                if (_canSee('analytics') || _canSee('reports'))
                  _DrawerTile(
                      title: 'Analytics',
                      icon: Icons.analytics_outlined,
                      onTap: () {}),
                if (_canSee('strategy'))
                  _DrawerTile(
                      title: 'Strategy',
                      icon: Icons.lightbulb_outline,
                      onTap: () {}),
                if (_canSee('team') || _canSee('users'))
                  _DrawerTile(
                      title: 'Users & Team',
                      icon: Icons.people_outline,
                      onTap: () {}),
                if (_canSee('ventures'))
                  _DrawerTile(
                      title: 'Ventures',
                      icon: Icons.business_outlined,
                      onTap: () {}),
                const Divider(),
                if (_canSee('settings'))
                  _DrawerTile(
                      title: 'Settings',
                      icon: Icons.settings_outlined,
                      onTap: () {}),
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

  const _DrawerTile({
    required this.title,
    required this.icon,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return ListTile(
      leading: Icon(icon, color: Colors.black87),
      title: Text(title, style: const TextStyle(fontWeight: FontWeight.w500)),
      onTap: () {
        Scaffold.of(context).closeDrawer();
        onTap();
      },
    );
  }
}
