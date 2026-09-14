import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;

import '../../../../core/rbac/permissions.dart';
import '../../../../core/rbac/rbac_widgets.dart';
import '../../../../core/theme/nebula_spacing.dart';
import '../../../../core/theme/nebula_typography.dart';
import '../../../../core/theme/theme_context.dart';
import '../../../../core/widgets/data_display.dart';
import '../../../../core/widgets/motion.dart';
import '../../../../core/widgets/primitives.dart';
import '../../../../core/widgets/state_views.dart';
import '../../../auth/presentation/providers/auth_provider.dart';
import '../../data/datasources/chat_socket.dart';
import '../providers/chat_provider.dart';
import '../widgets/message_bubble.dart';

/// A message a room received inside this window still counts as *now*, and so
/// renders at full contrast. Chat is the one place where that is literal.
const Duration _liveWindow = Duration(minutes: 2);

class ChatRoomScreen extends ConsumerStatefulWidget {
  const ChatRoomScreen({super.key, required this.roomId});

  final String roomId;

  @override
  ConsumerState<ChatRoomScreen> createState() => _ChatRoomScreenState();
}

class _ChatRoomScreenState extends ConsumerState<ChatRoomScreen> {
  final TextEditingController _messageController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  bool _isComposing = false;

  bool get _isChannel => widget.roomId.startsWith('venture_');

  /// `venture_7` → 7. The server's `send_message` handler routes on
  /// `ventureId` / `receiverId`, so the room id has to be decoded back into
  /// one of them or the message is persisted but never broadcast.
  int? get _ventureId => _isChannel
      ? int.tryParse(widget.roomId.substring('venture_'.length))
      : null;

  /// `dm_42` → 42.
  int? get _receiverId => widget.roomId.startsWith('dm_')
      ? int.tryParse(widget.roomId.substring('dm_'.length))
      : null;

  @override
  void dispose() {
    _messageController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  void _scrollToBottom() {
    if (!mounted || !_scrollController.hasClients) return;
    _scrollController.animateTo(
      _scrollController.position.maxScrollExtent,
      duration: Motion.slow,
      curve: Motion.entrance,
    );
  }

  void _notify(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  void _sendMessage() {
    final text = _messageController.text.trim();
    if (text.isEmpty) return;

    ref.read(authProvider).maybeWhen(
          authenticated: (user) {
            final sent = ref
                .read(chatMessagesProvider(widget.roomId).notifier)
                .sendMessage(
                  content: text,
                  senderId: user.id,
                  senderName: user.fullName,
                  senderAvatar: user.avatarUrl ?? '',
                  ventureId: _ventureId,
                  receiverId: _receiverId,
                );

            if (!sent) {
              _notify('Still connecting — message not sent yet.');
              return;
            }

            _messageController.clear();
            setState(() => _isComposing = false);
            WidgetsBinding.instance
                .addPostFrameCallback((_) => _scrollToBottom());
          },
          orElse: () =>
              _notify('You need to be signed in to send messages.'),
        );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        centerTitle: false,
        title: Row(
          children: [
            Flexible(
              child: Text(
                _isChannel ? 'Channel' : 'Direct message',
                overflow: TextOverflow.ellipsis,
              ),
            ),
            const SizedBox(width: NebulaSpacing.sm),
            const _ConnectionIndicator(),
          ],
        ),
      ),
      body: PermissionScope(
        permission: Permission.viewChat,
        what: 'messages',
        child: Column(
          children: [
            Expanded(child: _messages()),
            _Composer(
              controller: _messageController,
              isComposing: _isComposing,
              onChanged: (value) {
                final composing = value.trim().isNotEmpty;
                if (composing != _isComposing) {
                  setState(() => _isComposing = composing);
                }
              },
              onSend: _sendMessage,
            ),
          ],
        ),
      ),
    );
  }

  Widget _messages() {
    final messagesAsync = ref.watch(chatMessagesProvider(widget.roomId));
    final authState = ref.watch(authProvider);

    return messagesAsync.when(
      loading: () => const Padding(
        padding: EdgeInsets.all(NebulaSpacing.md),
        child: ListSkeleton(count: 4),
      ),
      error: (error, _) => ErrorStateView(
        message: readableError(error),
        onRetry: () =>
            ref.read(chatMessagesProvider(widget.roomId).notifier).refresh(),
      ),
      data: (messages) {
        if (messages.isEmpty) {
          return const EmptyStateView(
            icon: LucideIcons.messageSquare,
            title: 'No messages yet',
            message: 'Say something to start this conversation.',
          );
        }

        WidgetsBinding.instance.addPostFrameCallback((_) => _scrollToBottom());
        final now = DateTime.now();

        return ListView.builder(
          controller: _scrollController,
          itemCount: messages.length,
          padding: const EdgeInsets.symmetric(
            horizontal: NebulaSpacing.md,
            vertical: NebulaSpacing.sm,
          ),
          itemBuilder: (context, index) {
            final message = messages[index];
            final isCurrentUser = authState.maybeWhen(
              authenticated: (user) => message.senderId == user.id,
              orElse: () => false,
            );
            final showDivider = index == 0 ||
                !_sameDay(messages[index - 1].timestamp, message.timestamp);

            return Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                if (showDivider) GroupHeader(_dayLabel(message.timestamp, now)),
                MessageBubble(
                  message: message,
                  isCurrentUser: isCurrentUser,
                  timeState:
                      now.difference(message.timestamp).abs() <= _liveWindow
                          ? TimeState.now
                          : TimeState.next,
                ),
              ],
            );
          },
        );
      },
    );
  }

  static bool _sameDay(DateTime a, DateTime b) =>
      a.year == b.year && a.month == b.month && a.day == b.day;

  static String _dayLabel(DateTime when, DateTime now) {
    final today = DateTime(now.year, now.month, now.day);
    final day = DateTime(when.year, when.month, when.day);
    if (day == today) return 'Today';
    if (day == today.subtract(const Duration(days: 1))) return 'Yesterday';
    return DateFormat('d MMM yyyy').format(when);
  }
}

