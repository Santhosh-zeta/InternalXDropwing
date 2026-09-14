import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../../core/theme/nebula_colors.dart';
import '../providers/learning_provider.dart';
import '../../data/models/learning_models.dart';

class LearningHubScreen extends ConsumerStatefulWidget {
  const LearningHubScreen({super.key});

  @override
  ConsumerState<LearningHubScreen> createState() => _LearningHubScreenState();
}

class _LearningHubScreenState extends ConsumerState<LearningHubScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final stats = ref.watch(learningProgressStatsProvider);

    return Scaffold(
      backgroundColor: NebulaColors.background,
      appBar: AppBar(
        title: const Text('Learning Hub',
            style: TextStyle(
                fontWeight: FontWeight.w600, color: NebulaColors.textPrimary)),
        backgroundColor: NebulaColors.surfaceCard,
        elevation: 0,
        centerTitle: false,
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: NebulaColors.primary,
          labelColor: NebulaColors.primary,
          unselectedLabelColor: NebulaColors.textSecondary,
          tabs: const [
            Tab(text: 'Checklist'),
            Tab(text: 'Resources'),
            Tab(text: 'Feedback'),
          ],
        ),
      ),
      body: Column(
        children: [
          // Progress Banner
          if (stats.total > 0)
            Container(
              margin: const EdgeInsets.all(16),
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [
                    NebulaColors.primary.withValues(alpha: 0.2),
                    NebulaColors.highlight.withValues(alpha: 0.1),
                  ],
                ),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                    color: NebulaColors.primary.withValues(alpha: 0.3)),
              ),
              child: Row(
                children: [
                  Container(
                    width: 50,
                    height: 50,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: NebulaColors.primary.withValues(alpha: 0.1),
                      border: Border.all(color: NebulaColors.primary, width: 2),
                    ),
                    child: Center(
                      child: Text(
                        '${(stats.percentage * 100).toInt()}%',
                        style: const TextStyle(
                            color: NebulaColors.primary,
                            fontWeight: FontWeight.bold,
                            fontSize: 12),
                      ),
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          '${stats.completed} of ${stats.total} tasks completed',
                          style: const TextStyle(
                              color: NebulaColors.textPrimary,
                              fontWeight: FontWeight.w600,
                              fontSize: 14),
                        ),
                        const SizedBox(height: 6),
                        ClipRRect(
                          borderRadius: BorderRadius.circular(4),
                          child: LinearProgressIndicator(
                            value: stats.percentage,
                            backgroundColor: NebulaColors.surface,
                            valueColor: const AlwaysStoppedAnimation<Color>(
                                NebulaColors.primary),
                            minHeight: 6,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),

          // Tab views
          Expanded(
            child: TabBarView(
              controller: _tabController,
              children: const [
                _ChecklistTab(),
                _ResourcesTab(),
                _FeedbackTab(),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// ── CHECKLIST TAB ──────────────────────────────────────────────────────────────

class _ChecklistTab extends ConsumerWidget {
  const _ChecklistTab();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final checklistAsync = ref.watch(learningChecklistProvider);

    return checklistAsync.when(
      data: (items) {
        if (items.isEmpty) {
          return const Center(
            child: Text('No checklist items',
                style: TextStyle(color: NebulaColors.textSecondary)),
          );
        }

        // Group by category
        final Map<String, List<LearningChecklistItem>> grouped = {};
        for (final item in items) {
          grouped.putIfAbsent(item.category, () => []).add(item);
        }

        return RefreshIndicator(
          onRefresh: () =>
              ref.read(learningChecklistProvider.notifier).refresh(),
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: grouped.entries.map((entry) {
              return Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _CategoryHeader(entry.key),
                  const SizedBox(height: 8),
                  ...entry.value.map((item) => _ChecklistItemTile(item: item)),
                  const SizedBox(height: 16),
                ],
              );
            }).toList(),
          ),
        );
      },
      loading: () => const Center(
          child: CircularProgressIndicator(color: NebulaColors.primary)),
      error: (e, st) => Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(e.toString(),
                style:
                    const TextStyle(color: NebulaColors.textSecondary)),
            const SizedBox(height: 16),
            ElevatedButton(
                onPressed: () =>
                    ref.invalidate(learningChecklistProvider),
                child: const Text('Retry')),
          ],
        ),
      ),
    );
  }
}

