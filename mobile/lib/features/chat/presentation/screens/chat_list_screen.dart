import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../../../core/rbac/permissions.dart';
import '../../../../core/rbac/rbac_widgets.dart';
import '../../../../core/theme/nebula_spacing.dart';
import '../../../../core/widgets/data_display.dart';
import '../../../../core/widgets/motion.dart';
import '../../../../core/widgets/primitives.dart';
import '../../../../core/widgets/state_views.dart';
import '../../data/models/chat_model.dart';
import '../providers/chat_provider.dart';
import '../widgets/chat_room_card.dart';

/// The conversation list: venture channels first, then direct messages.
class ChatListScreen extends ConsumerWidget {
  const ChatListScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Messages'),
        centerTitle: false,
      ),
      body: const PermissionScope(
        permission: Permission.viewChat,
        what: 'messages',
        child: _ChatListBody(),
      ),
    );
  }
}

class _ChatListBody extends ConsumerWidget {
  const _ChatListBody();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final roomsAsync = ref.watch(chatRoomsProvider);

    return roomsAsync.when(
      loading: () => const Padding(
        padding: EdgeInsets.all(NebulaSpacing.md),
        child: ListSkeleton(),
      ),
      error: (error, _) => ErrorStateView(
        message: readableError(error),
        onRetry: () => ref.invalidate(chatRoomsProvider),
      ),
      data: (rooms) {
        if (rooms.isEmpty) {
          return const EmptyStateView(
            icon: LucideIcons.messageSquare,
            title: 'No conversations yet',
            message: 'Channels and direct messages will appear here.',
          );
        }

        final channels =
            rooms.where((r) => r.type == 'venture').toList(growable: false);
        final directs =
            rooms.where((r) => r.type != 'venture').toList(growable: false);

        return RefreshIndicator(
          onRefresh: () async => ref.invalidate(chatRoomsProvider),
          child: ListView(
            padding: const EdgeInsets.fromLTRB(
              NebulaSpacing.md,
              NebulaSpacing.sm,
              NebulaSpacing.md,
              NebulaSpacing.lg,
            ),
            children: [
              ..._group(context, 'Channels', channels, 0),
              ..._group(context, 'Direct messages', directs, channels.length),
            ],
          ),
        );
      },
    );
  }

  List<Widget> _group(
    BuildContext context,
    String label,
    List<ChatRoom> rooms,
    int indexOffset,
  ) {
    if (rooms.isEmpty) return const [];

    final unread = rooms.fold<int>(0, (sum, r) => sum + r.unreadCount);

    return [
      GroupHeader(label, count: rooms.length, tone: unread > 0 ? DTone.accent : null),
      for (var i = 0; i < rooms.length; i++)
        Padding(
          padding: const EdgeInsets.only(bottom: NebulaSpacing.sm),
          child: StaggerIn(
            index: indexOffset + i,
            child: ChatRoomCard(
              room: rooms[i],
              onTap: () => context.push('/chat/${rooms[i].id}'),
            ),
          ),
        ),
    ];
  }
}
