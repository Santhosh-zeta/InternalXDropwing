import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'core/router/app_router.dart';
import 'core/theme/app_theme.dart';
import 'core/network/network_info_provider.dart';
import 'core/notifications/firebase_notif_handler.dart';
import 'firebase_options.dart';

class MyHttpOverrides extends HttpOverrides {
  @override
  HttpClient createHttpClient(SecurityContext? context) {
    return super.createHttpClient(context)
      ..badCertificateCallback = (X509Certificate cert, String host, int port) => kDebugMode;
  }
}

// Background message handler (must be top-level)
Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  await Firebase.initializeApp();
  print('Handling background message: ${message.messageId}');
  print('Message data: ${message.data}');
}

void main() async {
  if (kDebugMode) {
    HttpOverrides.global = MyHttpOverrides();
  }
  WidgetsFlutterBinding.ensureInitialized();

  // Initialize Firebase
  await Firebase.initializeApp(
    options: DefaultFirebaseOptions.currentPlatform,
  );

  // Initialize Firebase Messaging
  final messaging = FirebaseMessaging.instance;

  // Request notification permissions
  final settings = await messaging.requestPermission(
    alert: true,
    announcement: false,
    badge: true,
    carplay: false,
    criticalAlert: false,
    provisional: false,
    sound: true,
  );

  print('Notification permission: ${settings.authorizationStatus}');

  // Get FCM token
  final token = await messaging.getToken();
  print('FCM Token: $token');

  // Handle background messages
  FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);

  // Initialize notification handler
  await initializeNotificationHandler();

  // Initialize Hive
  await Hive.initFlutter();
  await Hive.openBox('tasks');
  await Hive.openBox('projects');
  await Hive.openBox('user_prefs');

  runApp(
    const ProviderScope(
      child: DGOSMobileApp(),
    ),
  );
}

class DGOSMobileApp extends ConsumerWidget {
  const DGOSMobileApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(appRouterProvider);
    final hasInternetAsync = ref.watch(networkInfoProvider);

    return MaterialApp.router(
      title: 'DGOS Mobile',
      theme: AppTheme.darkTheme,
      darkTheme: AppTheme.darkTheme,
      themeMode: ThemeMode.dark,
      routerConfig: router,
      debugShowCheckedModeBanner: false,
      builder: (context, child) {
        final hasInternet = hasInternetAsync.valueOrNull ?? true;
        return Column(
          children: [
            Expanded(child: child!),
            if (!hasInternet)
              Material(
                color: Colors.red,
                child: SafeArea(
                  top: false,
                  child: Container(
                    padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 16),
                    alignment: Alignment.center,
                    child: const Text(
                      'No Internet Connection',
                      style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                    ),
                  ),
                ),
              ),
          ],
        );
      },
    );
  }
}
