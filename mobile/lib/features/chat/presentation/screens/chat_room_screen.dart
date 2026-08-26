import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../../core/theme/nebula_colors.dart';
import '../../../core/theme/nebula_spacing.dart';
import '../../../core/theme/nebula_typography.dart';
import '../../data/models/chat_model.dart';
import '../../../features/auth/presentation/providers/auth_provider.dart';
import '../providers/chat_provider.dart';
import '../widgets/message_bubble.dart';

class ChatRoomScreen extends ConsumerStatefulWidget {
  final String roomId;

  const ChatRoomScreen({
    Key? key,
    required this.roomId,
  }) : super(key: key);

  @override
  ConsumerState<ChatRoomScreen> createState() => _ChatRoomScreenState();
}

class _ChatRoomScreenState extends ConsumerState<ChatRoomScreen> {
  late TextEditingController _messageController;
  late ScrollController _scrollController;
  bool _isComposing = false;

  @override
  void initState() {
    super.initState();
    _messageController = TextEditingController();
    _scrollController = ScrollController();
  }

  @override
  void dispose() {
    _messageController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  void _scrollToBottom() {
    if (_scrollController.hasClients) {
      _scrollController.animateTo(
        _scrollController.position.maxScrollExtent,
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeOut,
      );
    }
  }

  void _sendMessage() {
    if (_messageController.text.isEmpty) return;

    final authState = ref.watch(authProvider);
    authState.maybeWhen(
      authenticated: (user) {
        ref.read(chatMessagesProvider(widget.roomId).notifier).sendMessage(
          content: _messageController.text,
          senderId: user.id,
          senderName: user.fullName,
          senderAvatar: user.avatarUrl ?? '',
        );
        _messageController.clear();
        setState(() => _isComposing = false);
        _scrollToBottom();
      },
      orElse: () {},
    );
  }

  @override
  Widget build(BuildContext context) {
    final messagesAsync = ref.watch(chatMessagesProvider(widget.roomId));
    final authState = ref.watch(authProvider);

    return Scaffold(
      backgroundColor: NebulaColors.background,
      appBar: AppBar(
        backgroundColor: NebulaColors.surfaceCard,
        elevation: 0,
        title: Text(
          widget.roomId.startsWith('venture_') ? 'Channel' : 'Direct Message',
          style: NebulaTypography.body1.copyWith(
            color: NebulaColors.textPrimary,
          ),
        ),
        centerTitle: false,
      ),
      body: Column(
        children: [
          Expanded(
            child: messagesAsync.when(
              data: (messages) {
                WidgetsBinding.instance.addPostFrameCallback((_) {
                  _scrollToBottom();
                });

                if (messages.isEmpty) {
                  return Center(
                    child: Text(
                      'No messages yet',
                      style: NebulaTypography.body1.copyWith(
                        color: NebulaColors.textSecondary,
                      ),
                    ),
                  );
                }

                return ListView.builder(
                  controller: _scrollController,
                  itemCount: messages.length,
                  padding: EdgeInsets.all(NebulaSpacing.md),
                  itemBuilder: (context, index) {
                    final message = messages[index];
                    final isCurrentUser = authState.maybeWhen(
                      authenticated: (user) => message.senderId == user.id,
                      orElse: () => false,
                    );

                    // Group messages by date
                    final showDateDivider = index == 0 ||
                        !_sameDay(messages[index - 1].timestamp, message.timestamp);

                    return Column(
                      children: [
                        if (showDateDivider)
                          Padding(
                            padding: EdgeInsets.symmetric(vertical: NebulaSpacing.md),
                            child: Text(
                              DateFormat('MMMM dd, yyyy').format(message.timestamp),
                              style: NebulaTypography.caption.copyWith(
                                color: NebulaColors.textSecondary,
                              ),
                            ),
                          ),
                        MessageBubble(
                          message: message,
                          isCurrentUser: isCurrentUser,
                        ),
                      ],
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
                  'Error loading messages',
                  style: NebulaTypography.body1.copyWith(
                    color: NebulaColors.critical,
                  ),
                ),
              ),
            ),
          ),
          Container(
            color: NebulaColors.surfaceCard,
            padding: EdgeInsets.all(NebulaSpacing.md),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _messageController,
                    style: NebulaTypography.body1.copyWith(
                      color: NebulaColors.textPrimary,
                    ),
                    decoration: InputDecoration(
                      hintText: 'Message...',
                      hintStyle: NebulaTypography.body1.copyWith(
                        color: NebulaColors.textSecondary,
                      ),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(NebulaSpacing.md),
                        borderSide: BorderSide(
                          color: NebulaColors.surface,
                        ),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(NebulaSpacing.md),
                        borderSide: BorderSide(
                          color: NebulaColors.highlight,
                        ),
                      ),
                      filled: true,
                      fillColor: NebulaColors.surface,
                      contentPadding: EdgeInsets.symmetric(
                        horizontal: NebulaSpacing.md,
                        vertical: NebulaSpacing.sm,
                      ),
                    ),
                    onChanged: (value) {
                      setState(() => _isComposing = value.isNotEmpty);
                    },
                    maxLines: null,
                  ),
                ),
                SizedBox(width: NebulaSpacing.sm),
                FloatingActionButton(
                  mini: true,
                  backgroundColor: _isComposing ? NebulaColors.primary : NebulaColors.textSecondary,
                  onPressed: _isComposing ? _sendMessage : null,
                  child: Icon(
                    Icons.send,
                    color: NebulaColors.textPrimary,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  bool _sameDay(DateTime a, DateTime b) {
    return a.year == b.year && a.month == b.month && a.day == b.day;
  }
}
