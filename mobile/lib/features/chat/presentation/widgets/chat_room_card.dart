import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../../../core/theme/nebula_colors.dart';
import '../../../../core/theme/theme_context.dart';
import '../../../../core/widgets/data_display.dart';
import '../../../../core/widgets/primitives.dart';
import '../../data/models/chat_model.dart';

/// One room in the conversation list.
///
/// This is an [EntityRow] like every other list row in the app: a [DAvatar]
/// leads, the room handle and the time of the last message sit in `meta`, and
/// an unread count rides in the trailing slot as an accent [DTag].
///
/// The model carries no last-message *text* (`/chat/rooms` returns only
/// `lastMessageTime`), so none is rendered — a preview line here would be
/// invented data.
class ChatRoomCard extends StatelessWidget {
  const ChatRoomCard({
    super.key,
    required this.room,
    required this.onTap,
  });

  final ChatRoom room;
  final VoidCallback onTap;

  bool get _isChannel => room.type == 'venture';

  /// `#product-team` for a channel, `@Asha Rao` for a direct message.
  String get _handle => _isChannel
      ? '#${room.name.toLowerCase().replaceAll(RegExp(r'\s+'), '-')}'
      : '@${room.name}';

  @override
  Widget build(BuildContext context) {
    final dl = context.dl;
    final unread = room.unreadCount;

    return EntityRow(
      title: room.name,
      onTap: onTap,
      leading: DAvatar(room.name, imageUrl: room.avatar),
      // Hue means venture and nothing else: only a venture channel gets a
      // spine, coloured by the venture it belongs to.
      spineColor: _isChannel && room.ventureId != null
          ? NebulaColors.forVentureId(room.ventureId)
          : null,
      meta: [
        Text(_handle, overflow: TextOverflow.ellipsis),
        if (room.lastMessageTime != null)
          Mono(
            _shortTime(room.lastMessageTime!),
            size: 10.5,
            color: dl.textTertiary,
          ),
        if (room.isOnline)
          Text('Online', style: TextStyle(color: dl.success)),
      ],
      trailing: unread > 0
          ? DTag('$unread', tone: DTone.accent)
          : null,
    );
  }

  static String _shortTime(DateTime when) {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final day = DateTime(when.year, when.month, when.day);

    if (day == today) return DateFormat('HH:mm').format(when);
    if (day == today.subtract(const Duration(days: 1))) return 'Yesterday';
    if (today.difference(day).inDays < 7) return DateFormat('E').format(when);
    return DateFormat('dd/MM').format(when);
  }
}
