import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../../../core/constants/access_levels.dart';
import '../../../../core/theme/nebula_spacing.dart';
import '../../../auth/presentation/providers/auth_provider.dart';
import '../../data/db_explorer_data_source.dart';
import '../../data/db_explorer_model.dart';
import '../../data/db_explorer_provider.dart';
import '../widgets/result_table.dart';
import '../widgets/state_views.dart';

/// Raw database access: table listing, table preview, and free-form SQL
/// execution against `/api/database`.
///
/// **Level 1 (Super Admin) only** — this is the single most dangerous screen
/// in the app. `POST /api/database/query` runs whatever string it is given
/// with no safety filtering on either side, so every affordance here is built
/// to make that unmistakable rather than convenient.
class DbExplorerScreen extends ConsumerWidget {
  const DbExplorerScreen({super.key});

  static bool canView(int accessLevel) => accessLevel == AccessLevels.superAdmin;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final accessLevel = ref.watch(authProvider).maybeWhen<int?>(
          authenticated: (user) => user.accessLevel,
          orElse: () => null,
        );

    if (accessLevel == null || !canView(accessLevel)) {
      return Scaffold(
        appBar: AppBar(title: const Text('Database')),
        body: const RestrictedStateView(
          moduleName: 'the Database Explorer',
          requirement: 'Level 1 (Super Admin)',
        ),
      );
    }

    return DefaultTabController(
      length: 2,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Database'),
          bottom: const TabBar(
            tabs: [
              Tab(text: 'Tables'),
              Tab(text: 'SQL query'),
            ],
          ),
        ),
        body: const Column(
          children: [
            OfflineBanner(),
            _DangerBanner(),
            Expanded(
              child: TabBarView(
                children: [
                  _TablesTab(),
                  _QueryTab(),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _DangerBanner extends StatelessWidget {
  const _DangerBanner();

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(
          horizontal: NebulaSpacing.md, vertical: NebulaSpacing.sm + 2),
      color: scheme.error.withValues(alpha: 0.10),
      child: Row(
        children: [
          Icon(LucideIcons.triangleAlert, size: 16, color: scheme.error),
          const SizedBox(width: NebulaSpacing.sm),
          Expanded(
            child: Text(
              'This reads and can modify the production database directly. '
              'Every action here is irreversible.',
              style: Theme.of(context)
                  .textTheme
                  .bodySmall
                  ?.copyWith(color: scheme.error, fontWeight: FontWeight.w600),
            ),
          ),
        ],
      ),
    );
  }
}

// ─── Tables tab ──────────────────────────────────────────────────────────────

class _TablesTab extends ConsumerWidget {
  const _TablesTab();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final tablesAsync = ref.watch(dbTablesProvider);

    return tablesAsync.when(
      loading: () => const ListSkeleton(itemHeight: 52),
      error: (error, _) => RefreshableMessage(
        child: ErrorStateView(
          title: 'Could not load tables',
          error: error,
          onRetry: () => ref.invalidate(dbTablesProvider),
        ),
      ),
      data: (tables) {
        if (tables.isEmpty) {
          return const RefreshableMessage(
            child: EmptyStateView(
              icon: LucideIcons.database,
              title: 'No tables found',
              message: 'The public schema appears to have no tables.',
            ),
          );
        }
        return RefreshIndicator(
          onRefresh: () async => ref.refresh(dbTablesProvider.future),
          child: ListView.separated(
            padding: const EdgeInsets.fromLTRB(
                NebulaSpacing.md, NebulaSpacing.md, NebulaSpacing.md, NebulaSpacing.xl),
            physics: const AlwaysScrollableScrollPhysics(),
            itemCount: tables.length,
            separatorBuilder: (_, __) => const SizedBox(height: NebulaSpacing.sm),
            itemBuilder: (context, index) {
              final table = tables[index];
              return Material(
                color: cardSurface(context),
                borderRadius: BorderRadius.circular(NebulaSpacing.radiusMd),
                child: InkWell(
                  borderRadius: BorderRadius.circular(NebulaSpacing.radiusMd),
                  onTap: () => Navigator.of(context).push(
                    MaterialPageRoute(builder: (_) => TablePreviewScreen(table: table)),
                  ),
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: NebulaSpacing.md, vertical: NebulaSpacing.sm + 4),
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(NebulaSpacing.radiusMd),
                      border: Border.all(color: hairline(context)),
                    ),
                    child: Row(
                      children: [
                        Icon(LucideIcons.table2, size: 18, color: textSecondary(context)),
                        const SizedBox(width: NebulaSpacing.sm + 2),
                        Expanded(
                            child: Text(table,
                                style: Theme.of(context).textTheme.bodyMedium)),
                        Icon(LucideIcons.chevronRight,
                            size: 18, color: textSecondary(context)),
                      ],
                    ),
                  ),
                ),
              );
            },
          ),
        );
      },
    );
  }
}

/// Read-only preview of one table: columns, up to 100 recent rows, and the
/// real total row count. From `GET /api/database/table/:name`.
class TablePreviewScreen extends ConsumerWidget {
  final String table;

  const TablePreviewScreen({super.key, required this.table});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final previewAsync = ref.watch(dbTablePreviewProvider(table));

