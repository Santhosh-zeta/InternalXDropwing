import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'core/router/app_router.dart';
import 'core/theme/app_theme.dart';
import 'core/network/network_info_provider.dart';

class MyHttpOverrides extends HttpOverrides {
  @override
  HttpClient createHttpClient(SecurityContext? context) {
    return super.createHttpClient(context)
      ..badCertificateCallback = (X509Certificate cert, String host, int port) => true;
  }
}

void main() async {
  HttpOverrides.global = MyHttpOverrides();
  WidgetsFlutterBinding.ensureInitialized();
  
  // Initialize Hive, Firebase, etc. here later
  
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
