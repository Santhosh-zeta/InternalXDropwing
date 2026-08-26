import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/theme/nebula_colors.dart';
import '../../../../core/theme/nebula_spacing.dart';
import '../../../../core/theme/nebula_typography.dart';
import '../providers/chat_provider.dart';
import '../widgets/chat_room_card.dart';

class ChatListScreen extends ConsumerWidget {
  const ChatListScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final chatRoomsAsync = ref.watch(chatRoomsProvider);

    return Scaffold(
      backgroundColor: NebulaColors.background,
      appBar: AppBar(
        backgroundColor: NebulaColors.surfaceCard,
        elevation: 0,
        title: Text(
          'Messages',
          style: NebulaTypography.heading1.copyWith(
            color: NebulaColors.textPrimary,
          ),
        ),
        centerTitle: false,
      ),
      body: chatRoomsAsync.when(
        data: (rooms) {
          if (rooms.isEmpty) {
            return _CenteredMessage(
              icon: Icons.message_outlined,
              title: 'No conversations yet',
              subtitle: 'Channels and direct messages will appear here.',
              onRetry: () => ref.invalidate(chatRoomsProvider),
            );
          }

          return RefreshIndicator(
            color: NebulaColors.highlight,
            backgroundColor: NebulaColors.surfaceCard,
            onRefresh: () async => ref.invalidate(chatRoomsProvider),
            child: ListView.builder(
              itemCount: rooms.length,
              padding: const EdgeInsets.symmetric(
                vertical: NebulaSpacing.md,
                horizontal: NebulaSpacing.md,
              ),
              itemBuilder: (context, index) {
                final room = rooms[index];
                return Padding(
                  padding: const EdgeInsets.only(bottom: NebulaSpacing.sm),
                  child: ChatRoomCard(
                    room: room,
                    onTap: () => context.push('/chat/${room.id}'),
                  ),
                );
              },
            ),
          );
        },
        loading: () => const Center(
          child: CircularProgressIndicator(
            valueColor: AlwaysStoppedAnimation<Color>(NebulaColors.highlight),
          ),
        ),
        error: (error, stack) => _CenteredMessage(
          icon: Icons.wifi_off_outlined,
          title: 'Could not load conversations',
          subtitle: 'Check your connection and try again.',
          onRetry: () => ref.invalidate(chatRoomsProvider),
        ),
      ),
    );
  }
}

class _CenteredMessage extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback onRetry;

  const _CenteredMessage({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.onRetry,
  });

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(NebulaSpacing.lg),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, size: 64, color: NebulaColors.textSecondary),
            const SizedBox(height: NebulaSpacing.md),
            Text(
              title,
              textAlign: TextAlign.center,
              style: NebulaTypography.body1.copyWith(
                color: NebulaColors.textPrimary,
              ),
            ),
            const SizedBox(height: NebulaSpacing.sm),
            Text(
              subtitle,
              textAlign: TextAlign.center,
              style: NebulaTypography.caption.copyWith(
                color: NebulaColors.textSecondary,
              ),
            ),
            const SizedBox(height: NebulaSpacing.md),
            TextButton(
              onPressed: onRetry,
              child: const Text(
                'Retry',
                style: TextStyle(color: NebulaColors.highlight),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
