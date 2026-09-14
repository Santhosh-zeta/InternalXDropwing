import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:intl/intl.dart';
import '../../../../core/theme/nebula_colors.dart';
import '../providers/notifications_provider.dart';
import '../../data/models/notification_model.dart';

class NotificationsScreen extends ConsumerWidget {
  const NotificationsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final notificationsAsync = ref.watch(notificationsProvider);

    return Scaffold(
      backgroundColor: NebulaColors.background,
      appBar: AppBar(
        title: Row(
          children: [
            const Text('Notifications',
                style: TextStyle(
                    fontWeight: FontWeight.w600,
                    color: NebulaColors.textPrimary)),
            const SizedBox(width: 8),
            notificationsAsync.maybeWhen(
              data: (data) => data.unreadCount > 0
                  ? Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: NebulaColors.critical,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(
                        '${data.unreadCount}',
                        style: const TextStyle(
                            color: Colors.white,
                            fontSize: 11,
                            fontWeight: FontWeight.bold),
                      ),
                    )
                  : const SizedBox.shrink(),
              orElse: () => const SizedBox.shrink(),
            ),
          ],
        ),
        backgroundColor: NebulaColors.surfaceCard,
        elevation: 0,
        centerTitle: false,
        actions: [
          notificationsAsync.maybeWhen(
            data: (data) {
              if (data.unreadCount == 0) return const SizedBox.shrink();
              return TextButton.icon(
                onPressed: () =>
                    ref.read(notificationsProvider.notifier).markAllAsRead(),
                icon: const Icon(LucideIcons.checkCheck,
                    size: 16, color: NebulaColors.primary),
                label: const Text('All Read',
                    style: TextStyle(
                        color: NebulaColors.primary, fontSize: 13)),
              );
            },
            orElse: () => const SizedBox.shrink(),
          ),
          PopupMenuButton<String>(
            icon: const Icon(LucideIcons.moreVertical,
                color: NebulaColors.textSecondary),
            color: NebulaColors.surfaceCard,
            onSelected: (value) async {
              if (value == 'clear') {
                final confirm = await showDialog<bool>(
                  context: context,
                  builder: (c) => AlertDialog(
                    backgroundColor: NebulaColors.surfaceCard,
                    title: const Text('Clear Read Notifications',
                        style: TextStyle(color: NebulaColors.textPrimary)),
                    content: const Text(
                        'Remove all notifications you have already read?',
                        style: TextStyle(color: NebulaColors.textSecondary)),
                    actions: [
                      TextButton(
                          onPressed: () => Navigator.pop(c, false),
                          child: const Text('Cancel')),
                      TextButton(
                          onPressed: () => Navigator.pop(c, true),
                          child: const Text('Clear',
                              style: TextStyle(color: NebulaColors.critical))),
                    ],
                  ),
                );
                if (confirm == true) {
                  await ref.read(notificationsProvider.notifier).clearRead();
                }
              }
            },
            itemBuilder: (context) => [
              const PopupMenuItem(
                value: 'clear',
                child: Row(children: [
                  Icon(LucideIcons.trash2,
                      size: 16, color: NebulaColors.critical),
                  SizedBox(width: 8),
                  Text('Clear read',
                      style: TextStyle(color: NebulaColors.textPrimary)),
                ]),
              ),
            ],
          ),
        ],
      ),
      body: notificationsAsync.when(
        data: (data) {
          if (data.notifications.isEmpty) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(LucideIcons.bellOff,
                      size: 64,
                      color: NebulaColors.textSecondary.withValues(alpha: 0.4)),
                  const SizedBox(height: 16),
                  const Text('No notifications',
                      style: TextStyle(
                          color: NebulaColors.textSecondary, fontSize: 16)),
                  const SizedBox(height: 8),
                  const Text("You're all caught up!",
                      style: TextStyle(
                          color: NebulaColors.textSecondary, fontSize: 13)),
                ],
              ),
            );
          }
          return RefreshIndicator(
            color: NebulaColors.primary,
            onRefresh: () =>
                ref.read(notificationsProvider.notifier).refresh(),
            child: ListView.separated(
              padding:
                  const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              itemCount: data.notifications.length,
              separatorBuilder: (_, __) =>
                  const Divider(color: NebulaColors.surface, height: 1),
              itemBuilder: (context, index) {
                return _NotificationTile(
                    notification: data.notifications[index]);
              },
            ),
          );
        },
        loading: () => const Center(
            child: CircularProgressIndicator(color: NebulaColors.primary)),
        error: (e, st) => Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(LucideIcons.alertCircle,
                  size: 48, color: NebulaColors.critical),
              const SizedBox(height: 12),
              const Text('Failed to load notifications',
                  style: TextStyle(
                      color: NebulaColors.textPrimary,
                      fontSize: 16,
                      fontWeight: FontWeight.w600)),
              const SizedBox(height: 8),
              Text(e.toString(),
                  style: const TextStyle(
                      color: NebulaColors.textSecondary, fontSize: 12),
                  textAlign: TextAlign.center),
              const SizedBox(height: 20),
              ElevatedButton.icon(
                onPressed: () =>
                    ref.read(notificationsProvider.notifier).refresh(),
                icon: const Icon(LucideIcons.refreshCw),
                label: const Text('Retry'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _NotificationTile extends ConsumerWidget {
  final NotificationModel notification;

  const _NotificationTile({required this.notification});

  IconData _typeIcon() {
    switch (notification.type) {
      case 'task_assigned':
        return LucideIcons.checkSquare;
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

  Color _typeColor() {
    switch (notification.type) {
      case 'task_assigned':
        return NebulaColors.primary;
      case 'task_updated':
        return NebulaColors.highlight;
      case 'project_update':
        return NebulaColors.warning;
      case 'announcement':
        return NebulaColors.critical;
      default:
        return NebulaColors.textSecondary;
    }
  }

  String _timeAgo(String createdAt) {
    try {
      final dt = DateTime.parse(createdAt);
      final diff = DateTime.now().difference(dt);
      if (diff.inMinutes < 1) return 'Just now';
      if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
      if (diff.inHours < 24) return '${diff.inHours}h ago';
      if (diff.inDays < 7) return '${diff.inDays}d ago';
      return DateFormat('MMM d').format(dt);
    } catch (_) {
      return '';
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final color = _typeColor();

    return InkWell(
      onTap: () {
        if (!notification.isRead) {
          ref
              .read(notificationsProvider.notifier)
              .markAsRead(notification.id);
        }
      },
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 4),
        decoration: BoxDecoration(
          color: notification.isRead
              ? Colors.transparent
              : NebulaColors.primary.withValues(alpha: 0.04),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Icon
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.12),
                shape: BoxShape.circle,
              ),
              child: Icon(_typeIcon(), size: 18, color: color),
            ),
            const SizedBox(width: 12),

            // Content
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          notification.title,
                          style: TextStyle(
                            color: NebulaColors.textPrimary,
                            fontWeight: notification.isRead
                                ? FontWeight.normal
                                : FontWeight.bold,
                            fontSize: 14,
                          ),
                        ),
                      ),
                      Text(
                        _timeAgo(notification.createdAt),
                        style: const TextStyle(
                            color: NebulaColors.textSecondary,
                            fontSize: 11),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    notification.message,
                    style: const TextStyle(
                        color: NebulaColors.textSecondary, fontSize: 13),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),

            // Unread dot
            if (!notification.isRead) ...[
              const SizedBox(width: 8),
              const CircleAvatar(
                  radius: 4, backgroundColor: NebulaColors.primary),
            ],
          ],
        ),
      ),
    );
  }
}
