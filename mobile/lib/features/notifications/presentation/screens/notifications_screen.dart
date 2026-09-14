import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../../../core/theme/nebula_spacing.dart';
import '../../../../core/theme/theme_context.dart';
import '../../../../core/widgets/data_display.dart';
import '../../../../core/widgets/motion.dart';
import '../../../../core/widgets/primitives.dart';
import '../../../../core/widgets/state_views.dart';
import '../../data/models/notification_model.dart';
import '../providers/notifications_provider.dart';

/// Notifications are personal — there is no permission gate here. Every
/// signed-in user sees their own, and only their own; the backend scopes the
/// query to the token.
///
/// This screen is the clearest statement of the brightness rule in the app:
/// an unread notification is [TimeState.next] and reads at full contrast, a
/// read one is [TimeState.past] and recedes. No hue is spent on either.
class NotificationsScreen extends ConsumerWidget {
  const NotificationsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final notificationsAsync = ref.watch(notificationsProvider);
    final unread = notificationsAsync.valueOrNull?.unreadCount ?? 0;

    return Scaffold(
      appBar: AppBar(
        centerTitle: false,
        title: Row(
          children: [
            const Text('Notifications'),
            if (unread > 0) ...[
              const SizedBox(width: NebulaSpacing.sm),
              DTag('$unread', tone: DTone.accent),
            ],
          ],
        ),
        actions: [
          if (unread > 0)
            TextButton.icon(
              onPressed: () =>
                  ref.read(notificationsProvider.notifier).markAllAsRead(),
              icon: const Icon(LucideIcons.checkCheck, size: 15),
              label: const Text('All read'),
            ),
          _OverflowMenu(
            onClearRead: () => _confirmClearRead(context, ref),
          ),
        ],
      ),
      body: notificationsAsync.when(
        loading: () => const Padding(
          padding: EdgeInsets.all(NebulaSpacing.md),
          child: ListSkeleton(),
        ),
        error: (error, _) => ErrorStateView(
          message: readableError(error),
          onRetry: () => ref.read(notificationsProvider.notifier).refresh(),
        ),
        data: (data) {
          if (data.notifications.isEmpty) {
            return const EmptyStateView(
              icon: LucideIcons.bellOff,
              title: 'No notifications',
              message: "You're all caught up.",
            );
          }
          return _NotificationList(notifications: data.notifications);
        },
      ),
    );
  }

  Future<void> _confirmClearRead(BuildContext context, WidgetRef ref) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Clear read notifications'),
        content: const Text(
          'Remove every notification you have already read?',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext, false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(dialogContext, true),
            child: Text(
              'Clear',
              style: TextStyle(color: dialogContext.dl.critical),
            ),
          ),
        ],
      ),
    );

    if (confirmed != true) return;
    try {
      await ref.read(notificationsProvider.notifier).clearRead();
    } catch (error) {
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(readableError(error)),
          behavior: SnackBarBehavior.floating,
        ),
      );
    }
  }
}

class _OverflowMenu extends StatelessWidget {
  const _OverflowMenu({required this.onClearRead});

  final VoidCallback onClearRead;

  @override
  Widget build(BuildContext context) {
    final dl = context.dl;
    return PopupMenuButton<String>(
      icon: const Icon(LucideIcons.ellipsisVertical),
      onSelected: (value) {
        if (value == 'clear') onClearRead();
      },
      itemBuilder: (context) => [
        PopupMenuItem(
          value: 'clear',
          child: Row(
            children: [
              Icon(LucideIcons.trash2, size: 15, color: dl.critical),
              const SizedBox(width: NebulaSpacing.sm),
              const Text('Clear read'),
            ],
          ),
        ),
      ],
    );
  }
}

class _NotificationList extends ConsumerWidget {
  const _NotificationList({required this.notifications});

  final List<NotificationModel> notifications;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);

    final todays = <NotificationModel>[];
    final earlier = <NotificationModel>[];
    for (final n in notifications) {
      final when = DateTime.tryParse(n.createdAt);
      final isToday = when != null &&
          !DateTime(when.year, when.month, when.day).isBefore(today);
      (isToday ? todays : earlier).add(n);
    }

    return RefreshIndicator(
      onRefresh: () => ref.read(notificationsProvider.notifier).refresh(),
      child: ListView(
        padding: const EdgeInsets.fromLTRB(
          NebulaSpacing.md,
          NebulaSpacing.sm,
          NebulaSpacing.md,
          NebulaSpacing.lg,
        ),
        children: [
          ..._section('Today', todays, 0),
          ..._section('Earlier', earlier, todays.length),
        ],
      ),
    );
  }

  List<Widget> _section(
    String label,
    List<NotificationModel> items,
    int indexOffset,
  ) {
    if (items.isEmpty) return const [];
    final unread = items.where((n) => !n.isRead).length;

    return [
      GroupHeader(
        label,
        count: items.length,
        tone: unread > 0 ? DTone.accent : null,
      ),
      for (var i = 0; i < items.length; i++)
        Padding(
          padding: const EdgeInsets.only(bottom: NebulaSpacing.sm),
          child: StaggerIn(
            index: indexOffset + i,
            child: _NotificationRow(notification: items[i]),
          ),
        ),
    ];
  }
}

class _NotificationRow extends ConsumerWidget {
  const _NotificationRow({required this.notification});

  final NotificationModel notification;

  IconData get _icon {
    switch (notification.type) {
      case 'task_assigned':
        return LucideIcons.squareCheck;
      case 'task_updated':
        return LucideIcons.refreshCw;
      case 'project_update':
        return LucideIcons.folder;
      case 'announcement':
        return LucideIcons.megaphone;
      case 'document':
        return LucideIcons.fileText;
      default:
        return LucideIcons.bell;
    }
  }

  /// `task_assigned` → `TASK ASSIGNED`.
  String get _typeLabel => notification.type.replaceAll('_', ' ');

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final dl = context.dl;

    // The whole rule, in one line: unread is upcoming and reads at full
    // contrast; read is done and recedes.
    final timeState =
        notification.isRead ? TimeState.past : TimeState.next;
    final foreground = timeState.foreground(context);

    return EntityRow(
      title: notification.title,
      timeState: timeState,
      onTap: notification.isRead
          ? null
          : () => ref
              .read(notificationsProvider.notifier)
              .markAsRead(notification.id),
      leading: Container(
        width: 34,
        height: 34,
        decoration: BoxDecoration(
          color: dl.surfaceRaised,
          borderRadius: BorderRadius.circular(NebulaSpacing.radiusSm),
          border: Border.all(color: dl.border),
        ),
        child: Icon(_icon, size: 16, color: foreground),
      ),
      meta: [
        Mono(
          _relativeTime(notification.createdAt),
          size: 10.5,
          color: dl.textTertiary,
        ),
        // `_MetaLine` lays its children out in a Wrap, which already
        // constrains them to the row width — a Flexible here would be an
        // illegal parent-data widget.
        if (notification.message.isNotEmpty)
          Text(
            notification.message,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
          ),
      ],
      trailing: DTag(
        _typeLabel,
        tone: notification.isRead ? DTone.neutral : DTone.accent,
      ),
    );
  }

  static String _relativeTime(String createdAt) {
    final when = DateTime.tryParse(createdAt);
    if (when == null) return '—';

    final diff = DateTime.now().difference(when);
    if (diff.inMinutes < 1) return 'now';
    if (diff.inMinutes < 60) return '${diff.inMinutes}m';
    if (diff.inHours < 24) return '${diff.inHours}h';
    if (diff.inDays < 7) return '${diff.inDays}d';
    return DateFormat('d MMM').format(when);
  }
}
