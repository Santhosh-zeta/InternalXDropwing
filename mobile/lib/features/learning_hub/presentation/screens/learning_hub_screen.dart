import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:url_launcher/url_launcher.dart';
import '../providers/learning_provider.dart';
import '../../data/models/learning_models.dart';
import '../../../../core/theme/theme_context.dart';
import '../../../../core/rbac/permissions.dart';
import '../../../../core/rbac/rbac_widgets.dart';

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
      backgroundColor: context.scheme.surface,
      appBar: AppBar(
        title: Text('Learning Hub',
            style: TextStyle(
                fontWeight: FontWeight.w600, color: context.scheme.onSurface)),
        backgroundColor: context.scheme.surfaceContainerHighest,
        elevation: 0,
        centerTitle: false,
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: context.scheme.primary,
          labelColor: context.scheme.primary,
          unselectedLabelColor: context.scheme.onSurfaceVariant,
          tabs: const [
            Tab(text: 'Checklist'),
            Tab(text: 'Resources'),
            Tab(text: 'Feedback'),
          ],
        ),
      ),
      body: PermissionScope(
        permission: Permission.viewLearning,
        what: 'the learning hub',
        child: Column(
        children: [
          // Progress Banner
          if (stats.total > 0)
            Container(
              margin: const EdgeInsets.all(16),
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [
                    context.scheme.primary.withValues(alpha: 0.2),
                    context.scheme.secondary.withValues(alpha: 0.1),
                  ],
                ),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                    color: context.scheme.primary.withValues(alpha: 0.3)),
              ),
              child: Row(
                children: [
                  Container(
                    width: 50,
                    height: 50,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: context.scheme.primary.withValues(alpha: 0.1),
                      border: Border.all(color: context.scheme.primary, width: 2),
                    ),
                    child: Center(
                      child: Text(
                        '${(stats.percentage * 100).toInt()}%',
                        style: TextStyle(
                            color: context.scheme.primary,
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
                          style: TextStyle(
                              color: context.scheme.onSurface,
                              fontWeight: FontWeight.w600,
                              fontSize: 14),
                        ),
                        const SizedBox(height: 6),
                        ClipRRect(
                          borderRadius: BorderRadius.circular(4),
                          child: LinearProgressIndicator(
                            value: stats.percentage,
                            backgroundColor: context.scheme.surface,
                            valueColor: AlwaysStoppedAnimation<Color>(
                                context.scheme.primary),
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
          return Center(
            child: Text('No checklist items',
                style: TextStyle(color: context.scheme.onSurfaceVariant)),
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
      loading: () => Center(
          child: CircularProgressIndicator(color: context.scheme.primary)),
      error: (e, st) => Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(e.toString(),
                style:
                    TextStyle(color: context.scheme.onSurfaceVariant)),
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
        Icon(LucideIcons.tag, size: 14, color: context.scheme.primary),
        const SizedBox(width: 6),
        Text(
          category,
          style: TextStyle(
              color: context.scheme.primary,
              fontWeight: FontWeight.bold,
              fontSize: 13,
              letterSpacing: 0.5),
        ),
        const SizedBox(width: 8),
        Expanded(
            child: Divider(color: context.scheme.primary.withValues(alpha: 0.3))),
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
        color: context.scheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(10),
        border: item.completed
            ? Border.all(color: context.dl.success.withValues(alpha: 0.3))
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
                  ? context.dl.success.withValues(alpha: 0.2)
                  : context.scheme.surface,
              border: Border.all(
                color: item.completed
                    ? context.dl.success
                    : context.scheme.onSurfaceVariant,
                width: 2,
              ),
            ),
            child: item.completed
                ? Icon(LucideIcons.check,
                    size: 16, color: context.dl.success)
                : null,
          ),
        ),
        title: Text(
          item.title,
          style: TextStyle(
            color: item.completed
                ? context.scheme.onSurfaceVariant
                : context.scheme.onSurface,
            fontWeight: FontWeight.w500,
            fontSize: 14,
            decoration: item.completed ? TextDecoration.lineThrough : null,
          ),
        ),
        subtitle: item.description != null
            ? Text(item.description!,
                style: TextStyle(
                    color: context.scheme.onSurfaceVariant, fontSize: 12))
            : null,
        trailing: item.dueDays != null
            ? Text('${item.dueDays}d',
                style: TextStyle(
                    color: context.dl.warning, fontSize: 11))
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
          return Center(
            child: Text('No resources available',
                style: TextStyle(color: context.scheme.onSurfaceVariant)),
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
      loading: () => Center(
          child: CircularProgressIndicator(color: context.scheme.primary)),
      error: (e, st) => Center(
        child: Text(e.toString(),
            style: TextStyle(color: context.scheme.onSurfaceVariant)),
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
        color: context.scheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(10),
      ),
      child: ListTile(
        leading: Container(
          width: 40,
          height: 40,
          decoration: BoxDecoration(
            color: context.scheme.secondary.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Icon(_icon(), size: 18, color: context.scheme.secondary),
        ),
        title: Text(resource.title,
            style: TextStyle(
                color: context.scheme.onSurface,
                fontWeight: FontWeight.w600,
                fontSize: 14)),
        subtitle: resource.description != null
            ? Text(resource.description!,
                style: TextStyle(
                    color: context.scheme.onSurfaceVariant, fontSize: 12),
                maxLines: 1,
                overflow: TextOverflow.ellipsis)
            : null,
        trailing: Icon(LucideIcons.externalLink,
            size: 16, color: context.scheme.onSurfaceVariant),
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
          return Center(
            child: Text('No feedback yet',
                style: TextStyle(color: context.scheme.onSurfaceVariant)),
          );
        }
        return ListView.separated(
          padding: const EdgeInsets.all(16),
          itemCount: feedback.length,
          separatorBuilder: (_, __) => const SizedBox(height: 8),
          itemBuilder: (context, i) => _FeedbackCard(feedback: feedback[i]),
        );
      },
      loading: () => Center(
          child: CircularProgressIndicator(color: context.scheme.primary)),
      error: (e, st) => Center(
        child: Text(e.toString(),
            style: TextStyle(color: context.scheme.onSurfaceVariant)),
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
        color: context.scheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              CircleAvatar(
                radius: 16,
                backgroundColor: context.scheme.primary,
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
                    style: TextStyle(
                        color: context.scheme.onSurface,
                        fontWeight: FontWeight.w600,
                        fontSize: 13),
                  ),
                  if (feedback.weekLabel != null)
                    Text(feedback.weekLabel!,
                        style: TextStyle(
                            color: context.scheme.onSurfaceVariant,
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
                      color: context.dl.warning,
                    );
                  }),
                ),
            ],
          ),
          const SizedBox(height: 10),
          Text(feedback.note,
              style: TextStyle(
                  color: context.scheme.onSurfaceVariant,
                  fontSize: 13,
                  height: 1.4)),
        ],
      ),
    );
  }
}
