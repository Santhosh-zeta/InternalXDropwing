import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../../../core/rbac/permissions.dart';
import '../../../../core/rbac/rbac_widgets.dart';
import '../../../../core/theme/nebula_spacing.dart';
import '../../../../core/theme/nebula_typography.dart';
import '../../../../core/theme/theme_context.dart';
import '../../../../core/widgets/motion.dart';
import '../../../../core/widgets/primitives.dart';
import '../../../../core/widgets/state_views.dart';
import '../../data/invoice_model.dart';
import '../../data/invoice_provider.dart';
import 'invoices_screen.dart';

/// One invoice, read as a document: identity, the billed line items, totals.
///
/// Access mirrors the list — [Permission.viewInvoices]. The backend
/// additionally refuses a client reading another venture's invoice, and that
/// 403 surfaces in the error state rather than being swallowed.
class InvoiceDetailScreen extends ConsumerWidget {
  const InvoiceDetailScreen({super.key, required this.invoiceId});

  final String invoiceId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Invoice'),
        actions: [
          IconButton(
            tooltip: 'Refresh invoice',
            onPressed: () => ref.invalidate(invoiceDetailProvider(invoiceId)),
            icon: const Icon(LucideIcons.refreshCw, size: 20),
          ),
        ],
      ),
      body: PermissionScope(
        permission: Permission.viewInvoices,
        what: 'invoices',
        child: _InvoiceDetailBody(invoiceId: invoiceId),
      ),
    );
  }
}

class _InvoiceDetailBody extends ConsumerWidget {
  const _InvoiceDetailBody({required this.invoiceId});

  final String invoiceId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final detailAsync = ref.watch(invoiceDetailProvider(invoiceId));

    return Column(
      children: [
        const OfflineStrip(),
        Expanded(
          child: detailAsync.when(
            loading: () => const _DetailSkeleton(),
            error: (error, _) => ListView(
              physics: const AlwaysScrollableScrollPhysics(),
              children: [
                Padding(
                  padding: const EdgeInsets.only(top: NebulaSpacing.xl),
                  child: ErrorStateView(
                    message: readableError(error),
                    onRetry: () =>
                        ref.invalidate(invoiceDetailProvider(invoiceId)),
                  ),
                ),
              ],
            ),
            data: (invoice) => RefreshIndicator(
              onRefresh: () async =>
                  ref.refresh(invoiceDetailProvider(invoiceId).future),
              child: ListView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.fromLTRB(
                  NebulaSpacing.md,
                  NebulaSpacing.md,
                  NebulaSpacing.md,
                  NebulaSpacing.xl,
                ),
                children: [
                  StaggerIn(index: 0, child: _Masthead(invoice: invoice)),
                  const SizedBox(height: NebulaSpacing.lg),
                  StaggerIn(index: 1, child: _LineItems(invoice: invoice)),
                  const SizedBox(height: NebulaSpacing.lg),
                  StaggerIn(index: 2, child: _Totals(invoice: invoice)),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }
}

/// Invoice number, who it bills, and the figure everything else adds up to.
class _Masthead extends StatelessWidget {
  const _Masthead({required this.invoice});

  final InvoiceDetail invoice;

  @override
  Widget build(BuildContext context) {
    final dl = context.dl;

    return DCard(
      emphasised: true,
      padding: const EdgeInsets.all(NebulaSpacing.md),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Mono(
            invoice.invoiceNumber,
            size: 15,
            weight: FontWeight.w600,
            color: dl.timeNext,
          ),
          const SizedBox(height: 3),
          Text(invoice.ventureName, style: context.text.titleMedium),
          const SizedBox(height: NebulaSpacing.md),
          Text(
            'TOTAL',
            style: NebulaTypography.monoLabel(color: dl.textTertiary),
          ),
          const SizedBox(height: 4),
          Mono(
            formatMoney(invoice.totalAmount),
            size: 30,
            weight: FontWeight.w600,
            color: dl.timeNext,
          ),
          const SizedBox(height: NebulaSpacing.md),
          Container(height: 1, color: dl.border),
          const SizedBox(height: NebulaSpacing.md),
          Wrap(
            spacing: NebulaSpacing.lg,
            runSpacing: NebulaSpacing.md,
            children: [
              _Fact(
                label: 'Billing period',
                value: formatBillingMonth(invoice.month),
              ),
              if (invoice.issueDate.isNotEmpty)
                _Fact(
                  label: 'Issued',
                  value: formatInvoiceDate(invoice.issueDate),
                ),
              if (invoice.dueDate.isNotEmpty)
                _Fact(label: 'Due', value: formatInvoiceDate(invoice.dueDate)),
              _Fact(label: 'Hours', value: formatHours(invoice.totalHours)),
              if (invoice.billingRate > 0)
                _Fact(
                  label: 'Rate',
                  value: '${formatMoney(invoice.billingRate)} / h',
                ),
            ],
          ),
        ],
      ),
    );
  }
}

class _Fact extends StatelessWidget {
  const _Fact({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label: '$label: $value',
      child: ExcludeSemantics(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              label.toUpperCase(),
              style: NebulaTypography.monoLabel(
                color: context.dl.textTertiary,
                fontSize: 9,
              ),
            ),
            const SizedBox(height: 3),
            Mono(value, size: 12.5),
          ],
        ),
      ),
    );
  }
}

/// The billed timesheet entries, as a table whose figures share a column edge.
class _LineItems extends StatelessWidget {
  const _LineItems({required this.invoice});

  final InvoiceDetail invoice;

