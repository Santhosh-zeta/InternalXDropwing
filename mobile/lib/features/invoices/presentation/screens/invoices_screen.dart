import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../../../core/constants/access_levels.dart';
import '../../../../core/theme/nebula_spacing.dart';
import '../../../auth/presentation/providers/auth_provider.dart';
import '../../data/invoice_model.dart';
import '../../data/invoice_provider.dart';
import '../widgets/state_views.dart';

/// Invoices are billed in USD at the rate the backend applies to approved
/// timesheet hours.
final NumberFormat invoiceCurrency =
    NumberFormat.currency(locale: 'en_US', symbol: '\$', decimalDigits: 2);

/// Formats a `YYYY-MM` billing period as `January 2026`.
String formatBillingMonth(String month) {
  final parsed = DateTime.tryParse('$month-01');
  if (parsed == null) return month;
  return DateFormat('MMMM yyyy').format(parsed);
}

/// Formats an ISO date (or date-time) as `12 Jan 2026`.
String formatInvoiceDate(String raw) {
  final parsed = DateTime.tryParse(raw);
  if (parsed == null) return raw;
  return DateFormat('d MMM yyyy').format(parsed);
}

final _invoiceSearchProvider = StateProvider.autoDispose<String>((ref) => '');

/// Lists every invoice the signed-in user is allowed to see.
///
/// Access: Level 3 (Admin) and above, plus Level 9 (Client) who sees only their
/// own venture's invoices — this mirrors the web dashboard's menu map and the
/// venture filtering the controller applies. Lower level number = more access.
class InvoicesScreen extends ConsumerWidget {
  const InvoicesScreen({super.key});

  static bool canView(int accessLevel) =>
      AccessLevels.hasAtLeast(accessLevel, AccessLevels.admin) ||
      accessLevel == AccessLevels.client;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // Null when no user is resolved yet — treated as no access rather than
    // defaulting to a real level.
    final accessLevel = ref.watch(authProvider).maybeWhen<int?>(
          authenticated: (user) => user.accessLevel,
          orElse: () => null,
        );

    if (accessLevel == null || !canView(accessLevel)) {
      return Scaffold(
        appBar: AppBar(title: const Text('Invoices')),
        body: const RestrictedStateView(
          moduleName: 'Invoices',
          requirement: 'Level 3 (Admin) or above, or a client account',
        ),
      );
    }

