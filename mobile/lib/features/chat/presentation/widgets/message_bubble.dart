import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../../../core/theme/nebula_spacing.dart';
import '../../../../core/theme/theme_context.dart';
import '../../../../core/widgets/primitives.dart';
import '../../data/models/chat_model.dart';

/// A single message.
///
/// Own messages sit on `scheme.primary`; everybody else's sit on
/// `scheme.surfaceContainerHighest`. Both read their foreground from the
/// matching `on*` role, so the bubble is legible in light mode as well as
/// dark. The timestamp is [Mono] — it is a figure the reader compares.
class MessageBubble extends StatelessWidget {
  const MessageBubble({
    super.key,
    required this.message,
    required this.isCurrentUser,
    this.timeState = TimeState.next,
  });

  final ChatMessage message;
  final bool isCurrentUser;

  /// Chat is the one place in the app where "now" is literal: a message that
  /// landed in the last couple of minutes comes in at [TimeState.now].
  final TimeState timeState;

  @override
  Widget build(BuildContext context) {
    final dl = context.dl;
    final scheme = context.scheme;
    final isNow = timeState.isNow;

    final bubbleColor =
        isCurrentUser ? scheme.primary : scheme.surfaceContainerHighest;
    final onBubble = isCurrentUser ? scheme.onPrimary : scheme.onSurface;
    // The stamp sits below the bubble, on the page ground — not on the
    // bubble fill — so it takes its colour from the time state, not from the
    // bubble's `on*` role.
    final stampColor = isNow ? dl.timeNow : dl.textTertiary;

    return Padding(
      padding: const EdgeInsets.only(bottom: NebulaSpacing.sm),
      child: Row(
        mainAxisAlignment:
            isCurrentUser ? MainAxisAlignment.end : MainAxisAlignment.start,
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          if (!isCurrentUser) ...[
            DAvatar(
              message.senderName,
              size: 30,
              imageUrl: message.senderAvatar,
            ),
            const SizedBox(width: NebulaSpacing.sm),
          ],
          Flexible(
            child: Column(
              crossAxisAlignment: isCurrentUser
                  ? CrossAxisAlignment.end
                  : CrossAxisAlignment.start,
              children: [
                if (!isCurrentUser)
                  Padding(
                    padding: const EdgeInsets.only(
                      left: NebulaSpacing.sm,
                      bottom: 3,
                    ),
                    child: Text(
                      message.senderName,
                      style: context.text.bodySmall?.copyWith(
                        fontSize: 11,
                        fontWeight: timeState.weight,
                        color: isNow ? dl.timeNow : dl.textTertiary,
                      ),
                    ),
                  ),
                Container(
                  constraints: BoxConstraints(
                    maxWidth: MediaQuery.sizeOf(context).width * 0.72,
                  ),
                  decoration: BoxDecoration(
                    color: bubbleColor,
                    border: isCurrentUser
                        ? null
                        : Border.all(
                            color: isNow ? dl.borderStrong : dl.border,
                          ),
                    borderRadius: BorderRadius.only(
                      topLeft: const Radius.circular(NebulaSpacing.md),
                      topRight: const Radius.circular(NebulaSpacing.md),
                      bottomLeft: Radius.circular(
                        isCurrentUser ? NebulaSpacing.md : 2,
                      ),
                      bottomRight: Radius.circular(
                        isCurrentUser ? 2 : NebulaSpacing.md,
                      ),
                    ),
                  ),
                  padding: const EdgeInsets.symmetric(
                    horizontal: NebulaSpacing.md,
                    vertical: 9,
                  ),
                  child: Text(
                    message.content,
                    style: context.text.bodyMedium?.copyWith(color: onBubble),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.only(
                    top: 3,
                    left: NebulaSpacing.sm,
                    right: NebulaSpacing.sm,
                  ),
                  child: Mono(
                    DateFormat('HH:mm').format(message.timestamp),
                    size: 10,
                    color: stampColor,
                  ),
                ),
              ],
            ),
          ),
          if (isCurrentUser) const SizedBox(width: NebulaSpacing.sm),
        ],
      ),
    );
  }
}
