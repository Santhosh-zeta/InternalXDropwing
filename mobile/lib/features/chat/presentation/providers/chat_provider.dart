import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/api/api_client.dart';
import '../../data/datasources/chat_data_source.dart';
import '../../data/datasources/chat_socket.dart';
import '../../data/models/chat_model.dart';

/// Chat data source. Async because the Socket.IO handshake needs the JWT,
/// which only comes back from secure storage asynchronously.
final chatDataSourceProvider = FutureProvider<ChatDataSource>((ref) async {
  final dio = ref.watch(dioProvider);
  final socket = await ref.watch(chatSocketProvider.future);
  return ChatDataSourceImpl(dio: dio, socket: socket);
});

/// Messages for a single room, keyed by room id.
final chatMessagesProvider = StateNotifierProvider.family<ChatMessagesNotifier,
    AsyncValue<List<ChatMessage>>, String>(
  (ref, roomId) => ChatMessagesNotifier(ref, roomId),
);

class ChatMessagesNotifier
    extends StateNotifier<AsyncValue<List<ChatMessage>>> {
  final Ref _ref;
  final String roomId;

  ChatDataSource? _dataSource;
  bool _disposed = false;

  ChatMessagesNotifier(this._ref, this.roomId)
      : super(const AsyncValue<List<ChatMessage>>.loading()) {
    _initialize();
  }

  List<ChatMessage> get _current =>
      state.valueOrNull ?? const <ChatMessage>[];

  Future<void> _initialize() async {
    try {
      final dataSource = await _ref.read(chatDataSourceProvider.future);
      if (_disposed) return;
      _dataSource = dataSource;

      final messages = await dataSource.getMessageHistory(roomId);
      if (_disposed) return;
      state = AsyncValue<List<ChatMessage>>.data(messages);

      dataSource.subscribeToMessages(roomId, (message) {
        if (_disposed) return;
        final current = _current;
        // The sender already added this optimistically.
        if (current.any((m) => m.id == message.id)) return;
        state = AsyncValue<List<ChatMessage>>.data(
          <ChatMessage>[...current, message],
        );
      });

      dataSource.joinRoom(roomId);
    } catch (error, stackTrace) {
      if (_disposed) return;
      state = AsyncValue<List<ChatMessage>>.error(error, stackTrace);
    }
  }

  /// Retry after a failed load.
  Future<void> refresh() async {
    if (_disposed) return;
    state = const AsyncValue<List<ChatMessage>>.loading();
    await _initialize();
  }

  /// Returns `false` when the socket is not ready yet, so the UI can say so
  /// instead of silently dropping the message.
  bool sendMessage({
    required String content,
    required int senderId,
    required String senderName,
    required String senderAvatar,
    int? receiverId,
    int? ventureId,
  }) {
    final dataSource = _dataSource;
    if (dataSource == null) return false;

    final message = ChatMessage(
      id: DateTime.now().millisecondsSinceEpoch,
      senderId: senderId,
      senderName: senderName,
      senderAvatar: senderAvatar,
      content: content,
      timestamp: DateTime.now(),
      roomId: roomId,
      receiverId: receiverId,
      ventureId: ventureId,
    );

    // Optimistic update.
    state = AsyncValue<List<ChatMessage>>.data(
      <ChatMessage>[..._current, message],
    );

    dataSource.sendMessage(message);
    return true;
  }

  @override
  void dispose() {
    _disposed = true;
    super.dispose();
  }
}

/// List of rooms available to the signed-in user.
final chatRoomsProvider =
    FutureProvider.autoDispose<List<ChatRoom>>((ref) async {
  final dataSource = await ref.watch(chatDataSourceProvider.future);
  return dataSource.getChatRooms();
});

/// Users currently typing in a room.
final typingUsersProvider =
    StateProvider.family<Set<int>, String>((ref, roomId) => <int>{});

/// Unread message count for a room.
final unreadCountProvider =
    StateProvider.family<int, String>((ref, roomId) => 0);
