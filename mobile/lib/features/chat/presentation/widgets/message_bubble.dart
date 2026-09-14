import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../../../core/theme/nebula_colors.dart';
import '../../../../core/theme/nebula_spacing.dart';
import '../../../../core/theme/nebula_typography.dart';
import '../../data/models/chat_model.dart';

class MessageBubble extends StatelessWidget {
  final ChatMessage message;
  final bool isCurrentUser;

  const MessageBubble({
    super.key,
    required this.message,
    required this.isCurrentUser,
  });

  String get _initial => message.senderName.isEmpty
      ? '?'
      : message.senderName.substring(0, 1).toUpperCase();

  @override
  Widget build(BuildContext context) {
    final timeString = DateFormat('HH:mm').format(message.timestamp);

    return Padding(
      padding: const EdgeInsets.only(bottom: NebulaSpacing.sm),
      child: Align(
        alignment: isCurrentUser ? Alignment.centerRight : Alignment.centerLeft,
        child: Row(
          mainAxisAlignment: isCurrentUser ? MainAxisAlignment.end : MainAxisAlignment.start,
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            if (!isCurrentUser) ...[
              Container(
                width: 32,
                height: 32,
                decoration: const BoxDecoration(
                  shape: BoxShape.circle,
                  color: NebulaColors.surfaceCard,
                ),
                child: message.senderAvatar.isNotEmpty
                    ? Image.network(
                        message.senderAvatar,
                        fit: BoxFit.cover,
                        errorBuilder: (context, error, stackTrace) {
                          return Center(
                            child: Text(
                              _initial,
                              style: NebulaTypography.caption.copyWith(
                                color: NebulaColors.textPrimary,
                              ),
                            ),
                          );
                        },
                      )
                    : Center(
                        child: Text(
                          _initial,
                          style: NebulaTypography.caption.copyWith(
                            color: NebulaColors.textPrimary,
                          ),
                        ),
                      ),
              ),
              const SizedBox(width: NebulaSpacing.sm),
            ],
            Flexible(
              child: Column(
                crossAxisAlignment: isCurrentUser ? CrossAxisAlignment.end : CrossAxisAlignment.start,
                children: [
                  if (!isCurrentUser)
                    Padding(
                      padding: const EdgeInsets.only(left: NebulaSpacing.sm, bottom: 4),
                      child: Text(
                        message.senderName,
                        style: NebulaTypography.caption.copyWith(
                          color: NebulaColors.textSecondary,
                        ),
                      ),
                    ),
                  Container(
                    constraints: BoxConstraints(
                      maxWidth: MediaQuery.of(context).size.width * 0.7,
                    ),
                    decoration: BoxDecoration(
                      color: isCurrentUser ? NebulaColors.primary : NebulaColors.surfaceCard,
                      borderRadius: BorderRadius.only(
                        topLeft: const Radius.circular(NebulaSpacing.md),
                        topRight: const Radius.circular(NebulaSpacing.md),
                        bottomLeft: Radius.circular(isCurrentUser ? NebulaSpacing.md : 0),
                        bottomRight: Radius.circular(isCurrentUser ? 0 : NebulaSpacing.md),
                      ),
                    ),
                    padding: const EdgeInsets.symmetric(
                      horizontal: NebulaSpacing.md,
                      vertical: NebulaSpacing.sm,
                    ),
                    child: Text(
                      message.content,
                      style: NebulaTypography.body2.copyWith(
                        color: isCurrentUser ? NebulaColors.textPrimary : NebulaColors.textPrimary,
                      ),
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.only(top: 4, left: NebulaSpacing.sm, right: NebulaSpacing.sm),
                    child: Text(
                      timeString,
                      style: NebulaTypography.caption.copyWith(
                        color: NebulaColors.textSecondary,
                        fontSize: 10,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            if (isCurrentUser) const SizedBox(width: NebulaSpacing.sm),
          ],
        ),
      ),
    );
  }
}