  @override
  Widget build(BuildContext context) {
    final dl = context.dl;

    if (invoice.items.isEmpty) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const SectionHeader('LINE ITEMS'),
          DCard(
            child: EmptyStateView(
              icon: LucideIcons.fileText,
              title: 'No billed hours',
              message: 'This invoice has no approved timesheet entries for '
                  '${formatBillingMonth(invoice.month)}.',
            ),
          ),
        ],
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        SectionHeader(
          'LINE ITEMS',
          trailing: Mono(
            '${invoice.items.length}',
            size: 10,
            color: dl.textTertiary,
          ),
        ),
        DCard(
          padding: const EdgeInsets.symmetric(
            horizontal: NebulaSpacing.md,
            vertical: NebulaSpacing.sm,
          ),
          child: Table(
            columnWidths: const {
              0: FlexColumnWidth(),
              1: IntrinsicColumnWidth(),
              2: IntrinsicColumnWidth(),
            },
            defaultVerticalAlignment: TableCellVerticalAlignment.middle,
            border: TableBorder(
              horizontalInside: BorderSide(color: dl.border),
            ),
            children: [
              TableRow(
                children: [
                  _headCell(context, 'WORK', align: TextAlign.left),
                  _headCell(context, 'HOURS'),
                  _headCell(context, 'AMOUNT'),
                ],
              ),
              for (final item in invoice.items)
                TableRow(children: _itemCells(context, item)),
            ],
          ),
        ),
      ],
    );
  }

  Widget _headCell(
    BuildContext context,
    String label, {
    TextAlign align = TextAlign.right,
  }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: NebulaSpacing.sm, left: 10),
      child: Text(
        label,
        textAlign: align,
        style: NebulaTypography.monoLabel(
          color: context.dl.textTertiary,
          fontSize: 9,
        ),
      ),
    );
  }

  List<Widget> _itemCells(BuildContext context, InvoiceLineItem item) {
    final dl = context.dl;
    const rowPadding = EdgeInsets.symmetric(vertical: 11);

    return [
      Padding(
        padding: rowPadding.copyWith(right: NebulaSpacing.sm),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              item.developer,
              style: context.text.titleSmall,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
            if (item.project.isNotEmpty || item.task != null) ...[
              const SizedBox(height: 2),
              Text(
                [item.project, item.task]
                    .whereType<String>()
                    .where((s) => s.isNotEmpty)
                    .join(' · '),
                style: context.text.bodySmall?.copyWith(fontSize: 11),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
            ],
            if (item.date.isNotEmpty) ...[
              const SizedBox(height: 3),
              Mono(
                formatInvoiceDate(item.date),
                size: 10,
                color: dl.textTertiary,
              ),
            ],
          ],
        ),
      ),
      Padding(
        padding: rowPadding.copyWith(left: 10),
        child: Align(
          alignment: Alignment.centerRight,
          child: Mono(
            formatHours(item.hours),
            size: 12,
            color: context.scheme.onSurfaceVariant,
          ),
        ),
      ),
      Padding(
        padding: rowPadding.copyWith(left: 10),
        child: Align(
          alignment: Alignment.centerRight,
          child: Mono(formatMoney(item.amount), size: 12.5),
        ),
      ),
    ];
  }
}

/// Subtotal and total due — the block the reader's eye lands on last.
class _Totals extends StatelessWidget {
  const _Totals({required this.invoice});

  final InvoiceDetail invoice;

  @override
  Widget build(BuildContext context) {
    final dl = context.dl;
    final hours = formatHours(invoice.totalHours);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const SectionHeader('TOTALS'),
        DCard(
          child: Column(
            children: [
              _TotalRow(
                label: invoice.billingRate > 0
                    ? 'Subtotal · $hours @ ${formatMoney(invoice.billingRate)}/h'
                    : 'Subtotal · $hours',
                value: formatMoney(invoice.totalAmount),
              ),
              Padding(
                padding: const EdgeInsets.symmetric(
                  vertical: NebulaSpacing.sm + 2,
                ),
                child: Container(height: 1, color: dl.border),
              ),
              _TotalRow(
                label: 'Total due',
                value: formatMoney(invoice.totalAmount),
                emphasised: true,
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _TotalRow extends StatelessWidget {
  const _TotalRow({
    required this.label,
    required this.value,
    this.emphasised = false,
  });

  final String label;
  final String value;
  final bool emphasised;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        Expanded(
          child: Text(
            label,
            style: emphasised
                ? context.text.titleSmall
                : context.text.bodySmall?.copyWith(fontSize: 11.5),
          ),
        ),
        const SizedBox(width: NebulaSpacing.sm),
        Mono(
          value,
          size: emphasised ? 19 : 13,
          weight: emphasised ? FontWeight.w600 : FontWeight.w500,
          color: emphasised ? context.dl.timeNext : null,
        ),
      ],
    );
  }
}

class _DetailSkeleton extends StatelessWidget {
  const _DetailSkeleton();

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label: 'Loading invoice',
      liveRegion: true,
      child: ListView(
        padding: const EdgeInsets.all(NebulaSpacing.md),
        physics: const NeverScrollableScrollPhysics(),
        children: const [
          ShimmerBox(height: 190, radius: NebulaSpacing.radiusMd),
          SizedBox(height: NebulaSpacing.lg),
          ShimmerBox(width: 90, height: 10),
          SizedBox(height: NebulaSpacing.sm),
          ShimmerBox(height: 210, radius: NebulaSpacing.radiusMd),
          SizedBox(height: NebulaSpacing.lg),
          ShimmerBox(height: 96, radius: NebulaSpacing.radiusMd),
        ],
      ),
    );
  }
}
