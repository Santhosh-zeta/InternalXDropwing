import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;

import '../../../../core/cache/secure_storage_provider.dart';
import '../../../../core/config/app_config.dart';

/// Socket.IO connection owned by the chat feature.
///
/// The chat feature owns this connection outright — there is no app-wide
/// socket provider to defer to.
///
/// The connection is established lazily the first time chat is opened, and the
/// JWT is attached via the Socket.IO handshake `auth` payload (the same token
/// the Dio client sends as a bearer header).
final chatSocketProvider = FutureProvider<io.Socket>((ref) async {
  const envUrl = String.fromEnvironment('API_URL');
  final baseUrl = envUrl.isNotEmpty ? envUrl : AppConfig.baseUrl;

  // The REST base URL ends in `/api`; the Socket.IO server sits at the origin.
  final socketUrl = baseUrl.replaceAll(RegExp(r'/api.*$'), '');

  String? token;
  try {
    token = await ref.read(secureStorageProvider).read(key: 'jwt_token');
  } catch (_) {
    token = null;
  }

  final socket = io.io(
    socketUrl,
    <String, dynamic>{
      'transports': <String>['websocket'],
      'autoConnect': false,
      'auth': <String, dynamic>{'token': token},
    },
  );

  ref.onDispose(() {
    socket.disconnect();
  });

  socket.connect();
  return socket;
});
