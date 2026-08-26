import 'package:freezed_annotation/freezed_annotation.dart';

part 'socket_state.freezed.dart';

@freezed
class SocketState with _$SocketState {
  const factory SocketState.connecting() = _Connecting;
  const factory SocketState.connected() = _Connected;
  const factory SocketState.disconnected() = _Disconnected;
  const factory SocketState.error(String message) = _Error;
}
