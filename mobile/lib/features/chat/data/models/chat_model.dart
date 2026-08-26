// Plain Dart models for the chat feature.
//
// These were originally declared with `@freezed`, but the generated
// `chat_model.freezed.dart` / `chat_model.g.dart` parts were never checked in,
// which made every file in `lib/features/chat/` fail to compile the moment it
// was reachable from `main.dart`. They are hand-written here so the feature
// builds without a `build_runner` step.

int? _asIntOrNull(dynamic value) {
  if (value == null) return null;
  if (value is int) return value;
  if (value is num) return value.toInt();
  return int.tryParse(value.toString());
}

int _asInt(dynamic value, {int fallback = 0}) => _asIntOrNull(value) ?? fallback;

String _asString(dynamic value, {String fallback = ''}) {
  if (value == null) return fallback;
  return value.toString();
}

bool _asBool(dynamic value, {bool fallback = false}) {
  if (value == null) return fallback;
  if (value is bool) return value;
  if (value is num) return value != 0;
  final text = value.toString().toLowerCase();
  if (text == 'true' || text == '1') return true;
  if (text == 'false' || text == '0') return false;
  return fallback;
}

DateTime? _asDateOrNull(dynamic value) {
  if (value == null) return null;
  if (value is DateTime) return value;
  if (value is int) return DateTime.fromMillisecondsSinceEpoch(value);
  return DateTime.tryParse(value.toString());
}

class ChatMessage {
  final int id;
  final int senderId;
  final String senderName;
  final String senderAvatar;
  final String content;
  final DateTime timestamp;
  final int? ventureId;
  final int? receiverId;

  /// `venture_X` for a channel, `dm_Y` for a direct message.
  final String roomId;
  final bool isRead;

  const ChatMessage({
    required this.id,
    required this.senderId,
    required this.senderName,
    required this.senderAvatar,
    required this.content,
    required this.timestamp,
    required this.roomId,
    this.ventureId,
    this.receiverId,
    this.isRead = false,
  });

  factory ChatMessage.fromJson(Map<String, dynamic> json) {
    return ChatMessage(
      id: _asInt(json['id']),
      senderId: _asInt(json['senderId'] ?? json['sender_id']),
      senderName: _asString(json['senderName'] ?? json['sender_name']),
      senderAvatar: _asString(json['senderAvatar'] ?? json['sender_avatar']),
      content: _asString(json['content']),
      timestamp: _asDateOrNull(json['timestamp'] ?? json['createdAt']) ??
          DateTime.now(),
      ventureId: _asIntOrNull(json['ventureId'] ?? json['venture_id']),
      receiverId: _asIntOrNull(json['receiverId'] ?? json['receiver_id']),
      roomId: _asString(json['roomId'] ?? json['room_id']),
      isRead: _asBool(json['isRead'] ?? json['is_read']),
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'id': id,
      'senderId': senderId,
      'senderName': senderName,
      'senderAvatar': senderAvatar,
      'content': content,
      'timestamp': timestamp.toIso8601String(),
      'ventureId': ventureId,
      'receiverId': receiverId,
      'roomId': roomId,
      'isRead': isRead,
    };
  }

  ChatMessage copyWith({
    int? id,
    int? senderId,
    String? senderName,
    String? senderAvatar,
    String? content,
    DateTime? timestamp,
    int? ventureId,
    int? receiverId,
    String? roomId,
    bool? isRead,
  }) {
    return ChatMessage(
      id: id ?? this.id,
      senderId: senderId ?? this.senderId,
      senderName: senderName ?? this.senderName,
      senderAvatar: senderAvatar ?? this.senderAvatar,
      content: content ?? this.content,
      timestamp: timestamp ?? this.timestamp,
      ventureId: ventureId ?? this.ventureId,
      receiverId: receiverId ?? this.receiverId,
      roomId: roomId ?? this.roomId,
      isRead: isRead ?? this.isRead,
    );
  }

  @override
  bool operator ==(Object other) {
    return other is ChatMessage &&
        other.id == id &&
        other.roomId == roomId &&
        other.content == content &&
        other.timestamp == timestamp;
  }

  @override
  int get hashCode => Object.hash(id, roomId, content, timestamp);

  @override
  String toString() => 'ChatMessage(id: $id, roomId: $roomId)';
}

class ChatRoom {
  final String id;
  final String name;

  /// `venture` or `dm`.
  final String type;
  final int? ventureId;
  final bool isOnline;
  final int unreadCount;
  final String? avatar;
  final DateTime? lastMessageTime;

  const ChatRoom({
    required this.id,
    required this.name,
    required this.type,
    this.ventureId,
    this.isOnline = false,
    this.unreadCount = 0,
    this.avatar,
    this.lastMessageTime,
  });

  factory ChatRoom.fromJson(Map<String, dynamic> json) {
    return ChatRoom(
      id: _asString(json['id']),
      name: _asString(json['name']),
      type: _asString(json['type'], fallback: 'venture'),
      ventureId: _asIntOrNull(json['ventureId'] ?? json['venture_id']),
      isOnline: _asBool(json['isOnline'] ?? json['is_online']),
      unreadCount: _asInt(json['unreadCount'] ?? json['unread_count']),
      avatar: json['avatar'] == null ? null : _asString(json['avatar']),
      lastMessageTime:
          _asDateOrNull(json['lastMessageTime'] ?? json['last_message_time']),
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'id': id,
      'name': name,
      'type': type,
      'ventureId': ventureId,
      'isOnline': isOnline,
      'unreadCount': unreadCount,
      'avatar': avatar,
      'lastMessageTime': lastMessageTime?.toIso8601String(),
    };
  }

  ChatRoom copyWith({
    String? id,
    String? name,
    String? type,
    int? ventureId,
    bool? isOnline,
    int? unreadCount,
    String? avatar,
    DateTime? lastMessageTime,
  }) {
    return ChatRoom(
      id: id ?? this.id,
      name: name ?? this.name,
      type: type ?? this.type,
      ventureId: ventureId ?? this.ventureId,
      isOnline: isOnline ?? this.isOnline,
      unreadCount: unreadCount ?? this.unreadCount,
      avatar: avatar ?? this.avatar,
      lastMessageTime: lastMessageTime ?? this.lastMessageTime,
    );
  }

  @override
  bool operator ==(Object other) => other is ChatRoom && other.id == id;

  @override
  int get hashCode => id.hashCode;

  @override
  String toString() => 'ChatRoom(id: $id, name: $name)';
}
