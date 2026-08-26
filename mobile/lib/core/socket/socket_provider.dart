import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;
import '../cache/secure_storage_provider.dart';
import '../config/app_config.dart';
import 'socket_state.dart';

final socketProvider = StateNotifierProvider<SocketNotifier, SocketState>((ref) {
  return SocketNotifier(ref);
});

class SocketNotifier extends StateNotifier<SocketState> {
  final Ref ref;
  late io.Socket socket;

  SocketNotifier(this.ref) : super(const SocketState.disconnected());

  Future<void> connect() async {
    try {
      state = const SocketState.connecting();

      final secureStorage = ref.watch(secureStorageProvider);
      final token = await secureStorage.read(key: 'jwt_token');

      final String socketUrl = AppConfig.baseUrl.replaceAll(RegExp(r'/api.*'), '');

      socket = io.io(
        socketUrl,
        io.SocketIoClientOptions(
          auth: {'token': token},
          transports: ['websocket'],
          reconnection: true,
          reconnectionDelay: const Duration(seconds: 1),
          reconnectionDelayMax: const Duration(seconds: 5),
          reconnectionAttempts: 5,
        ),
      );

      socket.on('connect', (_) {
        state = const SocketState.connected();
      });

      socket.on('disconnect', (_) {
        state = const SocketState.disconnected();
      });

      socket.on('error', (error) {
        state = SocketState.error(error.toString());
      });

      socket.connect();
    } catch (e) {
      state = SocketState.error(e.toString());
    }
  }

  void disconnect() {
    socket.disconnect();
    state = const SocketState.disconnected();
  }

  void joinRoom(String roomId) {
    socket.emit('join_channel', {'channelId': roomId});
  }

  void leaveRoom(String roomId) {
    socket.emit('leave_channel', {'channelId': roomId});
  }

  void sendMessage({
    required String content,
    required String roomId,
    int? receiverId,
    int? ventureId,
  }) {
    socket.emit('send_message', {
      'content': content,
      'roomId': roomId,
      'receiverId': receiverId,
      'ventureId': ventureId,
    });
  }

  void onMessage(Function(dynamic) callback) {
    socket.on('message', callback);
  }

  void onTyping(Function(dynamic) callback) {
    socket.on('typing', callback);
  }

  void sendTyping({required String roomId, required bool isTyping}) {
    socket.emit('typing', {
      'roomId': roomId,
      'isTyping': isTyping,
    });
  }

  @override
  void dispose() {
    socket.disconnect();
    super.dispose();
  }
}
