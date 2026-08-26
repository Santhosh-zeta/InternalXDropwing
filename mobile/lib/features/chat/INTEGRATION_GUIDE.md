# Socket.IO Chat — Wiring Notes

**Status: wired up.** This was an unapplied plan; the steps below are now done.
It is kept as a description of how the feature hangs together.

## What is wired

### Routes (`lib/core/router/app_router.dart`)
Registered alongside the other standalone (non-tab) routes, with the room as a
nested sub-route so `pop` returns to the list:

```dart
GoRoute(
  path: '/chat',
  builder: (context, state) => const ChatListScreen(),
  routes: [
    GoRoute(
      path: ':roomId',
      builder: (context, state) {
        final roomId = state.pathParameters['roomId'] ?? '';
        return ChatRoomScreen(roomId: roomId);
      },
    ),
  ],
),
```

### Entry point
A **Messages** tile in the Communication section of the Workspace tab
(`lib/features/workspace/presentation/screens/workspace_screen.dart`) pushes
`/chat`. Room cards push `/chat/<roomId>`.

### Connection
The connection is **not** opened in `main.dart`. `chatSocketProvider`
(`data/datasources/chat_socket.dart`) is a `FutureProvider` that reads the JWT
from secure storage, hands it to the Socket.IO handshake via `auth`, and
connects lazily the first time chat is opened — so signing in is naturally a
precondition and no work happens for users who never open chat.

This is the app's only Socket.IO connection. An earlier app-wide
`lib/core/socket/` provider was never referenced and has been deleted, so chat
owns the connection outright.

### Models
`data/models/chat_model.dart` is plain Dart (hand-written `fromJson` / `toJson` /
`copyWith`), not `@freezed`. The generated parts were never checked in, so the
whole feature failed to compile as soon as anything imported it. If you
reintroduce codegen here, commit the generated files like the rest of the app does.

## Key Components

### Models (`lib/features/chat/data/models/chat_model.dart`)
- **ChatMessage**: Represents a single chat message with sender info, content, and timestamp
- **ChatRoom**: Represents a chat room (venture channel or DM) with online status and unread count

### Socket (`lib/features/chat/data/datasources/chat_socket.dart`)
- **chatSocketProvider**: `FutureProvider<io.Socket>` that authenticates the
  handshake with the stored JWT and connects on first use

### Data Source (`lib/features/chat/data/datasources/chat_data_source.dart`)
- **ChatDataSource**: Interface for chat operations
- **ChatDataSourceImpl**: Implementation using Socket.IO and REST API
- Fetches message history from REST API
- Subscribes to real-time messages via Socket.IO

### Providers (`lib/features/chat/presentation/providers/chat_provider.dart`)
- **chatMessagesProvider**: Manages messages for a specific room, as an
  `AsyncValue<List<ChatMessage>>` so the screen can render loading/error states
- **chatRoomsProvider**: Fetches list of available chat rooms
- **typingUsersProvider**: Tracks which users are typing
- **unreadCountProvider**: Manages unread message counts per room

### Screens
- **ChatListScreen** (`lib/features/chat/presentation/screens/chat_list_screen.dart`): Shows list of chat rooms
- **ChatRoomScreen** (`lib/features/chat/presentation/screens/chat_room_screen.dart`): Shows messages in a room with input field

### Widgets
- **ChatRoomCard**: Displays a chat room in the list with avatar, name, and unread badge
- **MessageBubble**: Displays individual messages with sender info and timestamp

## Socket.IO Events

The implementation expects these Socket.IO events from the backend:

### Client → Server
- `join_channel`: Join a chat room
- `leave_channel`: Leave a chat room
- `send_message`: Send a message to a room
- `typing`: Send typing indicator

### Server → Client
- `message`: Receive a new message
- `typing`: Receive typing indicator
- `connect`: Connection established
- `disconnect`: Connection lost
- `error`: Connection error

## Features

- **Real-time messaging**: Messages appear instantly via Socket.IO
- **Message history**: Load previous messages from REST API
- **Venture channels**: Chat rooms for specific ventures/projects
- **Direct messages**: One-on-one conversations
- **Online status**: Shows if a user is online in DMs
- **Typing indicators**: See when someone is typing (implementation ready)
- **Unread badges**: Count of unread messages per room
- **Optimistic updates**: Messages appear immediately while being sent
- **Nested design system**: Uses NebulaColors throughout for consistent theming

## Backend Requirements

Your backend must provide:

1. **REST Endpoints**:
   - `GET /chat/rooms`: List all chat rooms for the user
   - `GET /chat/messages?roomId=X`: Get message history for a room

2. **Socket.IO Events**:
   - Handle `join_channel` and `leave_channel` events
   - Broadcast `message` events to room subscribers
   - Broadcast `typing` events to room participants
   - Validate authentication via token in Socket.IO handshake

## Styling

The chat feature uses the Nebula design system:
- **Colors**: NebulaColors for consistent dark theme
- **Spacing**: NebulaSpacing for consistent margins and padding
- **Typography**: NebulaTypography for text styles
- Message bubbles: Blue (#7C3AED) for sent, gray (#171F2E) for received

## Future Enhancements

Potential improvements:
- File/image uploads in chat
- Rich text formatting
- Message reactions/emojis
- Pinned messages
- Search functionality
- Chat room settings/permissions
- Voice/video calls integration
