import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../data/datasources/notifications_remote_data_source.dart';
import '../../data/models/notification_model.dart';

final notificationsProvider =
    AsyncNotifierProvider<NotificationsNotifier, NotificationsResponse>(
        NotificationsNotifier.new);

final unreadCountProvider = Provider<int>((ref) {
  final notificationsAsync = ref.watch(notificationsProvider);
  return notificationsAsync.maybeWhen(
    data: (data) => data.unreadCount,
    orElse: () => 0,
  );
});

class NotificationsNotifier extends AsyncNotifier<NotificationsResponse> {
  @override
  Future<NotificationsResponse> build() async {
    final dataSource = ref.watch(notificationsRemoteDataSourceProvider);
    return dataSource.getNotifications();
  }

  Future<void> refresh() async {
    ref.invalidateSelf();
    await future;
  }

  Future<void> markAsRead(int id) async {
    // Optimistic update
    final current = state.value;
    if (current != null) {
      final updatedList = current.notifications.map((n) {
        if (n.id == id) return n.copyWith(isRead: true);
        return n;
      }).toList();
      final newUnread = updatedList.where((n) => !n.isRead).length;
      state = AsyncData(
          NotificationsResponse(notifications: updatedList, unreadCount: newUnread));
    }

    try {
      final dataSource = ref.read(notificationsRemoteDataSourceProvider);
      await dataSource.markAsRead(id);
    } catch (e) {
      // Revert on failure
      ref.invalidateSelf();
    }
  }

  Future<void> markAllAsRead() async {
    // Optimistic update
    final current = state.value;
    if (current != null) {
      final updatedList =
          current.notifications.map((n) => n.copyWith(isRead: true)).toList();
      state = AsyncData(
          NotificationsResponse(notifications: updatedList, unreadCount: 0));
    }

    try {
      final dataSource = ref.read(notificationsRemoteDataSourceProvider);
      await dataSource.markAllAsRead();
    } catch (e) {
      ref.invalidateSelf();
    }
  }

  Future<void> clearRead() async {
    try {
      final dataSource = ref.read(notificationsRemoteDataSourceProvider);
      await dataSource.clearReadNotifications();
      ref.invalidateSelf();
    } catch (e) {
      rethrow;
    }
  }
}
