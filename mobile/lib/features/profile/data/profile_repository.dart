import 'package:dio/dio.dart';
import '../../auth/data/models/auth_models.dart';

class ProfileRepository {
  final Dio _dio;

  ProfileRepository(this._dio);

  Future<User> getMyProfile() async {
    final response = await _dio.get('/team-members/me');
    return User.fromJson(response.data['data']);
  }

  Future<void> updateProfile({
    String? fullName,
    String? phone,
    Map<String, dynamic>? notificationPreferences,
  }) async {
    await _dio.put('/team-members/me/profile', data: {
      if (fullName != null) 'full_name': fullName,
      if (phone != null) 'phone': phone,
      if (notificationPreferences != null) 'notification_preferences': notificationPreferences,
    });
  }

  Future<void> changePassword(String currentPassword, String newPassword) async {
    await _dio.put('/team-members/me/password', data: {
      'currentPassword': currentPassword,
      'newPassword': newPassword,
    });
  }

  Future<String> uploadAvatar(String filePath) async {
    final formData = FormData.fromMap({
      'avatar': await MultipartFile.fromFile(filePath),
    });
    final response = await _dio.post('/team-members/me/avatar', data: formData);
    return response.data['data']['avatar_url'];
  }
}
