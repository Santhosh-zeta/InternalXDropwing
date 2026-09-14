import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../../../core/network/network_info_provider.dart';
import '../../../../core/rbac/permissions.dart';
import '../../../../core/rbac/rbac_widgets.dart';
import '../../../../core/theme/nebula_colors.dart';
import '../../../../core/theme/nebula_spacing.dart';
import '../../../../core/theme/theme_context.dart';
import '../../../../core/widgets/data_display.dart';
import '../../../../core/widgets/motion.dart';
import '../../../../core/widgets/primitives.dart';
import '../../../../core/widgets/state_views.dart';
import '../../data/invoice_model.dart';
import '../../data/invoice_provider.dart';

// ── Money and figures ────────────────────────────────────────────────────────
//
// Every figure in this module is rendered with [Mono]; these helpers only
// produce the string. Amounts are rupees in Indian digit grouping (1,60,000),
// matching the seeded ventures and the `.in` domains they bill from.

final NumberFormat _rupeeWhole =
    NumberFormat.currency(locale: 'en_IN', symbol: '₹', decimalDigits: 0);
final NumberFormat _rupeePaise =
    NumberFormat.currency(locale: 'en_IN', symbol: '₹', decimalDigits: 2);

/// Formats an amount as rupees. Paise are shown only when the figure actually
/// carries them, so a column of round totals stays narrow but a real 1,160.50
/// is never quietly rounded away.
String formatMoney(double amount) => amount == amount.roundToDouble()
    ? _rupeeWhole.format(amount)
    : _rupeePaise.format(amount);

/// Hours with the unit attached — `8 h`, `6.5 h`.
String formatHours(double hours) {
  final value = hours == hours.roundToDouble()
      ? hours.toStringAsFixed(0)
      : hours.toStringAsFixed(2);
  return '$value h';
}

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

// ── Status ───────────────────────────────────────────────────────────────────
//
// The live controller emits `Unpaid` for every generated invoice; the seeded
// and demo data also carry `paid`, `pending` and `overdue`. Anything else falls
// through to a neutral pill rather than being coloured on a guess.

/// Semantic tone for an invoice status pill.
DTone invoiceTone(String status) {
  switch (status.trim().toLowerCase()) {
    case 'paid':
      return DTone.ok;
    case 'overdue':
      return DTone.critical;
    case 'pending':
    case 'unpaid':
    case 'due':
    case 'sent':
      return DTone.warn;
    default:
      return DTone.neutral;
  }
}

/// Where an invoice sits on the time axis: settled invoices recede, an overdue
/// one takes the critical hue.
TimeState invoiceTimeState(String status) {
  switch (status.trim().toLowerCase()) {
    case 'paid':
      return TimeState.past;
    case 'overdue':
      return TimeState.overdue;
    default:
      return TimeState.next;
  }
}

/// Sort order for the status groups — what needs chasing sits at the top.
int _groupRank(String status) {
  switch (status.trim().toLowerCase()) {
    case 'overdue':
      return 0;
    case 'pending':
    case 'unpaid':
    case 'due':
    case 'sent':
      return 1;
    case 'paid':
      return 3;
    default:
      return 2;
  }
}

final _invoiceSearchProvider = StateProvider.autoDispose<String>((ref) => '');

/// Lists every invoice the signed-in user is allowed to see.
///
/// Invoices are generated server-side from *approved* timesheets, so this
/// screen never mutates anything — `/api/invoices` exposes only the two GET
/// routes. Reading is gated on [Permission.viewInvoices], which mirrors the
/// backend; remember that a lower access level number means more access.
class InvoicesScreen extends ConsumerWidget {
  const InvoicesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
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
      body: const PermissionScope(
        permission: Permission.viewInvoices,
        what: 'invoices',
        child: _InvoicesBody(),
      ),
    );
  }
}

class _InvoicesBody extends ConsumerWidget {
  const _InvoicesBody();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final invoicesAsync = ref.watch(invoicesProvider);
    final query = ref.watch(_invoiceSearchProvider).trim().toLowerCase();