    return Scaffold(
      appBar: AppBar(
        title: Text(table),
        actions: [
          IconButton(
            tooltip: 'Refresh',
            icon: const Icon(LucideIcons.refreshCw, size: 20),
            onPressed: () => ref.invalidate(dbTablePreviewProvider(table)),
          ),
        ],
      ),
      body: previewAsync.when(
        loading: () => const ListSkeleton(itemCount: 6, itemHeight: 40),
        error: (error, _) => RefreshableMessage(
          child: ErrorStateView(
            title: 'Could not load "$table"',
            error: error,
            onRetry: () => ref.invalidate(dbTablePreviewProvider(table)),
          ),
        ),
        data: (preview) => RefreshIndicator(
          onRefresh: () async =>
              ref.refresh(dbTablePreviewProvider(table).future),
          child: ListView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.all(NebulaSpacing.md),
            children: [
              Text(
                '${preview.totalCount} row'
                '${preview.totalCount == 1 ? '' : 's'} total'
                '${preview.rows.length < preview.totalCount ? ' · showing first ${preview.rows.length}' : ''}',
                style: Theme.of(context)
                    .textTheme
                    .bodySmall
                    ?.copyWith(color: textSecondary(context)),
              ),
              const SizedBox(height: NebulaSpacing.md),
              if (preview.rows.isEmpty)
                const EmptyStateView(
                  icon: LucideIcons.table2,
                  title: 'Table is empty',
                  message: 'This table currently has no rows.',
                )
              else
                ResultTable(
                  columns: preview.columns.map((c) => c.field).toList(),
                  rows: preview.rows,
                ),
            ],
          ),
        ),
      ),
    );
  }
}

// ─── SQL query tab ───────────────────────────────────────────────────────────

class _QueryTab extends ConsumerStatefulWidget {
  const _QueryTab();

  @override
  ConsumerState<_QueryTab> createState() => _QueryTabState();
}

class _QueryTabState extends ConsumerState<_QueryTab> {
  final TextEditingController _controller = TextEditingController();
  bool _running = false;
  QueryResult? _result;
  Object? _error;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _confirmAndRun() async {
    final query = _controller.text.trim();
    if (query.isEmpty) return;

    final confirmed = await showDialog<bool>(
      context: context,
      barrierDismissible: false,
      builder: (dialogContext) => AlertDialog(
        icon: Icon(LucideIcons.triangleAlert,
            color: Theme.of(dialogContext).colorScheme.error, size: 32),
        title: const Text('Run this query?'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'This runs directly against the production database with no '
              'undo. Review it carefully before continuing:',
            ),
            const SizedBox(height: NebulaSpacing.sm + 4),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(NebulaSpacing.sm + 4),
              decoration: BoxDecoration(
                color: mutedSurface(dialogContext),
                borderRadius: BorderRadius.circular(NebulaSpacing.radiusSm),
              ),
              child: SelectableText(
                query,
                style: const TextStyle(fontFamily: 'monospace', fontSize: 13),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            style: FilledButton.styleFrom(
              backgroundColor: Theme.of(dialogContext).colorScheme.error,
            ),
            onPressed: () => Navigator.of(dialogContext).pop(true),
            child: const Text('Run query'),
          ),
        ],
      ),
    );

    if (confirmed != true || !mounted) return;

    setState(() {
      _running = true;
      _error = null;
    });

    try {
      final result =
          await ref.read(dbExplorerDataSourceProvider).runQuery(query);
      if (!mounted) return;
      setState(() => _result = result);
    } catch (error) {
      if (!mounted) return;
      setState(() => _error = error);
    } finally {
      if (mounted) setState(() => _running = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;

    return ListView(
      padding: const EdgeInsets.all(NebulaSpacing.md),
      children: [
        Text('SQL query', style: Theme.of(context).textTheme.titleSmall),
        const SizedBox(height: NebulaSpacing.xs),
        Text(
          'Runs exactly what you type below with Super Admin privileges. '
          'Nothing is blocked or previewed — always double-check before '
          'confirming.',
          style: Theme.of(context)
              .textTheme
              .bodySmall
              ?.copyWith(color: textSecondary(context)),
        ),
        const SizedBox(height: NebulaSpacing.md),
        TextField(
          controller: _controller,
          maxLines: 6,
          minLines: 4,
          style: const TextStyle(fontFamily: 'monospace', fontSize: 13),
          decoration: const InputDecoration(
            hintText: 'SELECT * FROM users LIMIT 10',
            alignLabelWithHint: true,
          ),
        ),
        const SizedBox(height: NebulaSpacing.md),
        SizedBox(
          height: 48,
          child: ElevatedButton.icon(
            onPressed: _running ? null : _confirmAndRun,
            style: ElevatedButton.styleFrom(backgroundColor: scheme.error),
            icon: _running
                ? const SizedBox(
                    width: 16,
                    height: 16,
                    child: CircularProgressIndicator(
                        strokeWidth: 2, color: Colors.white))
                : const Icon(LucideIcons.play, size: 18),
            label: Text(_running ? 'Running…' : 'Review and run'),
          ),
        ),
        const SizedBox(height: NebulaSpacing.lg),
        if (_error != null)
          ErrorStateView(
            title: 'Query failed',
            error: _error!,
            onRetry: _confirmAndRun,
          )
        else if (_result != null)
          _result!.results.isEmpty
              ? const EmptyStateView(
                  icon: LucideIcons.checkCheck,
                  title: 'Query ran with no rows returned',
                  message: 'The statement executed successfully and returned '
                      'no result rows.',
                )
              : Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '${_result!.results.length} row'
                      '${_result!.results.length == 1 ? '' : 's'} returned',
                      style: Theme.of(context)
                          .textTheme
                          .bodySmall
                          ?.copyWith(color: textSecondary(context)),
                    ),
                    const SizedBox(height: NebulaSpacing.sm),
                    ResultTable(
                      columns: _result!.fields.isNotEmpty
                          ? _result!.fields
                          : (_result!.results.isNotEmpty
                              ? _result!.results.first.keys.toList()
                              : const []),
                      rows: _result!.results,
                    ),
                  ],
                ),
      ],
    );
  }
}
