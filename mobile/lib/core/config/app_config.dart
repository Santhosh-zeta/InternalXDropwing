/// Where the app finds the InternalX API.
///
/// Pass your server at build/run time:
///   flutter run --dart-define=API_URL=https://internalx.example.com/api
/// The default targets the Android emulator's view of a server on the host
/// machine (`./scripts/dev.sh` serves on port 5000).
class AppConfig {
  static const String _envUrl = String.fromEnvironment('API_URL');

  /// API base URL, including the trailing `/api`.
  static String get baseUrl =>
      _envUrl.isNotEmpty ? _envUrl : 'http://10.0.2.2:5000/api';

  /// The server origin (base URL without `/api`), for files such as avatars,
  /// documents and invoice PDFs that the API returns as relative paths.
  static String get originUrl {
    final u = baseUrl;
    return u.endsWith('/api') ? u.substring(0, u.length - 4) : u;
  }
}