class _CategoryHeader extends StatelessWidget {
  final String category;
  const _CategoryHeader(this.category);

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        const Icon(LucideIcons.tag, size: 14, color: NebulaColors.primary),
        const SizedBox(width: 6),
        Text(
          category,
          style: const TextStyle(
              color: NebulaColors.primary,
              fontWeight: FontWeight.bold,
              fontSize: 13,
              letterSpacing: 0.5),
        ),
        const SizedBox(width: 8),
        Expanded(
            child: Divider(color: NebulaColors.primary.withValues(alpha: 0.3))),
      ],
    );
  }
}

class _ChecklistItemTile extends ConsumerWidget {
  final LearningChecklistItem item;
  const _ChecklistItemTile({required this.item});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      decoration: BoxDecoration(
        color: NebulaColors.surfaceCard,
        borderRadius: BorderRadius.circular(10),
        border: item.completed
            ? Border.all(color: NebulaColors.success.withValues(alpha: 0.3))
            : null,
      ),
      child: ListTile(
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
        leading: GestureDetector(
          onTap: () => ref
              .read(learningChecklistProvider.notifier)
              .toggleItem(item.id, !item.completed),
          child: Container(
            width: 28,
            height: 28,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: item.completed
                  ? NebulaColors.success.withValues(alpha: 0.2)
                  : NebulaColors.surface,
              border: Border.all(
                color: item.completed
                    ? NebulaColors.success
                    : NebulaColors.textSecondary,
                width: 2,
              ),
            ),
            child: item.completed
                ? const Icon(LucideIcons.check,
                    size: 16, color: NebulaColors.success)
                : null,
          ),
        ),
        title: Text(
          item.title,
          style: TextStyle(
            color: item.completed
                ? NebulaColors.textSecondary
                : NebulaColors.textPrimary,
            fontWeight: FontWeight.w500,
            fontSize: 14,
            decoration: item.completed ? TextDecoration.lineThrough : null,
          ),
        ),
        subtitle: item.description != null
            ? Text(item.description!,
                style: const TextStyle(
                    color: NebulaColors.textSecondary, fontSize: 12))
            : null,
        trailing: item.dueDays != null
            ? Text('${item.dueDays}d',
                style: const TextStyle(
                    color: NebulaColors.warning, fontSize: 11))
            : null,
      ),
    );
  }
}

// ── RESOURCES TAB ──────────────────────────────────────────────────────────────

class _ResourcesTab extends ConsumerWidget {
  const _ResourcesTab();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final resourcesAsync = ref.watch(learningResourcesProvider);

    return resourcesAsync.when(
      data: (resources) {
        if (resources.isEmpty) {
          return const Center(
            child: Text('No resources available',
                style: TextStyle(color: NebulaColors.textSecondary)),
          );
        }

        final Map<String, List<LearningResource>> grouped = {};
        for (final r in resources) {
          grouped.putIfAbsent(r.category, () => []).add(r);
        }

        return ListView(
          padding: const EdgeInsets.all(16),
          children: grouped.entries.map((entry) {
            return Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _CategoryHeader(entry.key),
                const SizedBox(height: 8),
                ...entry.value.map((r) => _ResourceTile(resource: r)),
                const SizedBox(height: 16),
              ],
            );
          }).toList(),
        );
      },
      loading: () => const Center(
          child: CircularProgressIndicator(color: NebulaColors.primary)),
      error: (e, st) => Center(
        child: Text(e.toString(),
            style: const TextStyle(color: NebulaColors.textSecondary)),
      ),
    );
  }
}

class _ResourceTile extends StatelessWidget {
  final LearningResource resource;
  const _ResourceTile({required this.resource});