    final invoicesAsync = ref.watch(invoicesProvider);
    final query = ref.watch(_invoiceSearchProvider).trim().toLowerCase();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Invoices'),
        actions: [
          IconButton(
            tooltip: 'Refresh invoices',
            onPressed: () => ref.invalidate(invoicesProvider),
            icon: const Icon(LucideIcons.refreshCw, size: 20),
          ),
        ],
      ),
      body: Column(
        children: [
          const OfflineBanner(),
          Padding(
            padding: const EdgeInsets.fromLTRB(
                NebulaSpacing.md, NebulaSpacing.md, NebulaSpacing.md, NebulaSpacing.sm),
            child: TextField(
              onChanged: (value) =>
                  ref.read(_invoiceSearchProvider.notifier).state = value,
              textInputAction: TextInputAction.search,
              decoration: InputDecoration(
                hintText: 'Search invoice number, venture or month',
                prefixIcon: const Icon(LucideIcons.search, size: 18),
                suffixIcon: query.isEmpty
                    ? null
                    : IconButton(
                        tooltip: 'Clear search',
                        icon: const Icon(LucideIcons.x, size: 18),
                        onPressed: () =>
                            ref.read(_invoiceSearchProvider.notifier).state = '',
                      ),
              ),
            ),
          ),
          Expanded(
            child: invoicesAsync.when(
              loading: () => const ListSkeleton(itemHeight: 104),
              error: (error, _) => RefreshableMessage(
                child: ErrorStateView(
                  title: 'Could not load invoices',
                  error: error,
                  onRetry: () => ref.invalidate(invoicesProvider),
                ),
              ),
              data: (invoices) {
                final filtered = invoices.where((invoice) {
                  if (query.isEmpty) return true;
                  return invoice.invoiceNumber.toLowerCase().contains(query) ||
                      invoice.ventureName.toLowerCase().contains(query) ||
                      invoice.month.toLowerCase().contains(query) ||
                      formatBillingMonth(invoice.month)
                          .toLowerCase()
                          .contains(query);
                }).toList();

                return RefreshIndicator(
                  onRefresh: () async => ref.refresh(invoicesProvider.future),
                  child: filtered.isEmpty
                      ? RefreshableMessage(
                          child: EmptyStateView(
                            icon: LucideIcons.receipt,
                            title: invoices.isEmpty
                                ? 'No invoices yet'
                                : 'No matching invoices',
                            message: invoices.isEmpty
                                ? 'Invoices are generated from approved '
                                    'timesheets. Once a month of timesheets is '
                                    'approved it will appear here.'
                                : 'No invoice matches "$query". Try a different '
                                    'invoice number, venture or month.',
                          ),
                        )
                      : ListView.separated(
                          padding: const EdgeInsets.fromLTRB(NebulaSpacing.md,
                              NebulaSpacing.sm, NebulaSpacing.md, NebulaSpacing.lg),
                          physics: const AlwaysScrollableScrollPhysics(),
                          itemCount: filtered.length,
                          separatorBuilder: (_, __) =>
                              const SizedBox(height: NebulaSpacing.sm + 2),
                          itemBuilder: (context, index) =>
                              _InvoiceCard(invoice: filtered[index]),
                        ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

class _InvoiceCard extends StatelessWidget {
  final InvoiceSummary invoice;

  const _InvoiceCard({required this.invoice});

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final hours = invoice.totalHours;
    final hoursLabel =
        '${hours == hours.roundToDouble() ? hours.toStringAsFixed(0) : hours.toStringAsFixed(2)} hrs';

    return Semantics(
      button: true,
      label: 'Invoice ${invoice.invoiceNumber}, ${invoice.ventureName}, '
          '${formatBillingMonth(invoice.month)}, '
          '${invoiceCurrency.format(invoice.totalAmount)}',
      child: Material(
        color: cardSurface(context),
        borderRadius: BorderRadius.circular(NebulaSpacing.radiusMd),
        child: InkWell(
          borderRadius: BorderRadius.circular(NebulaSpacing.radiusMd),
          onTap: () => context.push('/invoices/${invoice.id}'),
          child: Container(
            constraints: const BoxConstraints(minHeight: 96),
            padding: const EdgeInsets.all(NebulaSpacing.md),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(NebulaSpacing.radiusMd),
              border: Border.all(color: hairline(context)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        invoice.invoiceNumber,
                        style: Theme.of(context).textTheme.titleSmall,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    if (invoice.status.isNotEmpty) _StatusChip(status: invoice.status),
                  ],
                ),
                const SizedBox(height: NebulaSpacing.xs),
                Text(
                  invoice.ventureName,
                  style: Theme.of(context)
                      .textTheme
                      .bodySmall
                      ?.copyWith(color: textSecondary(context)),
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: NebulaSpacing.sm + 2),
                Row(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            formatBillingMonth(invoice.month),
                            style: Theme.of(context)
                                .textTheme
                                .bodySmall
                                ?.copyWith(color: textSecondary(context)),
                          ),
                          Text(
                            hoursLabel,
                            style: Theme.of(context)
                                .textTheme
                                .bodySmall
                                ?.copyWith(color: textSecondary(context)),
                          ),
                        ],
                      ),
                    ),
                    Text(
                      invoiceCurrency.format(invoice.totalAmount),
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            color: scheme.primary,
                            fontWeight: FontWeight.w800,
                          ),
                    ),
                    const SizedBox(width: NebulaSpacing.xs),
                    Icon(LucideIcons.chevronRight,
                        size: 18, color: textSecondary(context)),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _StatusChip extends StatelessWidget {
  final String status;

  const _StatusChip({required this.status});

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final normalised = status.toLowerCase();
    final color = normalised == 'paid'
        ? scheme.tertiary
        : normalised == 'overdue'
            ? scheme.error
            : scheme.secondary;

    return Container(
      padding: const EdgeInsets.symmetric(
          horizontal: NebulaSpacing.sm, vertical: NebulaSpacing.xs),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(NebulaSpacing.radiusFull),
        border: Border.all(color: color.withValues(alpha: 0.4)),
      ),
      child: Text(
        status,
        style: Theme.of(context)
            .textTheme
            .labelSmall
            ?.copyWith(color: color, fontWeight: FontWeight.w600),
      ),
    );
  }
}
