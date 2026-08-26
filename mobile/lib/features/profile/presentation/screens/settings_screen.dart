import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../../../core/theme/nebula_colors.dart';
import '../../../auth/presentation/providers/auth_provider.dart';
import '../providers/profile_provider.dart';

class SettingsScreen extends ConsumerStatefulWidget {
  const SettingsScreen({super.key});

  @override
  ConsumerState<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends ConsumerState<SettingsScreen> {
  bool _pushNotifications = true;
  bool _soundEnabled = true;
  bool _vibrationEnabled = true;
  String _themeMode = 'system'; // 'light', 'dark', 'system'
  TimeOfDay _quietHoursStart = const TimeOfDay(hour: 21, minute: 0);
  TimeOfDay _quietHoursEnd = const TimeOfDay(hour: 9, minute: 0);
  bool _quietHoursEnabled = false;

  @override
  void initState() {
    super.initState();
    // Load saved preferences from shared preferences or local storage
    _loadSettings();
  }

  void _loadSettings() {
    // TODO: Load from secure storage or shared preferences
  }

  void _saveSettings() {
    // TODO: Save to secure storage or shared preferences
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Settings saved successfully')),
    );
  }

  @override
  Widget build(BuildContext context) {
    final profileState = ref.watch(profileProvider);
    final authState = ref.watch(authProvider);

    return Scaffold(
      backgroundColor: NebulaColors.background,
      appBar: AppBar(
        title: const Text(
          'Settings',
          style: TextStyle(fontWeight: FontWeight.w600, color: NebulaColors.textPrimary),
        ),
        backgroundColor: NebulaColors.surfaceCard,
        elevation: 0,
        centerTitle: false,
      ),
      body: SingleChildScrollView(
        child: Column(
          children: [
            const SizedBox(height: 16),

            // Account Section
            _buildSectionHeader('Account'),
            _buildSettingCard(
              title: 'Theme',
              subtitle: 'Light, Dark, or System',
              child: _buildThemeDropdown(),
            ),
            _buildSettingCard(
              title: 'Language',
              subtitle: 'English',
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'English',
                    style: TextStyle(color: NebulaColors.textPrimary, fontSize: 14),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: NebulaColors.primary.withOpacity(0.2),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: const Text(
                      'Coming Soon',
                      style: TextStyle(
                        color: NebulaColors.primary,
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // Notifications Section
            _buildSectionHeader('Notifications'),
            _buildToggleSetting(
              title: 'Push Notifications',
              subtitle: 'Receive push notifications',
              value: _pushNotifications,
              onChanged: (value) {
                setState(() => _pushNotifications = value);
              },
            ),
            _buildToggleSetting(
              title: 'Sound',
              subtitle: 'Enable notification sounds',
              value: _soundEnabled,
              onChanged: (value) {
                setState(() => _soundEnabled = value);
              },
            ),
            _buildToggleSetting(
              title: 'Vibration',
              subtitle: 'Enable haptic feedback',
              value: _vibrationEnabled,
              onChanged: (value) {
                setState(() => _vibrationEnabled = value);
              },
            ),
            _buildToggleSetting(
              title: 'Quiet Hours',
              subtitle: 'Mute notifications during quiet hours',
              value: _quietHoursEnabled,
              onChanged: (value) {
                setState(() => _quietHoursEnabled = value);
              },
            ),
            if (_quietHoursEnabled) ...[
              _buildSettingCard(
                title: 'Quiet Hours Time',
                child: Column(
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'Start Time',
                          style: TextStyle(color: NebulaColors.textSecondary, fontSize: 13),
                        ),
                        GestureDetector(
                          onTap: () async {
                            final time = await showTimePicker(
                              context: context,
                              initialTime: _quietHoursStart,
                            );
                            if (time != null) {
                              setState(() => _quietHoursStart = time);
                            }
                          },
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                            decoration: BoxDecoration(
                              color: NebulaColors.primary.withOpacity(0.15),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Text(
                              _quietHoursStart.format(context),
                              style: const TextStyle(
                                color: NebulaColors.primary,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'End Time',
                          style: TextStyle(color: NebulaColors.textSecondary, fontSize: 13),
                        ),
                        GestureDetector(
                          onTap: () async {
                            final time = await showTimePicker(
                              context: context,
                              initialTime: _quietHoursEnd,
                            );
                            if (time != null) {
                              setState(() => _quietHoursEnd = time);
                            }
                          },
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                            decoration: BoxDecoration(
                              color: NebulaColors.primary.withOpacity(0.15),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Text(
                              _quietHoursEnd.format(context),
                              style: const TextStyle(
                                color: NebulaColors.primary,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
            const SizedBox(height: 24),

            // Privacy Section
            _buildSectionHeader('Privacy & Access'),
            profileState.when(
              data: (user) {
                return Column(
                  children: [
                    _buildSettingCard(
                      title: 'Venture',
                      child: Text(
                        user.venture?.name ?? 'N/A',
                        style: const TextStyle(
                          color: NebulaColors.textPrimary,
                          fontSize: 14,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ),
                    _buildSettingCard(
                      title: 'Access Level',
                      child: Text(
                        '${user.levelName} (L${user.accessLevel})',
                        style: const TextStyle(
                          color: NebulaColors.textPrimary,
                          fontSize: 14,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ),
                    if (user.accessLevel <= 2)
                      _buildSettingCard(
                        title: 'View Access Control',
                        child: GestureDetector(
                          onTap: () {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(content: Text('Access Control page not available yet')),
                            );
                          },
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                            decoration: BoxDecoration(
                              color: NebulaColors.primary.withOpacity(0.15),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: const Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(
                                  LucideIcons.externalLink,
                                  size: 14,
                                  color: NebulaColors.primary,
                                ),
                                SizedBox(width: 6),
                                Text(
                                  'Open',
                                  style: TextStyle(
                                    color: NebulaColors.primary,
                                    fontWeight: FontWeight.w600,
                                    fontSize: 13,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                  ],
                );
              },
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (error, stack) => const SizedBox.shrink(),
            ),
            const SizedBox(height: 24),

            // App Section
            _buildSectionHeader('App Information'),
            _buildSettingCard(
              title: 'App Version',
              child: const Text(
                '1.0.0+1',
                style: TextStyle(
                  color: NebulaColors.textPrimary,
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ),
            _buildSettingCard(
              title: 'Build Number',
              child: const Text(
                '1',
                style: TextStyle(
                  color: NebulaColors.textPrimary,
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ),
            _buildSettingCard(
              title: 'Check for Updates',
              child: GestureDetector(
                onTap: () {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('You are already using the latest version')),
                  );
                },
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  decoration: BoxDecoration(
                    color: NebulaColors.primary.withOpacity(0.15),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        LucideIcons.refreshCw,
                        size: 14,
                        color: NebulaColors.primary,
                      ),
                      SizedBox(width: 6),
                      Text(
                        'Check',
                        style: TextStyle(
                          color: NebulaColors.primary,
                          fontWeight: FontWeight.w600,
                          fontSize: 13,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
            _buildSettingCard(
              title: 'About',
              child: GestureDetector(
                onTap: () {
                  _showAboutBottomSheet(context);
                },
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  decoration: BoxDecoration(
                    color: NebulaColors.highlight.withOpacity(0.15),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        LucideIcons.info,
                        size: 14,
                        color: NebulaColors.highlight,
                      ),
                      SizedBox(width: 6),
                      Text(
                        'Learn More',
                        style: TextStyle(
                          color: NebulaColors.highlight,
                          fontWeight: FontWeight.w600,
                          fontSize: 13,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
            const SizedBox(height: 24),

            // Danger Zone
            _buildSectionHeader('Danger Zone', isRed: true),
            _buildSettingCard(
              title: 'Change Password',
              onTap: () {
                _showChangePasswordSheet(context, ref);
              },
              child: const Icon(LucideIcons.chevronRight, color: NebulaColors.textSecondary),
            ),
            _buildSettingCard(
              title: 'Log Out',
              isRed: true,
              onTap: () {
                _showLogoutConfirmation(context, ref);
              },
              child: const Icon(LucideIcons.chevronRight, color: NebulaColors.critical),
            ),
            const SizedBox(height: 48),
          ],
        ),
      ),
    );
  }

  Widget _buildSectionHeader(String title, {bool isRed = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Align(
        alignment: Alignment.centerLeft,
        child: Text(
          title,
          style: TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.bold,
            color: isRed ? NebulaColors.critical : NebulaColors.textSecondary,
          ),
        ),
      ),
    );
  }

  Widget _buildSettingCard({
    required String title,
    String? subtitle,
    Widget? child,
    VoidCallback? onTap,
    bool isRed = false,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: NebulaColors.surfaceCard,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: isRed ? NebulaColors.critical : NebulaColors.textPrimary,
                    ),
                  ),
                  if (subtitle != null) ...[
                    const SizedBox(height: 4),
                    Text(
                      subtitle,
                      style: const TextStyle(
                        fontSize: 12,
                        color: NebulaColors.textSecondary,
                      ),
                    ),
                  ],
                ],
              ),
            ),
            if (child != null) ...[
              const SizedBox(width: 16),
              child,
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildToggleSetting({
    required String title,
    required String subtitle,
    required bool value,
    required ValueChanged<bool> onChanged,
  }) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: NebulaColors.surfaceCard,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: NebulaColors.textPrimary,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  subtitle,
                  style: const TextStyle(
                    fontSize: 12,
                    color: NebulaColors.textSecondary,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 16),
          Switch(
            value: value,
            onChanged: onChanged,
            activeColor: NebulaColors.primary,
            inactiveTrackColor: NebulaColors.background.withOpacity(0.5),
          ),
        ],
      ),
    );
  }

  Widget _buildThemeDropdown() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: NebulaColors.background,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: NebulaColors.textSecondary.withOpacity(0.3)),
      ),
      child: DropdownButton<String>(
        value: _themeMode,
        isExpanded: true,
        underline: const SizedBox(),
        dropdownColor: NebulaColors.surfaceCard,
        items: [
          DropdownMenuItem(
            value: 'light',
            child: Text(
              'Light',
              style: TextStyle(
                color: _themeMode == 'light' ? NebulaColors.primary : NebulaColors.textSecondary,
              ),
            ),
          ),
          DropdownMenuItem(
            value: 'dark',
            child: Text(
              'Dark',
              style: TextStyle(
                color: _themeMode == 'dark' ? NebulaColors.primary : NebulaColors.textSecondary,
              ),
            ),
          ),
          DropdownMenuItem(
            value: 'system',
            child: Text(
              'System',
              style: TextStyle(
                color: _themeMode == 'system' ? NebulaColors.primary : NebulaColors.textSecondary,
              ),
            ),
          ),
        ],
        onChanged: (value) {
          if (value != null) {
            setState(() => _themeMode = value);
          }
        },
      ),
    );
  }

  void _showChangePasswordSheet(BuildContext context, WidgetRef ref) {
    final currentPasswordController = TextEditingController();
    final newPasswordController = TextEditingController();
    final confirmPasswordController = TextEditingController();

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: NebulaColors.surfaceCard,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => Padding(
        padding: EdgeInsets.only(
          left: 24,
          right: 24,
          top: 24,
          bottom: MediaQuery.of(ctx).viewInsets.bottom + 24,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Change Password',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: NebulaColors.textPrimary),
            ),
            const SizedBox(height: 20),
            TextField(
              controller: currentPasswordController,
              obscureText: true,
              style: const TextStyle(color: NebulaColors.textPrimary),
              decoration: InputDecoration(
                labelText: 'Current Password',
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
              controller: newPasswordController,
              obscureText: true,
              style: const TextStyle(color: NebulaColors.textPrimary),
              decoration: InputDecoration(
                labelText: 'New Password',
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
              controller: confirmPasswordController,
              obscureText: true,
              style: const TextStyle(color: NebulaColors.textPrimary),
              decoration: InputDecoration(
                labelText: 'Confirm Password',
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
                  if (newPasswordController.text != confirmPasswordController.text) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Passwords do not match')),
                    );
                    return;
                  }

                  try {
                    await ref.read(profileProvider.notifier).changePassword(
                          currentPasswordController.text,
                          newPasswordController.text,
                        );

                    if (context.mounted) {
                      Navigator.of(ctx).pop();
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Password changed successfully')),
                      );
                    }
                  } catch (e) {
                    if (context.mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(content: Text('Error: $e')),
                      );
                    }
                  }
                },
                child: const Text('Change Password', style: TextStyle(fontWeight: FontWeight.bold)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _showLogoutConfirmation(BuildContext context, WidgetRef ref) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: NebulaColors.surfaceCard,
        title: const Text(
          'Log Out?',
          style: TextStyle(color: NebulaColors.textPrimary, fontWeight: FontWeight.bold),
        ),
        content: const Text(
          'Are you sure you want to log out? You will need to sign in again.',
          style: TextStyle(color: NebulaColors.textSecondary),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('Cancel', style: TextStyle(color: NebulaColors.textSecondary)),
          ),
          TextButton(
            onPressed: () {
              Navigator.of(ctx).pop();
              ref.read(authProvider.notifier).logout();
            },
            child: const Text('Log Out', style: TextStyle(color: NebulaColors.critical)),
          ),
        ],
      ),
    );
  }

  void _showAboutBottomSheet(BuildContext context) {
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
            const Text(
              'About InternalX Dropwing',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: NebulaColors.textPrimary),
            ),
            const SizedBox(height: 16),
            const Text(
              'Dropwing Groups',
              style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: NebulaColors.textSecondary),
            ),
            const SizedBox(height: 8),
            const Text(
              'InternalX is your all-in-one platform for project management, team collaboration, and business intelligence.',
              style: TextStyle(fontSize: 13, color: NebulaColors.textSecondary),
            ),
            const SizedBox(height: 16),
            const Text(
              'Contact Support',
              style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: NebulaColors.textSecondary),
            ),
            const SizedBox(height: 8),
            const Text(
              'dev2@dropwinggroups.com',
              style: TextStyle(
                fontSize: 13,
                color: NebulaColors.primary,
                decoration: TextDecoration.underline,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
