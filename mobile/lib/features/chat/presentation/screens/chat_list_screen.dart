import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/theme/nebula_colors.dart';
import '../../../core/theme/nebula_spacing.dart';
import '../../../core/theme/nebula_typography.dart';
import '../../data/models/chat_model.dart';
import '../providers/chat_provider.dart';
import '../widgets/chat_room_card.dart';

class ChatListScreen extends ConsumerWidget {
  const ChatListScreen({Key? key}) : super(key: key);

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
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    Icons.message_outlined,
                    size: 64,
                    color: NebulaColors.textSecondary,
                  ),
                  SizedBox(height: NebulaSpacing.md),
                  Text(
                    'No messages yet',
                    style: NebulaTypography.body1.copyWith(
                      color: NebulaColors.textSecondary,
                    ),
                  ),
                ],
              ),
            );
          }

          return ListView.builder(
            itemCount: rooms.length,
            padding: EdgeInsets.symmetric(
              vertical: NebulaSpacing.md,
              horizontal: NebulaSpacing.md,
            ),
            itemBuilder: (context, index) {
              final room = rooms[index];
              return Padding(
                padding: EdgeInsets.only(bottom: NebulaSpacing.sm),
                child: ChatRoomCard(
                  room: room,
                  onTap: () => context.push('/chat/${room.id}'),
                ),
              );
            },
          );
        },
        loading: () => Center(
          child: CircularProgressIndicator(
            valueColor: AlwaysStoppedAnimation<Color>(NebulaColors.highlight),
          ),
        ),
        error: (error, stack) => Center(
          child: Text(
            'Error loading chats',
            style: NebulaTypography.body1.copyWith(
              color: NebulaColors.critical,
            ),
          ),
        ),
      ),
    );
  }
}