  IconData _icon() {
    switch (resource.resourceType) {
      case 'video':
        return LucideIcons.playCircle;
      case 'pdf':
        return LucideIcons.fileText;
      case 'article':
        return LucideIcons.bookOpen;
      default:
        return LucideIcons.link;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      decoration: BoxDecoration(
        color: NebulaColors.surfaceCard,
        borderRadius: BorderRadius.circular(10),
      ),
      child: ListTile(
        leading: Container(
          width: 40,
          height: 40,
          decoration: BoxDecoration(
            color: NebulaColors.highlight.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Icon(_icon(), size: 18, color: NebulaColors.highlight),
        ),
        title: Text(resource.title,
            style: const TextStyle(
                color: NebulaColors.textPrimary,
                fontWeight: FontWeight.w600,
                fontSize: 14)),
        subtitle: resource.description != null
            ? Text(resource.description!,
                style: const TextStyle(
                    color: NebulaColors.textSecondary, fontSize: 12),
                maxLines: 1,
                overflow: TextOverflow.ellipsis)
            : null,
        trailing: const Icon(LucideIcons.externalLink,
            size: 16, color: NebulaColors.textSecondary),
        onTap: () async {
          final uri = Uri.parse(resource.url);
          if (await canLaunchUrl(uri)) {
            await launchUrl(uri, mode: LaunchMode.externalApplication);
          }
        },
      ),
    );
  }
}

// ── FEEDBACK TAB ──────────────────────────────────────────────────────────────

class _FeedbackTab extends ConsumerWidget {
  const _FeedbackTab();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final feedbackAsync = ref.watch(learningFeedbackProvider);

    return feedbackAsync.when(
      data: (feedback) {
        if (feedback.isEmpty) {
          return const Center(
            child: Text('No feedback yet',
                style: TextStyle(color: NebulaColors.textSecondary)),
          );
        }
        return ListView.separated(
          padding: const EdgeInsets.all(16),
          itemCount: feedback.length,
          separatorBuilder: (_, __) => const SizedBox(height: 8),
          itemBuilder: (context, i) => _FeedbackCard(feedback: feedback[i]),
        );
      },
      loading: () => const Center(
          child: CircularProgressIndicator(color: NebulaColors.primary)),
      error: (e, st) => Center(
        child: Text(e.toString(),
            style: const TextStyle(color: NebulaColors.textSecondary)),
      ),
    );
  }
}

class _FeedbackCard extends StatelessWidget {
  final LearningFeedback feedback;
  const _FeedbackCard({required this.feedback});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: NebulaColors.surfaceCard,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              CircleAvatar(
                radius: 16,
                backgroundColor: NebulaColors.primary,
                child: Text(
                  feedback.managerName?.isNotEmpty == true
                      ? feedback.managerName![0].toUpperCase()
                      : 'M',
                  style: const TextStyle(
                      color: Colors.white, fontWeight: FontWeight.bold),
                ),
              ),
              const SizedBox(width: 10),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    feedback.managerName ?? 'Manager',
                    style: const TextStyle(
                        color: NebulaColors.textPrimary,
                        fontWeight: FontWeight.w600,
                        fontSize: 13),
                  ),
                  if (feedback.weekLabel != null)
                    Text(feedback.weekLabel!,
                        style: const TextStyle(
                            color: NebulaColors.textSecondary,
                            fontSize: 11)),
                ],
              ),
              const Spacer(),
              if (feedback.rating != null)
                Row(
                  children: List.generate(5, (i) {
                    return Icon(
                      i < (feedback.rating ?? 0)
                          ? Icons.star
                          : Icons.star_border,
                      size: 14,
                      color: NebulaColors.warning,
                    );
                  }),
                ),
            ],
          ),
          const SizedBox(height: 10),
          Text(feedback.note,
              style: const TextStyle(
                  color: NebulaColors.textSecondary,
                  fontSize: 13,
                  height: 1.4)),
        ],
      ),
    );
  }
}
