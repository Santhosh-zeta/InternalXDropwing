import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hive/hive.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../../../core/constants/access_levels.dart';
import '../../../../core/theme/nebula_colors.dart';
import '../../../../core/theme/theme_mode_provider.dart';
import '../../../auth/presentation/providers/auth_provider.dart';
import '../providers/profile_provider.dart';

/// Preference keys in the `user_prefs` Hive box (opened in `main.dart`, and
/// named by `kUserPrefsBoxName` in `theme_mode_provider.dart`). The theme mode
/// lives under `kThemeModeKey` and is owned by `ThemeModeNotifier`, not here.
const String kPrefPushNotifications = 'push_notifications';
const String kPrefSoundEnabled = 'sound_enabled';
const String kPrefVibrationEnabled = 'vibration_enabled';
const String kPrefQuietHoursEnabled = 'quiet_hours_enabled';
const String kPrefQuietHoursStart = 'quiet_hours_start'; // minutes past midnight
const String kPrefQuietHoursEnd = 'quiet_hours_end'; // minutes past midnight

/// INTEGRATION POINT — flip to `true` once notification delivery honours the
/// stored preferences. `core/notifications/firebase_notif_handler.dart`
/// currently only logs foreground messages, so these are stored but unused.
const bool kNotificationPrefsApplied = false;

class SettingsScreen extends ConsumerStatefulWidget {
  const SettingsScreen({super.key});