/// Live socket state. This is the app's one legitimate [LiveDot]: the
/// connection is either happening now or it is not.
class _ConnectionIndicator extends ConsumerStatefulWidget {
  const _ConnectionIndicator();

  @override
  ConsumerState<_ConnectionIndicator> createState() =>
      _ConnectionIndicatorState();
}

class _ConnectionIndicatorState extends ConsumerState<_ConnectionIndicator> {
  io.Socket? _socket;
  bool _connected = false;

  void _onConnect(dynamic _) {
    if (mounted) setState(() => _connected = true);
  }

  void _onDisconnect(dynamic _) {
    if (mounted) setState(() => _connected = false);
  }

  void _attach(io.Socket socket) {
    if (identical(_socket, socket)) return;
    _detach();
    _socket = socket;
    _connected = socket.connected;
    socket.on('connect', _onConnect);
    socket.on('disconnect', _onDisconnect);
  }

  void _detach() {
    final socket = _socket;
    if (socket == null) return;
    socket.off('connect', _onConnect);
    socket.off('disconnect', _onDisconnect);
    _socket = null;
  }

  @override
  void dispose() {
    _detach();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final socketAsync = ref.watch(chatSocketProvider);
    final socket = socketAsync.valueOrNull;
    if (socket != null) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) _attach(socket);
      });
    }

    final dl = context.dl;
    final live = socket != null && _connected;

    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        if (live)
          const LiveDot(size: 6)
        else
          Container(
            width: 6,
            height: 6,
            decoration: BoxDecoration(
              color: socketAsync.hasError ? dl.critical : dl.textTertiary,
              shape: BoxShape.circle,
            ),
          ),
        const SizedBox(width: 6),
        Text(
          live ? 'LIVE' : (socketAsync.hasError ? 'OFFLINE' : 'CONNECTING'),
          style: NebulaTypography.monoLabel(
            color: live
                ? dl.timeNow
                : (socketAsync.hasError ? dl.critical : dl.textTertiary),
            fontSize: 9,
          ),
        ),
      ],
    );
  }
}

class _Composer extends StatelessWidget {
  const _Composer({
    required this.controller,
    required this.isComposing,
    required this.onChanged,
    required this.onSend,
  });

  final TextEditingController controller;
  final bool isComposing;
  final ValueChanged<String> onChanged;
  final VoidCallback onSend;

  @override
  Widget build(BuildContext context) {
    final dl = context.dl;
    final scheme = context.scheme;

    return Container(
      decoration: BoxDecoration(
        color: scheme.surfaceContainerHighest,
        border: Border(top: BorderSide(color: dl.border)),
      ),
      padding: EdgeInsets.fromLTRB(
        NebulaSpacing.md,
        NebulaSpacing.sm,
        NebulaSpacing.md,
        NebulaSpacing.sm + MediaQuery.viewPaddingOf(context).bottom,
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          Expanded(
            child: TextField(
              controller: controller,
              onChanged: onChanged,
              maxLines: 5,
              minLines: 1,
              textCapitalization: TextCapitalization.sentences,
              style: context.text.bodyMedium,
              decoration: InputDecoration(
                hintText: 'Message…',
                isDense: true,
                filled: true,
                fillColor: dl.surfaceRaised,
                contentPadding: const EdgeInsets.symmetric(
                  horizontal: NebulaSpacing.md,
                  vertical: 11,
                ),
                border: OutlineInputBorder(
                  borderRadius:
                      BorderRadius.circular(NebulaSpacing.radiusMd),
                  borderSide: BorderSide(color: dl.border),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius:
                      BorderRadius.circular(NebulaSpacing.radiusMd),
                  borderSide: BorderSide(color: dl.border),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius:
                      BorderRadius.circular(NebulaSpacing.radiusMd),
                  borderSide: BorderSide(color: scheme.primary),
                ),
              ),
            ),
          ),
          const SizedBox(width: NebulaSpacing.sm),
          PressScale(
            onTap: isComposing ? onSend : null,
            child: Container(
              width: 42,
              height: 42,
              decoration: BoxDecoration(
                color: isComposing ? scheme.primary : dl.surfaceRaised,
                borderRadius:
                    BorderRadius.circular(NebulaSpacing.radiusMd),
                border: Border.all(
                  color: isComposing ? scheme.primary : dl.border,
                ),
              ),
              child: Icon(
                LucideIcons.send,
                size: 17,
                color: isComposing ? scheme.onPrimary : dl.textTertiary,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
