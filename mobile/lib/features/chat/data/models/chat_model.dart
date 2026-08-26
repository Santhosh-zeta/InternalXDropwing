import 'package:freezed_annotation/freezed_annotation.dart';

part 'chat_model.freezed.dart';
part 'chat_model.g.dart';

@freezed
class ChatMessage with _$ChatMessage {
  const factory ChatMessage({
    required int id,
    required int senderId,
    @JsonKey(name: 'senderName') required String senderName,
    @JsonKey(name: 'senderAvatar') required String senderAvatar,
    required String content,
    required DateTime timestamp,
    @JsonKey(name: 'ventureId') int? ventureId,
    @JsonKey(name: 'receiverId') int? receiverId,
    required String roomId, // 'venture_X' or 'dm_Y'
    @Default(false) bool isRead,
  }) = _ChatMessage;

  factory ChatMessage.fromJson(Map<String, dynamic> json) => _$ChatMessageFromJson(json);
}

@freezed
class ChatRoom with _$ChatRoom {
  const factory ChatRoom({
    required String id,
    required String name,
    required String type, // 'venture' or 'dm'
    @JsonKey(name: 'ventureId') int? ventureId,
    @Default(false) bool isOnline,
    @Default(0) int unreadCount,
    String? avatar,
    DateTime? lastMessageTime,
  }) = _ChatRoom;

  factory ChatRoom.fromJson(Map<String, dynamic> json) => _$ChatRoomFromJson(json);
}
