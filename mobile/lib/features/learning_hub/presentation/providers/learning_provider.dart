import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../data/datasources/learning_remote_data_source.dart';
import '../../data/models/learning_models.dart';

// ── CHECKLIST PROVIDER ────────────────────────────────────────────────────────

final learningChecklistProvider =
    AsyncNotifierProvider<LearningChecklistNotifier, List<LearningChecklistItem>>(
        LearningChecklistNotifier.new);

class LearningChecklistNotifier
    extends AsyncNotifier<List<LearningChecklistItem>> {
  @override
  Future<List<LearningChecklistItem>> build() async {
    final ds = ref.watch(learningRemoteDataSourceProvider);
    return ds.getChecklist();
  }

  Future<void> toggleItem(int itemId, bool newValue) async {
    // Optimistic update
    final current = state.value ?? [];
    state = AsyncData(
      current.map((item) {
        if (item.id == itemId) return item.copyWith(completed: newValue);
        return item;
      }).toList(),
    );

    try {
      final ds = ref.read(learningRemoteDataSourceProvider);
      await ds.updateProgress(itemId, newValue);
    } catch (e) {
      ref.invalidateSelf();
    }
  }

  Future<void> refresh() async {
    ref.invalidateSelf();
    await future;
  }

  // Group items by category
  Map<String, List<LearningChecklistItem>> get groupedItems {
    final items = state.value ?? [];
    final Map<String, List<LearningChecklistItem>> grouped = {};
    for (final item in items) {
      grouped.putIfAbsent(item.category, () => []).add(item);
    }
    return grouped;
  }
}

// ── RESOURCES PROVIDER ────────────────────────────────────────────────────────

final learningResourcesProvider =
    FutureProvider<List<LearningResource>>((ref) async {
  final ds = ref.watch(learningRemoteDataSourceProvider);
  return ds.getResources();
});

// ── FEEDBACK PROVIDER ─────────────────────────────────────────────────────────

final learningFeedbackProvider =
    FutureProvider<List<LearningFeedback>>((ref) async {
  final ds = ref.watch(learningRemoteDataSourceProvider);
  return ds.getFeedback();
});

// ── PROGRESS STATS ────────────────────────────────────────────────────────────

final learningProgressStatsProvider = Provider<({int completed, int total, double percentage})>((ref) {
  final checklistAsync = ref.watch(learningChecklistProvider);
  return checklistAsync.maybeWhen(
    data: (items) {
      final total = items.length;
      final completed = items.where((i) => i.completed).length;
      final percentage = total > 0 ? completed / total : 0.0;
      return (completed: completed, total: total, percentage: percentage);
    },
    orElse: () => (completed: 0, total: 0, percentage: 0.0),
  );
});
