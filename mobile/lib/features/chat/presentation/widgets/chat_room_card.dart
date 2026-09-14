import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../../../core/theme/nebula_colors.dart';
import '../../../../core/theme/nebula_spacing.dart';
import '../../../../core/theme/nebula_typography.dart';
import '../../data/models/chat_model.dart';

class ChatRoomCard extends StatelessWidget {
  final ChatRoom room;
  final VoidCallback onTap;

  const ChatRoomCard({
    super.key,
    required this.room,
    required this.onTap,
  });

  String get _initial =>
      room.name.isEmpty ? '?' : room.name.substring(0, 1).toUpperCase();

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        decoration: BoxDecoration(
          color: NebulaColors.surfaceCard,
          borderRadius: BorderRadius.circular(NebulaSpacing.md),
          border: Border.all(
            color: NebulaColors.surface,
            width: 1,
          ),
        ),
        padding: const EdgeInsets.all(NebulaSpacing.md),
        child: Row(
          children: [
            // Avatar
            Container(
              width: 56,
              height: 56,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: NebulaColors.surface,
                border: room.isOnline
                    ? Border.all(
                        color: NebulaColors.success,
                        width: 2,
                      )
                    : null,
              ),
              child: room.avatar != null && room.avatar!.isNotEmpty
                  ? Image.network(
                      room.avatar!,
                      fit: BoxFit.cover,
                      errorBuilder: (context, error, stackTrace) {
                        return Center(
                          child: Text(
                            _initial,
                            style: NebulaTypography.body1.copyWith(
                              color: NebulaColors.textPrimary,
                            ),
                          ),
                        );
                      },
                    )
                  : Center(
                      child: Text(
                        _initial,
                        style: NebulaTypography.body1.copyWith(
                          color: NebulaColors.textPrimary,
                        ),
                      ),
                    ),
            ),
            const SizedBox(width: NebulaSpacing.md),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Text(
                          room.name,
                          style: NebulaTypography.body1.copyWith(
                            color: NebulaColors.textPrimary,
                            fontWeight: FontWeight.w600,
                          ),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      if (room.lastMessageTime != null)
                        Text(
                          _formatTime(room.lastMessageTime!),
                          style: NebulaTypography.caption.copyWith(
                            color: NebulaColors.textSecondary,
                          ),
                        ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Text(
                          room.type == 'venture' ? '#${room.name.toLowerCase().replaceAll(' ', '-')}' : '@${room.name}',
                          style: NebulaTypography.caption.copyWith(
                            color: NebulaColors.textSecondary,
                          ),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      if (room.unreadCount > 0)
                        Container(
                          decoration: const BoxDecoration(
                            color: NebulaColors.critical,
                            shape: BoxShape.circle,
                          ),
                          padding: const EdgeInsets.all(4),
                          child: Text(
                            '${room.unreadCount}',
                            style: NebulaTypography.caption.copyWith(
                              color: NebulaColors.textPrimary,
                              fontSize: 10,
                            ),
                          ),
                        ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _formatTime(DateTime dateTime) {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final yesterday = today.subtract(const Duration(days: 1));
    final messageDate = DateTime(dateTime.year, dateTime.month, dateTime.day);

    if (messageDate == today) {
      return DateFormat('HH:mm').format(dateTime);
    } else if (messageDate == yesterday) {
      return 'Yesterday';
    } else if (now.difference(dateTime).inDays < 7) {
      return DateFormat('E').format(dateTime);
    } else {
      return DateFormat('dd/MM').format(dateTime);
    }
  }
}
