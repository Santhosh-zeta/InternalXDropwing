enum Environment { development, staging, production }

class AppConfig {
  static Environment currentEnvironment = Environment.development;

  static String get baseUrl {
    switch (currentEnvironment) {
      case Environment.development:
      case Environment.staging:
      case Environment.production:
        return 'https://internalx.dropwinggroups.com/api';
    }
  }
}