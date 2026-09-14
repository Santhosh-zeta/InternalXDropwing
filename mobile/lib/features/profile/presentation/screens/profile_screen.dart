import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../auth/presentation/providers/auth_provider.dart';
import '../providers/profile_provider.dart';
import 'package:file_picker/file_picker.dart';
import '../../../../core/theme/theme_context.dart';
import '../../../../core/theme/theme_mode_provider.dart';

class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final profileState = ref.watch(profileProvider);

    return Scaffold(
      backgroundColor: context.scheme.surface,
      appBar: AppBar(
        title: Text('Profile',
            style: TextStyle(fontWeight: FontWeight.w600, color: context.scheme.onSurface)),
        backgroundColor: context.scheme.surfaceContainerHighest,
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
                  color: context.scheme.surfaceContainerHighest,
                  padding: const EdgeInsets.all(24.0),
                  child: Row(
                    children: [
                      Stack(
                        children: [
                          CircleAvatar(
                            radius: 40,
                            backgroundColor:
                                Theme.of(context).primaryColor.withValues(alpha: 0.1),
                            backgroundImage: user.avatarUrl != null && user.avatarUrl!.isNotEmpty
                                ? NetworkImage(user.avatarUrl!.startsWith('http')
                                    ? user.avatarUrl!
                                    : 'https://internalx.dropwinggroups.com${user.avatarUrl ?? ''}')
                                : null,
                            child: user.avatarUrl == null || user.avatarUrl!.isEmpty
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
                                decoration: BoxDecoration(
                                  color: context.scheme.primary,
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
                              style: TextStyle(
                                  fontSize: 22,
                                  fontWeight: FontWeight.bold,
                                  color: context.scheme.onSurface),
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
                                Icon(LucideIcons.building,
                                    size: 14, color: context.scheme.onSurfaceVariant),
                                const SizedBox(width: 4),
                                Text(
                                  user.department ?? 'No Department',
                                  style: TextStyle(
                                      fontSize: 14, color: context.scheme.onSurfaceVariant),
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
                _buildSectionGroup(context, [
                  _SectionItem(
                      title: 'My Profile',
                      icon: LucideIcons.user,
                      onTap: () => _showEditProfileSheet(context, ref, user.fullName, user.phone)),
                ]),
                const SizedBox(height: 16),
                _buildSectionGroup(context, [
                  _SectionItem(
                      title: 'Notifications',
                      icon: LucideIcons.bell,
                      onTap: () => context.push('/notifications')),
                  _SectionItem(
                      title: 'Settings',
                      icon: LucideIcons.settings,
                      onTap: () => _showSettingsSheet(context)),
                  _SectionItem(
                      title: 'Help', icon: LucideIcons.helpCircle, onTap: () => _showHelpDialog(context)),
                ]),
                const SizedBox(height: 16),
                _buildSectionGroup(context, [
                  _SectionItem(
                    title: 'Logout',
                    icon: LucideIcons.logOut,
                    color: context.dl.critical,
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

  void _showEditProfileSheet(BuildContext context, WidgetRef ref, String currentName, String? currentPhone) {
    final nameController = TextEditingController(text: currentName);
    final phoneController = TextEditingController(text: currentPhone ?? '');
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: context.scheme.surfaceContainerHighest,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => Padding(
        padding: EdgeInsets.only(
          left: 24, right: 24, top: 24,
          bottom: MediaQuery.of(ctx).viewInsets.bottom + 24,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Edit Profile',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: context.scheme.onSurface)),
            const SizedBox(height: 20),
            TextField(
              controller: nameController,
              style: TextStyle(color: context.scheme.onSurface),
              decoration: InputDecoration(
                labelText: 'Full Name',
                labelStyle: TextStyle(color: context.scheme.onSurfaceVariant),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide(color: context.scheme.primary),
                ),
              ),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: phoneController,
              keyboardType: TextInputType.phone,
              style: TextStyle(color: context.scheme.onSurface),
              decoration: InputDecoration(
                labelText: 'Phone',
                labelStyle: TextStyle(color: context.scheme.onSurfaceVariant),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide(color: context.scheme.primary),
                ),
              ),
            ),
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: context.scheme.primary,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                onPressed: () async {
                  Navigator.of(ctx).pop();
                  try {
                    await ref.read(profileProvider.notifier).updateProfile(
                      fullName: nameController.text.trim(),
                      phone: phoneController.text.trim(),
                    );
                    if (context.mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Profile updated successfully')),
                      );
                    }
                  } catch (e) {
                    if (context.mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(content: Text('Failed to update: $e')),
                      );
                    }
                  }
                },
                child: const Text('Save Changes', style: TextStyle(fontWeight: FontWeight.bold)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _showSettingsSheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      backgroundColor: context.scheme.surfaceContainerHighest,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Settings',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: context.scheme.onSurface)),
            const SizedBox(height: 16),
            Consumer(
              builder: (context, ref, _) {
                final mode = ref.watch(themeModeProvider);
                return SwitchListTile(
                  secondary: Icon(LucideIcons.moon,
                      color: context.scheme.onSurfaceVariant),
                  title: Text('Dark mode',
                      style: TextStyle(color: context.scheme.onSurface)),
                  subtitle: Text(
                    mode == ThemeMode.system
                        ? 'Following your device'
                        : mode == ThemeMode.dark
                            ? 'Always dark'
                            : 'Always light',
                    style: TextStyle(color: context.scheme.onSurfaceVariant),
                  ),
                  value: mode == ThemeMode.dark ||
                      (mode == ThemeMode.system &&
                          MediaQuery.platformBrightnessOf(context) ==
                              Brightness.dark),
                  onChanged: (on) => ref
                      .read(themeModeProvider.notifier)
                      .setThemeMode(on ? ThemeMode.dark : ThemeMode.light),
                );
              },
            ),
            const SizedBox(height: 8),
          ],
        ),
      ),
    );
  }

  void _showHelpDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: context.scheme.surfaceContainerHighest,
        title: Text('Help & Support', style: TextStyle(color: context.scheme.onSurface)),
        content: Text(
          'For support, contact IT Admin at dev2@dropwinggroups.com',
          style: TextStyle(color: context.scheme.onSurfaceVariant),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: Text('Close', style: TextStyle(color: context.scheme.primary)),
          ),
        ],
      ),
    );
  }

  Widget _buildSectionGroup(BuildContext context, List<_SectionItem> items) {
    return Container(
      color: context.scheme.surfaceContainerHighest,
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
                    color: (item.color ?? context.scheme.primary).withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Icon(item.icon,
                      color: item.color ?? context.scheme.primary, size: 20),
                ),
                title: Text(
                  item.title,
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w500,
                    color: item.color ?? context.scheme.onSurface,
                  ),
                ),
                trailing: Icon(LucideIcons.chevronRight, color: context.scheme.onSurfaceVariant),
                onTap: item.onTap,
              ),
              if (index < items.length - 1)
                Divider(height: 1, indent: 64, color: context.dl.border),
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