  @override
  ConsumerState<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends ConsumerState<SettingsScreen> {
  bool _pushNotifications = true;
  bool _soundEnabled = true;
  bool _vibrationEnabled = true;
  TimeOfDay _quietHoursStart = const TimeOfDay(hour: 21, minute: 0);
  TimeOfDay _quietHoursEnd = const TimeOfDay(hour: 9, minute: 0);
  bool _quietHoursEnabled = false;

  /// `null` when the `user_prefs` box could not be reached, in which case
  /// nothing can be stored and the UI says so instead of pretending.
  Box<dynamic>? _prefsBox;

  @override
  void initState() {
    super.initState();
    _loadSettings();
  }

  /// Reads the persisted preferences. Called from `initState`, so it mutates
  /// the fields directly rather than going through `setState`.
  void _loadSettings() {
    try {
      if (!Hive.isBoxOpen(kUserPrefsBoxName)) return;
      final box = Hive.box(kUserPrefsBoxName);
      _prefsBox = box;

      _pushNotifications =
          _readBool(box, kPrefPushNotifications, _pushNotifications);
      _soundEnabled = _readBool(box, kPrefSoundEnabled, _soundEnabled);
      _vibrationEnabled =
          _readBool(box, kPrefVibrationEnabled, _vibrationEnabled);
      _quietHoursEnabled =
          _readBool(box, kPrefQuietHoursEnabled, _quietHoursEnabled);
      _quietHoursStart =
          _readTime(box, kPrefQuietHoursStart, _quietHoursStart);
      _quietHoursEnd = _readTime(box, kPrefQuietHoursEnd, _quietHoursEnd);
    } catch (_) {
      // Hive unavailable — keep the defaults and disable persistence.
      _prefsBox = null;
    }
  }

  bool _readBool(Box<dynamic> box, String key, bool fallback) {
    final value = box.get(key);
    return value is bool ? value : fallback;
  }

  TimeOfDay _readTime(Box<dynamic> box, String key, TimeOfDay fallback) {
    final value = box.get(key);
    if (value is int && value >= 0 && value < 24 * 60) {
      return TimeOfDay(hour: value ~/ 60, minute: value % 60);
    }
    return fallback;
  }

  int _timeToMinutes(TimeOfDay time) => time.hour * 60 + time.minute;

  /// Writes a single preference. Surfaces a message only when the write
  /// actually fails — a successful write is silent.
  Future<void> _persist(String key, Object? value) async {
    final box = _prefsBox;
    if (box == null) {
      _reportSaveFailure();
      return;
    }
    try {
      await box.put(key, value);
    } catch (_) {
      _reportSaveFailure();
    }
  }

  void _reportSaveFailure() {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Could not save that preference on this device.'),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final profileState = ref.watch(profileProvider);

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

            if (_prefsBox == null)
              _buildNote(
                'Local storage is unavailable, so changes here will not be '
                'remembered. Restart the app to try again.',
                isWarning: true,
              ),

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
                      color: NebulaColors.primary.withValues(alpha: 0.2),
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
            if (!kNotificationPrefsApplied)
              _buildNote(
                'These preferences are saved on this device. Notification '
                'delivery does not read them yet.',
              ),
            _buildToggleSetting(
              title: 'Push Notifications',
              subtitle: 'Receive push notifications',
              value: _pushNotifications,
              onChanged: (value) {
                setState(() => _pushNotifications = value);
                _persist(kPrefPushNotifications, value);
              },
            ),
            _buildToggleSetting(
              title: 'Sound',
              subtitle: 'Enable notification sounds',
              value: _soundEnabled,
              onChanged: (value) {
                setState(() => _soundEnabled = value);
                _persist(kPrefSoundEnabled, value);
              },
            ),
            _buildToggleSetting(
              title: 'Vibration',
              subtitle: 'Enable haptic feedback',
              value: _vibrationEnabled,
              onChanged: (value) {
                setState(() => _vibrationEnabled = value);
                _persist(kPrefVibrationEnabled, value);
              },
            ),
            _buildToggleSetting(
              title: 'Quiet Hours',
              subtitle: 'Mute notifications during quiet hours',
              value: _quietHoursEnabled,
              onChanged: (value) {
                setState(() => _quietHoursEnabled = value);
                _persist(kPrefQuietHoursEnabled, value);
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
                              _persist(
                                kPrefQuietHoursStart,
                                _timeToMinutes(time),
                              );
                            }
                          },
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                            decoration: BoxDecoration(
                              color: NebulaColors.primary.withValues(alpha: 0.15),
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
                              _persist(
                                kPrefQuietHoursEnd,
                                _timeToMinutes(time),
                              );
                            }
                          },
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                            decoration: BoxDecoration(
                              color: NebulaColors.primary.withValues(alpha: 0.15),
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
                    if (AccessLevels.hasAtLeast(
                        user.accessLevel, AccessLevels.managingDirector))
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
                              color: NebulaColors.primary.withValues(alpha: 0.15),
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
                    color: NebulaColors.primary.withValues(alpha: 0.15),
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
                    color: NebulaColors.highlight.withValues(alpha: 0.15),
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
            activeThumbColor: NebulaColors.primary,
            inactiveTrackColor: NebulaColors.background.withValues(alpha: 0.5),
          ),
        ],
      ),
    );
  }

  Widget _buildThemeDropdown() {
    final themeMode = ref.watch(themeModeStringProvider);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: NebulaColors.background,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: NebulaColors.textSecondary.withValues(alpha: 0.3)),
      ),
      child: DropdownButton<String>(
        // Owned by ThemeModeNotifier, which both applies the mode via
        // MaterialApp.themeMode and persists it to the `user_prefs` box.
        value: themeMode,
        isExpanded: true,
        underline: const SizedBox(),
        dropdownColor: NebulaColors.surfaceCard,
        items: [
          DropdownMenuItem(
            value: 'light',
            child: Text(
              'Light',
              style: TextStyle(
                color: themeMode == 'light'
                    ? NebulaColors.primary
                    : NebulaColors.textSecondary,
              ),
            ),
          ),
          DropdownMenuItem(
            value: 'dark',
            child: Text(
              'Dark',
              style: TextStyle(
                color: themeMode == 'dark'
                    ? NebulaColors.primary
                    : NebulaColors.textSecondary,
              ),
            ),
          ),
          DropdownMenuItem(
            value: 'system',
            child: Text(
              'System',
              style: TextStyle(
                color: themeMode == 'system'
                    ? NebulaColors.primary
                    : NebulaColors.textSecondary,
              ),
            ),
          ),
        ],
        onChanged: (value) {
          if (value == null) return;
          ref.read(themeModeProvider.notifier).setFromString(value);
        },
      ),
    );
  }

  /// Small inline explanation used where a control is stored but not yet
  /// acted on, or where storage itself is unavailable.
  Widget _buildNote(String text, {bool isWarning = false}) {
    final color = isWarning ? NebulaColors.warning : NebulaColors.textSecondary;
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: color.withValues(alpha: 0.25)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(
            isWarning ? LucideIcons.alertTriangle : LucideIcons.info,
            size: 14,
            color: color,
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              text,
              style: TextStyle(fontSize: 12, color: color),
            ),
          ),
        ],
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
      builder: (ctx) => const Padding(
        padding: EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'About InternalX Dropwing',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: NebulaColors.textPrimary),
            ),
            SizedBox(height: 16),
            Text(
              'Dropwing Groups',
              style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: NebulaColors.textSecondary),
            ),
            SizedBox(height: 8),
            Text(
              'InternalX is your all-in-one platform for project management, team collaboration, and business intelligence.',
              style: TextStyle(fontSize: 13, color: NebulaColors.textSecondary),
            ),
            SizedBox(height: 16),
            Text(
              'Contact Support',
              style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: NebulaColors.textSecondary),
            ),
            SizedBox(height: 8),
            Text(
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
