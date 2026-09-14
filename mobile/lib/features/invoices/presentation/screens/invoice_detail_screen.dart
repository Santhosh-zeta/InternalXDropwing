import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../../../core/theme/nebula_spacing.dart';
import '../../../auth/presentation/providers/auth_provider.dart';
import '../../data/invoice_model.dart';
import '../../data/invoice_provider.dart';
import '../widgets/state_views.dart';
import 'invoices_screen.dart';

/// Full breakdown of one invoice: header, billed timesheet line items, totals.
///
/// Access matches [InvoicesScreen.canView]; the backend additionally refuses a
/// client (Level 9) reading another venture's invoice, and that 403 surfaces in
/// the error state rather than being hidden.
class InvoiceDetailScreen extends ConsumerWidget {
  final String invoiceId;

  const InvoiceDetailScreen({super.key, required this.invoiceId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final accessLevel = ref.watch(authProvider).maybeWhen<int?>(
          authenticated: (user) => user.accessLevel,
          orElse: () => null,
        );

    if (accessLevel == null || !InvoicesScreen.canView(accessLevel)) {
      return Scaffold(
        appBar: AppBar(title: const Text('Invoice')),
        body: const RestrictedStateView(
          moduleName: 'Invoices',
          requirement: 'Level 3 (Admin) or above, or a client account',
        ),
      );
    }

    final detailAsync = ref.watch(invoiceDetailProvider(invoiceId));

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
      body: Column(
        children: [
          const OfflineBanner(),
          Expanded(
            child: detailAsync.when(
              loading: () => const _DetailSkeleton(),
              error: (error, _) => RefreshableMessage(
                child: ErrorStateView(
                  title: 'Could not load this invoice',
                  error: error,
                  onRetry: () =>
                      ref.invalidate(invoiceDetailProvider(invoiceId)),
                ),
              ),
              data: (invoice) => RefreshIndicator(
                onRefresh: () async =>
                    ref.refresh(invoiceDetailProvider(invoiceId).future),
                child: ListView(
                  physics: const AlwaysScrollableScrollPhysics(),
                  padding: const EdgeInsets.fromLTRB(NebulaSpacing.md,
                      NebulaSpacing.md, NebulaSpacing.md, NebulaSpacing.xl),
                  children: [
                    _InvoiceHeader(invoice: invoice),
                    const SizedBox(height: NebulaSpacing.md),
                    _LineItems(invoice: invoice),
                    const SizedBox(height: NebulaSpacing.md),
                    _Totals(invoice: invoice),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _InvoiceHeader extends StatelessWidget {
  final InvoiceDetail invoice;

  const _InvoiceHeader({required this.invoice});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(NebulaSpacing.md),
      decoration: BoxDecoration(
        color: cardSurface(context),
        borderRadius: BorderRadius.circular(NebulaSpacing.radiusMd),
        border: Border.all(color: hairline(context)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(invoice.invoiceNumber,
              style: Theme.of(context).textTheme.titleLarge),
          const SizedBox(height: NebulaSpacing.xs),
          Text(
            invoice.ventureName,
            style: Theme.of(context)
                .textTheme
                .bodyMedium
                ?.copyWith(color: textSecondary(context)),
          ),
          const SizedBox(height: NebulaSpacing.md),
          Wrap(
            spacing: NebulaSpacing.lg,
            runSpacing: NebulaSpacing.sm,
            children: [
              _HeaderFact(
                  label: 'Billing period',
                  value: formatBillingMonth(invoice.month)),
              if (invoice.issueDate.isNotEmpty)
                _HeaderFact(
                    label: 'Issued', value: formatInvoiceDate(invoice.issueDate)),
              if (invoice.dueDate.isNotEmpty)
                _HeaderFact(
                    label: 'Due', value: formatInvoiceDate(invoice.dueDate)),
              if (invoice.billingRate > 0)
                _HeaderFact(
                  label: 'Rate',
                  value: '${invoiceCurrency.format(invoice.billingRate)} / hr',
                ),
            ],
          ),
        ],
      ),
    );
  }
}

class _HeaderFact extends StatelessWidget {
  final String label;
  final String value;

  const _HeaderFact({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label: '$label: $value',
      child: ExcludeSemantics(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(label,
                style: Theme.of(context)
                    .textTheme
                    .labelSmall
                    ?.copyWith(color: textSecondary(context))),
            const SizedBox(height: 2),
            Text(value, style: Theme.of(context).textTheme.titleSmall),
          ],
        ),
      ),
    );
  }
}

class _LineItems extends StatelessWidget {
  final InvoiceDetail invoice;

  const _LineItems({required this.invoice});

  @override
  Widget build(BuildContext context) {
    if (invoice.items.isEmpty) {
      return Container(
        padding: const EdgeInsets.all(NebulaSpacing.md),
        decoration: BoxDecoration(
          color: cardSurface(context),
          borderRadius: BorderRadius.circular(NebulaSpacing.radiusMd),
          border: Border.all(color: hairline(context)),
        ),
        child: const EmptyStateView(
          icon: LucideIcons.fileText,
          title: 'No billed hours',
          message: 'This invoice has no approved timesheet entries for the '
              'selected billing period.',
        ),
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(
              left: NebulaSpacing.xs, bottom: NebulaSpacing.sm),
          child: Text(
            'Line items (${invoice.items.length})',
            style: Theme.of(context).textTheme.titleSmall,
          ),
        ),
        Container(
          decoration: BoxDecoration(
            color: cardSurface(context),
            borderRadius: BorderRadius.circular(NebulaSpacing.radiusMd),
            border: Border.all(color: hairline(context)),
          ),
          child: Column(
            children: [
              for (var i = 0; i < invoice.items.length; i++) ...[
                if (i > 0) Divider(height: 1, color: hairline(context)),
                _LineItemRow(item: invoice.items[i]),
              ],
            ],
          ),
        ),
      ],
    );
  }
}

class _LineItemRow extends StatelessWidget {
  final InvoiceLineItem item;

  const _LineItemRow({required this.item});

  @override
  Widget build(BuildContext context) {
    final hoursLabel = item.hours == item.hours.roundToDouble()
        ? item.hours.toStringAsFixed(0)
        : item.hours.toStringAsFixed(2);

    return Semantics(
      label: '${item.developer}, ${item.project}, $hoursLabel hours, '
          '${invoiceCurrency.format(item.amount)}',
      child: ExcludeSemantics(
        child: Padding(
          padding: const EdgeInsets.all(NebulaSpacing.md),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(item.developer,
                        style: Theme.of(context).textTheme.titleSmall),
                    const SizedBox(height: 2),
                    Text(
                      item.project,
                      style: Theme.of(context)
                          .textTheme
                          .bodySmall
                          ?.copyWith(color: textSecondary(context)),
                    ),
                    if (item.task != null) ...[
                      const SizedBox(height: 2),
                      Text(
                        item.task!,
                        style: Theme.of(context)
                            .textTheme
                            .bodySmall
                            ?.copyWith(color: textSecondary(context)),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                    if (item.date.isNotEmpty) ...[
                      const SizedBox(height: 2),
                      Text(
                        formatInvoiceDate(item.date),
                        style: Theme.of(context)
                            .textTheme
                            .labelSmall
                            ?.copyWith(color: textSecondary(context)),
                      ),
                    ],
                  ],
                ),
              ),
              const SizedBox(width: NebulaSpacing.sm),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text('$hoursLabel hrs',
                      style: Theme.of(context)
                          .textTheme
                          .bodySmall
                          ?.copyWith(color: textSecondary(context))),
                  const SizedBox(height: 2),
                  Text(invoiceCurrency.format(item.amount),
                      style: Theme.of(context).textTheme.titleSmall),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _Totals extends StatelessWidget {
  final InvoiceDetail invoice;

  const _Totals({required this.invoice});

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final hoursLabel = invoice.totalHours == invoice.totalHours.roundToDouble()
        ? invoice.totalHours.toStringAsFixed(0)
        : invoice.totalHours.toStringAsFixed(2);

    return Container(
      padding: const EdgeInsets.all(NebulaSpacing.md),
      decoration: BoxDecoration(
        color: cardSurface(context),
        borderRadius: BorderRadius.circular(NebulaSpacing.radiusMd),
        border: Border.all(color: scheme.primary.withValues(alpha: 0.35)),
      ),
      child: Column(
        children: [
          _TotalRow(
            label: invoice.billingRate > 0
                ? 'Subtotal ($hoursLabel hrs @ '
                    '${invoiceCurrency.format(invoice.billingRate)}/hr)'
                : 'Subtotal ($hoursLabel hrs)',
            value: invoiceCurrency.format(invoice.totalAmount),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(vertical: NebulaSpacing.sm),
            child: Divider(height: 1, color: hairline(context)),
          ),
          _TotalRow(
            label: 'Total due',
            value: invoiceCurrency.format(invoice.totalAmount),
            emphasised: true,
          ),
        ],
      ),
    );
  }
}

class _TotalRow extends StatelessWidget {
  final String label;
  final String value;
  final bool emphasised;

  const _TotalRow({
    required this.label,
    required this.value,
    this.emphasised = false,
  });

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Expanded(
          child: Text(
            label,
            style: emphasised
                ? Theme.of(context).textTheme.titleSmall
                : Theme.of(context)
                    .textTheme
                    .bodySmall
                    ?.copyWith(color: textSecondary(context)),
          ),
        ),
        const SizedBox(width: NebulaSpacing.sm),
        Text(
          value,
          style: emphasised
              ? Theme.of(context).textTheme.titleLarge?.copyWith(
                    color: scheme.primary,
                    fontWeight: FontWeight.w800,
                  )
              : Theme.of(context).textTheme.titleSmall,
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
          ShimmerBox(height: 140, radius: NebulaSpacing.radiusMd),
          SizedBox(height: NebulaSpacing.md),
          ShimmerBox(height: 220, radius: NebulaSpacing.radiusMd),
          SizedBox(height: NebulaSpacing.md),
          ShimmerBox(height: 96, radius: NebulaSpacing.radiusMd),
        ],
      ),
    );
  }
}
