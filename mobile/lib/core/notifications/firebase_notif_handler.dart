import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/router/app_router.dart';

// Global navigator key for handling navigation from background
GlobalKey<NavigatorState>? navigatorKey;

Future<void> initializeNotificationHandler() async {
  final messaging = FirebaseMessaging.instance;

  // Handle foreground messages
  FirebaseMessaging.onMessage.listen((RemoteMessage message) {
    print('Received foreground message: ${message.notification?.title}');
    print('Message data: ${message.data}');

    // Show local notification in app
    _showForegroundNotification(message);
  });

  // Handle message tapped while app is in background
  FirebaseMessaging.onMessageOpenedApp.listen((RemoteMessage message) {
    print('Message tapped: ${message.data}');
    _handleMessageTap(message);
  });
}

void _showForegroundNotification(RemoteMessage message) {
  final notification = message.notification;
  if (notification != null) {
    // You can update UI here or show a custom in-app notification
    // For now, just logging
    print('Notification Title: ${notification.title}');
    print('Notification Body: ${notification.body}');

    // Could integrate with flutter_local_notifications here for custom UI
    // or update a notifications provider badge
  }
}

void _handleMessageTap(RemoteMessage message) {
  final data = message.data;
  final type = data['type'];
  final id = data['id'] ?? data['taskId'] ?? data['typeId'];

  print('Navigation: type=$type, id=$id');

  // Navigate based on message type
  switch (type) {
    case 'task_assigned':
      navigatorKey?.currentState?.pushNamed('/tasks/$id');
      break;
    case 'approval_needed':
      navigatorKey?.currentState?.pushNamed('/timesheets');
      break;
    case 'project_update':
      navigatorKey?.currentState?.pushNamed('/projects/$id');
      break;
    case 'venture_alert':
      navigatorKey?.currentState?.pushNamed('/workspace');
      break;
    case 'notification':
      navigatorKey?.currentState?.pushNamed('/notifications');
      break;
    default:
      print('Unknown notification type: $type');
  }
}

// Provider for notification badge/unread count
final notificationBadgeProvider = StateProvider<int>((ref) {
  return 0;
});

// Track FCM token for sending targeted notifications
final fcmTokenProvider = FutureProvider<String?>((ref) async {
  try {
    final token = await FirebaseMessaging.instance.getToken();
    return token;
  } catch (e) {
    print('Error getting FCM token: $e');
    return null;
  }
});
