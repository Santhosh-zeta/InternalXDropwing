enum Environment { development, staging, production }

class AppConfig {
  static Environment currentEnvironment = Environment.development;

  static String get baseUrl {
    switch (currentEnvironment) {
      case Environment.development:
        // Use 10.0.2.2 for Android emulator to access host machine's localhost
        return 'http://10.0.2.2:3000/api';
      case Environment.staging:
        return 'https://staging.dgos-mobile.com/api';
      case Environment.production:
        return 'https://api.dgos-mobile.com/api';
    }
  }
}