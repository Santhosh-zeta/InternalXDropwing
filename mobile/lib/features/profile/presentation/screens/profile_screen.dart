import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../../../core/theme/nebula_colors.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../auth/presentation/providers/auth_provider.dart';
import '../providers/profile_provider.dart';
import 'package:file_picker/file_picker.dart';

class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final profileState = ref.watch(profileProvider);

    return Scaffold(
      backgroundColor: NebulaColors.background,
      appBar: AppBar(
        title: const Text('Profile',
            style: TextStyle(fontWeight: FontWeight.w600, color: NebulaColors.textPrimary)),
        backgroundColor: NebulaColors.surfaceCard,
        elevation: 0,
        centerTitle: false,
      ),
      body: profileState.when(
        data: (user) {
          return SingleChildScrollView(
            child: Column(
              children: [
                // User Card
                Container(
                  color: NebulaColors.surfaceCard,
                  padding: const EdgeInsets.all(24.0),
                  child: Row(
                    children: [
                      Stack(
                        children: [
                          CircleAvatar(
                            radius: 40,
                            backgroundColor:
                                Theme.of(context).primaryColor.withOpacity(0.1),
                            backgroundImage: user.avatarUrl != null
                                ? NetworkImage(user.avatarUrl!.startsWith('http') ? user.avatarUrl! : 'https://internalx.dropwinggroups.com\${user.avatarUrl}')
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
                          Positioned(
                            bottom: 0,
                            right: 0,
                            child: GestureDetector(
                              onTap: () async {
                                final result = await FilePicker.platform.pickFiles(type: FileType.image);
                                if (result != null && result.files.single.path != null) {
                                  ref.read(profileProvider.notifier).uploadAvatar(result.files.single.path!);
                                }
                              },
                              child: Container(
                                padding: const EdgeInsets.all(6),
                                decoration: const BoxDecoration(
                                  color: NebulaColors.primary,
                                  shape: BoxShape.circle,
                                ),
                                child: const Icon(LucideIcons.camera, size: 16, color: Colors.white),
                              ),
                            ),
                          ),
                        ],
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
                                  color: NebulaColors.textPrimary),
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
                                const Icon(LucideIcons.building,
                                    size: 14, color: NebulaColors.textSecondary),
                                const SizedBox(width: 4),
                                Text(
                                  user.department ?? 'No Department',
                                  style: const TextStyle(
                                      fontSize: 14, color: NebulaColors.textSecondary),
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
                      icon: LucideIcons.user,
                      onTap: () {}),
                  _SectionItem(
                      title: 'My Performance',
                      icon: LucideIcons.barChart,
                      onTap: () {}),
                ]),
                const SizedBox(height: 16),
                _buildSectionGroup([
                  _SectionItem(
                      title: 'Notifications',
                      icon: LucideIcons.bell,
                      onTap: () {}),
                  _SectionItem(
                      title: 'Settings',
                      icon: LucideIcons.settings,
                      onTap: () {}),
                  _SectionItem(
                      title: 'Help', icon: LucideIcons.helpCircle, onTap: () {}),
                ]),
                const SizedBox(height: 16),
                _buildSectionGroup([
                  _SectionItem(
                    title: 'Logout',
                    icon: LucideIcons.logOut,
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
        error: (error, stack) => Center(child: Text('Error: $error')),
        loading: () => const Center(child: CircularProgressIndicator()),
      ),
    );
  }

  Widget _buildSectionGroup(List<_SectionItem> items) {
    return Container(
      color: NebulaColors.surfaceCard,
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
                    color: item.color ?? NebulaColors.textPrimary,
                  ),
                ),
                trailing: const Icon(LucideIcons.chevronRight, color: NebulaColors.textSecondary),
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


