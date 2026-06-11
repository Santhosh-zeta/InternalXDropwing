import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/api/api_client.dart';
import '../../../auth/data/models/auth_models.dart';
import '../../../auth/presentation/providers/auth_provider.dart';
import '../../data/profile_repository.dart';

final profileRepositoryProvider = Provider<ProfileRepository>((ref) {
  final dio = ref.watch(dioProvider);
  return ProfileRepository(dio);
});

final profileProvider = AsyncNotifierProvider<ProfileNotifier, User>(ProfileNotifier.new);

class ProfileNotifier extends AsyncNotifier<User> {
  late ProfileRepository _repository;

  @override
  Future<User> build() async {
    _repository = ref.watch(profileRepositoryProvider);
    return _fetchProfile();
  }

  Future<User> _fetchProfile() async {
    final user = await _repository.getMyProfile();
    // Update the auth user if needed, though they might be separate instances.
    return user;
  }

  Future<void> updateProfile({
    String? fullName,
    String? phone,
    Map<String, dynamic>? notificationPreferences,
  }) async {
    state = const AsyncValue.loading();
    try {
      await _repository.updateProfile(
        fullName: fullName,
        phone: phone,
        notificationPreferences: notificationPreferences,
      );
      final updatedUser = await _fetchProfile();
      state = AsyncValue.data(updatedUser);
      // Invalidate auth provider to reflect changes globally
      ref.invalidate(authProvider);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
      rethrow;
    }
  }

  Future<void> changePassword(String currentPassword, String newPassword) async {
    await _repository.changePassword(currentPassword, newPassword);
  }

  Future<void> uploadAvatar(String filePath) async {
    state = const AsyncValue.loading();
    try {
      await _repository.uploadAvatar(filePath);
      final updatedUser = await _fetchProfile();
      state = AsyncValue.data(updatedUser);
      ref.invalidate(authProvider);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
      rethrow;
    }
  }
}
