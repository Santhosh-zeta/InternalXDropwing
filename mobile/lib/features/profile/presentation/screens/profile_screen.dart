import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../auth/presentation/providers/auth_provider.dart';

class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authProvider);

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text('Profile',
            style: TextStyle(fontWeight: FontWeight.w600)),
        backgroundColor: Colors.white,
        elevation: 0,
        centerTitle: false,
      ),
      body: authState.maybeWhen(
        authenticated: (user) {
          return SingleChildScrollView(
            child: Column(
              children: [
                // User Card
                Container(
                  color: Colors.white,
                  padding: const EdgeInsets.all(24.0),
                  child: Row(
                    children: [
                      CircleAvatar(
                        radius: 40,
                        backgroundColor:
                            Theme.of(context).primaryColor.withOpacity(0.1),
                        backgroundImage: user.avatarUrl != null
                            ? NetworkImage(user.avatarUrl!)
                            : null,
                        child: user.avatarUrl == null
                            ? Text(
                                user.fullName.isNotEmpty
                                    ? user.fullName[0].toUpperCase()
                                    : '?',
                                style: TextStyle(
                                    fontSize: 24,
                                    color: Theme.of(context).primaryColor,
                                    fontWeight: FontWeight.bold),
                              )
                            : null,
                      ),
                      const SizedBox(width: 20),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              user.fullName,
                              style: const TextStyle(
                                  fontSize: 22,
                                  fontWeight: FontWeight.bold,
                                  color: Colors.black87),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              user.designation ?? user.levelName,
                              style: TextStyle(
                                  fontSize: 14,
                                  color: Theme.of(context).primaryColor,
                                  fontWeight: FontWeight.w500),
                            ),
                            const SizedBox(height: 4),
                            Row(
                              children: [
                                const Icon(Icons.business_outlined,
                                    size: 14, color: Colors.grey),
                                const SizedBox(width: 4),
                                Text(
                                  user.department ?? 'No Department',
                                  style: const TextStyle(
                                      fontSize: 14, color: Colors.grey),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),

                // Sections
                _buildSectionGroup([
                  _SectionItem(
                      title: 'My Profile',
                      icon: Icons.person_outline,
                      onTap: () {}),
                  _SectionItem(
                      title: 'My Performance',
                      icon: Icons.insights_outlined,
                      onTap: () {}),
                ]),
                const SizedBox(height: 16),
                _buildSectionGroup([
                  _SectionItem(
                      title: 'Notifications',
                      icon: Icons.notifications_none_outlined,
                      onTap: () {}),
                  _SectionItem(
                      title: 'Settings',
                      icon: Icons.settings_outlined,
                      onTap: () {}),
                  _SectionItem(
                      title: 'Help', icon: Icons.help_outline, onTap: () {}),
                ]),
                const SizedBox(height: 16),
                _buildSectionGroup([
                  _SectionItem(
                    title: 'Logout',
                    icon: Icons.logout,
                    color: Colors.red,
                    onTap: () {
                      ref.read(authProvider.notifier).logout();
                    },
                  ),
                ]),
                const SizedBox(height: 32),
              ],
            ),
          );
        },
        orElse: () => const Center(child: CircularProgressIndicator()),
      ),
    );
  }

  Widget _buildSectionGroup(List<_SectionItem> items) {
    return Container(
      color: Colors.white,
      child: Column(
        children: items.asMap().entries.map((entry) {
          final index = entry.key;
          final item = entry.value;
          return Column(
            children: [
              ListTile(
                leading: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: (item.color ?? Colors.blue).withOpacity(0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Icon(item.icon,
                      color: item.color ?? Colors.blue, size: 20),
                ),
                title: Text(
                  item.title,
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w500,
                    color: item.color ?? Colors.black87,
                  ),
                ),
                trailing: const Icon(Icons.chevron_right, color: Colors.grey),
                onTap: item.onTap,
              ),
              if (index < items.length - 1)
                const Divider(height: 1, indent: 64, color: Color(0xFFF1F5F9)),
            ],
          );
        }).toList(),
      ),
    );
  }
}

class _SectionItem {
  final String title;
  final IconData icon;
  final VoidCallback onTap;
  final Color? color;

  _SectionItem({
    required this.title,
    required this.icon,
    required this.onTap,
    this.color,
  });
}
