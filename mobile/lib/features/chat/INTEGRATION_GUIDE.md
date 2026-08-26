# Socket.IO Chat Integration Guide

This guide explains how to integrate the Socket.IO real-time chat feature into your Flutter app.

## Setup Steps

### 1. Add Router Routes
Add these routes to your `GoRouter` configuration in `lib/core/router/app_router.dart`:

```dart
GoRoute(
  path: '/chat',
  builder: (context, state) => const ChatListScreen(),
),
GoRoute(
  path: '/chat/:roomId',
  builder: (context, state) {
    final roomId = state.pathParameters['roomId']!;
    return ChatRoomScreen(roomId: roomId);
  },
),
```

### 2. Initialize Socket Connection
In your `main.dart` or app initialization code, connect to the Socket.IO server when the app starts:

```dart
void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  final container = ProviderContainer();
  
  // Connect to Socket.IO server
  await container.read(socketProvider.notifier).connect();
  
  runApp(const MyApp());
}
```

Alternatively, you can connect when the user authenticates by adding this to your auth provider after successful login:

```dart
Future<void> login(String email, String password) async {
  state = const AuthState.loading();
  try {
    final user = await _repository.login(LoginRequest(email: email, password: password));
    state = AuthState.authenticated(user);
    
    // Connect to Socket.IO after successful login
    await ref.read(socketProvider.notifier).connect();
  } catch (e) {
    state = AuthState.error(e.toString().replaceAll('Exception: ', ''));
  }
}
```

### 3. Add Chat to Navigation
Add a navigation item to your app's navigation menu or bottom nav bar:

```dart
ListTile(
  leading: Icon(Icons.message),
  title: Text('Messages'),
  onTap: () => context.push('/chat'),
),
```

## Key Components

### Models (`lib/features/chat/data/models/chat_model.dart`)
- **ChatMessage**: Represents a single chat message with sender info, content, and timestamp
- **ChatRoom**: Represents a chat room (venture channel or DM) with online status and unread count

### Socket Provider (`lib/core/socket/socket_provider.dart`)
- **SocketNotifier**: Manages the Socket.IO connection and emits/receives events
- Handles connection state management
- Provides methods for joining rooms, sending messages, and handling typing indicators

### Data Source (`lib/features/chat/data/datasources/chat_data_source.dart`)
- **ChatDataSource**: Interface for chat operations
- **ChatDataSourceImpl**: Implementation using Socket.IO and REST API
- Fetches message history from REST API
- Subscribes to real-time messages via Socket.IO

### Providers (`lib/features/chat/presentation/providers/chat_provider.dart`)
- **chatMessagesProvider**: Manages messages for a specific room
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
