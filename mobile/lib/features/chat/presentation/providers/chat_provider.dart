import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../data/datasources/chat_data_source.dart';
import '../../data/models/chat_model.dart';
import '../../../core/api/api_client.dart';
import '../../../core/socket/socket_provider.dart';

// Chat data source provider
final chatDataSourceProvider = Provider<ChatDataSource>((ref) {
  final dio = ref.watch(dioProvider);
  final socketNotifier = ref.watch(socketProvider.notifier);
  return ChatDataSourceImpl(dio: dio, socket: socketNotifier.socket);
});

// Chat messages provider (family pattern for room-specific messages)
final chatMessagesProvider =
    StateNotifierProvider.family<ChatMessagesNotifier, List<ChatMessage>, String>(
  (ref, roomId) {
    return ChatMessagesNotifier(ref, roomId);
  },
);

class ChatMessagesNotifier extends StateNotifier<List<ChatMessage>> {
  final Ref ref;
  final String roomId;

  ChatMessagesNotifier(this.ref, this.roomId) : super([]) {
    _initialize();
  }

  Future<void> _initialize() async {
    try {
      final dataSource = ref.watch(chatDataSourceProvider);

      // Load message history
      final messages = await dataSource.getMessageHistory(roomId);
      state = messages;

      // Subscribe to real-time messages
      dataSource.subscribeToMessages(roomId, (message) {
        state = [...state, message];
      });

      // Join the room
      dataSource.joinRoom(roomId);
    } catch (e) {
      // Handle error
    }
  }

  void sendMessage({
    required String content,
    required int senderId,
    required String senderName,
    required String senderAvatar,
    int? receiverId,
    int? ventureId,
  }) {
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

    // Optimistic update
    state = [...state, message];

    // Send via socket
    final dataSource = ref.watch(chatDataSourceProvider);
    dataSource.sendMessage(message);
  }

  @override
  void dispose() {
    final dataSource = ref.watch(chatDataSourceProvider);
    dataSource.leaveRoom(roomId);
    super.dispose();
  }
}

// Chat rooms provider
final chatRoomsProvider = FutureProvider.autoDispose<List<ChatRoom>>((ref) async {
  final dataSource = ref.watch(chatDataSourceProvider);
  return dataSource.getChatRooms();
});

// Typing indicator provider
final typingUsersProvider = StateProvider.family<Set<int>, String>((ref, roomId) {
  return {};
});

// Unread count provider
final unreadCountProvider = StateProvider.family<int, String>((ref, roomId) {
  return 0;
});