    return Column(
      children: [
        const OfflineStrip(),
        Padding(
          padding: const EdgeInsets.fromLTRB(
            NebulaSpacing.md,
            NebulaSpacing.md,
            NebulaSpacing.md,
            NebulaSpacing.sm,
          ),
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
            loading: () => const Padding(
              padding: EdgeInsets.fromLTRB(
                NebulaSpacing.md,
                NebulaSpacing.sm,
                NebulaSpacing.md,
                NebulaSpacing.md,
              ),
              child: ListSkeleton(count: 6),
            ),
            error: (error, _) => _Refreshable(
              child: ErrorStateView(
                message: readableError(error),
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
                    ? _Refreshable(
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
                    : _InvoiceList(invoices: filtered),
              );
            },
          ),
        ),
      ],
    );
  }
}

/// Invoices grouped by status, each group introduced by a [GroupHeader].
class _InvoiceList extends StatelessWidget {
  const _InvoiceList({required this.invoices});

  final List<InvoiceSummary> invoices;

  @override
  Widget build(BuildContext context) {
    final byStatus = <String, List<InvoiceSummary>>{};
    for (final invoice in invoices) {
      final key = invoice.status.trim().isEmpty
          ? 'Unspecified'
          : invoice.status.trim();
      byStatus.putIfAbsent(key, () => []).add(invoice);
    }

    final keys = byStatus.keys.toList()
      ..sort((a, b) {
        final rank = _groupRank(a).compareTo(_groupRank(b));
        return rank != 0 ? rank : a.toLowerCase().compareTo(b.toLowerCase());
      });

    // One flat child list so the group headers scroll with their rows.
    final children = <Widget>[];
    var index = 0;
    for (final key in keys) {
      final group = byStatus[key]!
        ..sort((a, b) => b.month.compareTo(a.month));
      children.add(
        GroupHeader(key, count: group.length, tone: invoiceTone(key)),
      );
      for (final invoice in group) {
        children.add(
          Padding(
            padding: const EdgeInsets.only(bottom: NebulaSpacing.sm),
            child: StaggerIn(
              index: index++,
              child: _InvoiceRow(invoice: invoice),
            ),
          ),
        );
      }
    }

    return ListView(
      padding: const EdgeInsets.fromLTRB(
        NebulaSpacing.md,
        0,
        NebulaSpacing.md,
        NebulaSpacing.lg,
      ),
      physics: const AlwaysScrollableScrollPhysics(),
      children: children,
    );
  }
}

class _InvoiceRow extends StatelessWidget {
  const _InvoiceRow({required this.invoice});

  final InvoiceSummary invoice;

  @override
  Widget build(BuildContext context) {
    final state = invoiceTimeState(invoice.status);
    final tone = invoiceTone(invoice.status);

    return Semantics(
      button: true,
      label: 'Invoice ${invoice.invoiceNumber}, ${invoice.ventureName}, '
          '${formatBillingMonth(invoice.month)}, '
          '${formatMoney(invoice.totalAmount)}, ${invoice.status}',
      child: ExcludeSemantics(
        child: EntityRow(
          title: invoice.ventureName.isEmpty
              ? invoice.invoiceNumber
              : invoice.ventureName,
          spineColor: NebulaColors.forVentureId(invoice.ventureId),
          timeState: state,
          onTap: () => context.push('/invoices/${invoice.id}'),
          meta: [
            Mono(invoice.invoiceNumber, size: 10.5),
            Mono(formatBillingMonth(invoice.month), size: 10.5),
            Mono(formatHours(invoice.totalHours), size: 10.5),
          ],
          trailing: Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            mainAxisSize: MainAxisSize.min,
            children: [
              Mono(
                formatMoney(invoice.totalAmount),
                size: 14,
                weight: FontWeight.w600,
                color: state == TimeState.overdue
                    ? context.dl.critical
                    : context.scheme.onSurface,
              ),
              if (invoice.status.trim().isNotEmpty) ...[
                const SizedBox(height: 5),
                DTag(invoice.status, tone: tone),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

/// Keeps pull-to-refresh alive behind a non-scrolling state view.
class _Refreshable extends StatelessWidget {
  const _Refreshable({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) => ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        children: [
          ConstrainedBox(
            constraints: BoxConstraints(minHeight: constraints.maxHeight),
            child: child,
          ),
        ],
      ),
    );
  }
}

/// Shows the kit's [OfflineBanner] only while the device reports no
/// connectivity — the core banner itself is unconditional.
class OfflineStrip extends ConsumerWidget {
  const OfflineStrip({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final online = ref.watch(networkInfoProvider).maybeWhen(
          data: (value) => value,
          orElse: () => true,
        );
    if (online) return const SizedBox.shrink();
    return const OfflineBanner();
  }
}
