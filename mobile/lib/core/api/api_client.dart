import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:logger/logger.dart';
import '../cache/secure_storage_provider.dart';
import '../config/app_config.dart';
import '../demo/demo_mode.dart';
import '../demo/demo_interceptor.dart';

final dioProvider = Provider<Dio>((ref) {
  final secureStorage = ref.watch(secureStorageProvider);
  const envUrl = String.fromEnvironment('API_URL');
  final baseUrl = envUrl.isNotEmpty ? envUrl : AppConfig.baseUrl;

  final dio = Dio(
    BaseOptions(
      baseUrl: baseUrl,
      connectTimeout: const Duration(seconds: 10),
      receiveTimeout: const Duration(seconds: 10),
      headers: {
        'Content-Type': 'application/json',
      },
    ),
  );

  // TEMPORARY — see core/demo/demo_mode.dart. Placed first so it resolves
  // every request before anything below (auth headers, logging, the real
  // network call) ever runs.
  if (kDemoMode) {
    dio.interceptors.add(DemoInterceptor());
  }

  final logger = Logger();

  dio.interceptors.add(
    InterceptorsWrapper(
      onRequest: (options, handler) async {
        final token = await secureStorage.read(key: 'jwt_token');
        if (token != null) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        logger.i('Request: ${options.method} ${options.uri}');
        return handler.next(options);
      },
      onResponse: (response, handler) {
        logger.i('Response: ${response.statusCode}');
        return handler.next(response);
      },
      onError: (DioException e, handler) {
        logger.e('Error: ${e.message} - ${e.response?.statusCode}');
        // Handle 401 auto-logout
        if (e.response?.statusCode == 401) {
          secureStorage.delete(key: 'jwt_token').then((_) {
            logger.i('Token cleared on 401 Unauthorized');
          });
        }
        return handler.next(e);
      },
    ),
  );

  return dio;
});
