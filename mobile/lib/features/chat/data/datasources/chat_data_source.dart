import 'package:dio/dio.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;
import '../models/chat_model.dart';

abstract class ChatDataSource {
  Future<List<ChatMessage>> getMessageHistory(String roomId);
  Future<List<ChatRoom>> getChatRooms();
  void subscribeToMessages(String roomId, Function(ChatMessage) onMessage);
  void sendMessage(ChatMessage message);
  void joinRoom(String roomId);
  void leaveRoom(String roomId);
}

class ChatDataSourceImpl implements ChatDataSource {
  final Dio dio;
  final io.Socket socket;

  ChatDataSourceImpl({required this.dio, required this.socket});

  @override
  Future<List<ChatMessage>> getMessageHistory(String roomId) async {
    try {
      final response = await dio.get('/chat/messages', queryParameters: {'roomId': roomId});
      final List<dynamic> data = response.data['data'] ?? [];
      return data.map((msg) => ChatMessage.fromJson(msg as Map<String, dynamic>)).toList();
    } catch (e) {
      throw Exception('Failed to load message history: $e');
    }
  }

  @override
  Future<List<ChatRoom>> getChatRooms() async {
    try {
      final response = await dio.get('/chat/rooms');
      final List<dynamic> data = response.data['data'] ?? [];
      return data.map((room) => ChatRoom.fromJson(room as Map<String, dynamic>)).toList();
    } catch (e) {
      throw Exception('Failed to load chat rooms: $e');
    }
  }

  @override
  void subscribeToMessages(String roomId, Function(ChatMessage) onMessage) {
    socket.on('message_$roomId', (data) {
      try {
        final message = ChatMessage.fromJson(data as Map<String, dynamic>);
        onMessage(message);
      } catch (e) {
        // Handle parsing error
      }
    });
  }

  @override
  void sendMessage(ChatMessage message) {
    socket.emit('send_message', message.toJson());
  }

  @override
  void joinRoom(String roomId) {
    socket.emit('join_channel', {'channelId': roomId});
  }

  @override
  void leaveRoom(String roomId) {
    socket.emit('leave_channel', {'channelId': roomId});
  }
}
