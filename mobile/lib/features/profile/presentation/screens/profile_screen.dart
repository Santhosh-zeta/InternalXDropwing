import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:go_router/go_router.dart';
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
                      onTap: () => _showEditProfileSheet(context, ref, user.fullName, user.phone)),
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
                      onTap: () => context.push('/notifications')),
                  _SectionItem(
                      title: 'Settings',
                      icon: LucideIcons.settings,
                      onTap: () => _showSettingsSheet(context)),
                  _SectionItem(
                      title: 'Help', icon: LucideIcons.helpCircle, onTap: () => _showHelpDialog(context)),
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

  void _showEditProfileSheet(BuildContext context, WidgetRef ref, String currentName, String? currentPhone) {
    final nameController = TextEditingController(text: currentName);
    final phoneController = TextEditingController(text: currentPhone ?? '');
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: NebulaColors.surfaceCard,
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
            const Text('Edit Profile',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: NebulaColors.textPrimary)),
            const SizedBox(height: 20),
            TextField(
              controller: nameController,
              style: const TextStyle(color: NebulaColors.textPrimary),
              decoration: InputDecoration(
                labelText: 'Full Name',
                labelStyle: const TextStyle(color: NebulaColors.textSecondary),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: const BorderSide(color: NebulaColors.primary),
                ),
              ),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: phoneController,
              keyboardType: TextInputType.phone,
              style: const TextStyle(color: NebulaColors.textPrimary),
              decoration: InputDecoration(
                labelText: 'Phone',
                labelStyle: const TextStyle(color: NebulaColors.textSecondary),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: const BorderSide(color: NebulaColors.primary),
                ),
              ),
            ),
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: NebulaColors.primary,
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
      backgroundColor: NebulaColors.surfaceCard,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Settings',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: NebulaColors.textPrimary)),
            const SizedBox(height: 16),
            ListTile(
              leading: const Icon(LucideIcons.moon, color: NebulaColors.textSecondary),
              title: const Text('Dark Mode', style: TextStyle(color: NebulaColors.textPrimary)),
              trailing: const Icon(LucideIcons.check, color: NebulaColors.primary, size: 18),
              onTap: () {},
            ),
            ListTile(
              leading: const Icon(LucideIcons.globe, color: NebulaColors.textSecondary),
              title: const Text('Language: English', style: TextStyle(color: NebulaColors.textPrimary)),
              onTap: () {},
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
        backgroundColor: NebulaColors.surfaceCard,
        title: const Text('Help & Support', style: TextStyle(color: NebulaColors.textPrimary)),
        content: const Text(
          'For support, contact IT Admin at dev2@dropwinggroups.com',
          style: TextStyle(color: NebulaColors.textSecondary),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('Close', style: TextStyle(color: NebulaColors.primary)),
          ),
        ],
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
                    color: (item.color ?? Colors.blue).withValues(alpha: 0.1),
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


