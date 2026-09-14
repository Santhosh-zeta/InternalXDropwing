import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../../../core/network/network_info_provider.dart';
import '../../../../core/rbac/permissions.dart';
import '../../../../core/rbac/rbac_widgets.dart';
import '../../../../core/theme/nebula_colors.dart';
import '../../../../core/theme/nebula_spacing.dart';
import '../../../../core/theme/nebula_typography.dart';
import '../../../../core/theme/theme_context.dart';
import '../../../../core/widgets/data_display.dart';
import '../../../../core/widgets/motion.dart';
import '../../../../core/widgets/primitives.dart';
import '../../../../core/widgets/state_views.dart';
import '../../../auth/data/models/auth_models.dart';
import '../../data/budget_model.dart';
import '../../data/budget_provider.dart';

// ── Money ────────────────────────────────────────────────────────────────────

final NumberFormat _rupeeWhole =
    NumberFormat.currency(locale: 'en_IN', symbol: '₹', decimalDigits: 0);
final NumberFormat _rupeePaise =
    NumberFormat.currency(locale: 'en_IN', symbol: '₹', decimalDigits: 2);

/// Rupees in Indian digit grouping. Paise appear only when the figure has them,
/// so the common round allocation stays readable. Always rendered in [Mono].
String _money(double amount) => amount == amount.roundToDouble()
    ? _rupeeWhole.format(amount)
    : _rupeePaise.format(amount);

String _signedMoney(double amount) =>
    amount > 0 ? '+${_money(amount)}' : _money(amount);

/// One decimal, because that is the precision `utilizationPct` arrives with.
String _percent(double value) => '${value.toStringAsFixed(1)}%';

/// Utilisation colour ramp — the only place hue means something other than a
/// venture on this screen, and it is a status, not decoration.
Color _utilisationColor(BuildContext context, double pct) {
  final dl = context.dl;
  if (pct >= 90) return dl.critical;
  if (pct >= 70) return dl.warning;
  return dl.success;
}

/// A venture's real colour: the hex the API put on the signed-in user's own
/// venture when the row is theirs, otherwise the seeded fallback for its
/// position in the venture list the backend orders by.
Color _ventureColor(String name, int index, User? user) {
  final venture = user?.venture;
  if (venture != null &&
      venture.name.trim().toLowerCase() == name.trim().toLowerCase()) {
    return NebulaColors.parseHex(
      venture.primaryColor,
      fallback: NebulaColors.forVentureId(venture.id),
    );
  }
  return NebulaColors.forVentureId(index + 1);
}

/// Budget figures for whichever ventures the signed-in user may see.
///
/// The backend refuses `accessLevel > 4` outright, and computes
/// `isGlobal = accessLevel <= 2` to decide whether the response covers every
/// venture or just the caller's own. Both rules are mirrored here — remember
/// that a lower level number means MORE access.
class BudgetScreen extends ConsumerWidget {
  const BudgetScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return DefaultTabController(
      length: 3,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Budget'),
          bottom: const TabBar(
            tabs: [
              Tab(text: 'Overview'),
              Tab(text: 'Expenses'),
              Tab(text: 'Monthly'),
            ],
          ),
        ),
        body: const PermissionScope(
          permission: Permission.viewBudget,
          what: 'budgets',
          child: Column(
            children: [
              _OfflineStrip(),
              Expanded(
                child: TabBarView(
                  children: [_OverviewTab(), _ExpensesTab(), _MonthlyTab()],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ── Overview ─────────────────────────────────────────────────────────────────

class _OverviewTab extends ConsumerWidget {
  const _OverviewTab();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final summaryAsync = ref.watch(budgetSummaryProvider);
    final user = ref.watch(currentUserProvider);

    // Levels 1-2 only, mirroring `isGlobal = accessLevel <= 2`. A CXO is
    // scoped to their own venture, so nothing on their screen is framed as a
    // group-wide figure and the cross-venture breakdown is not rendered.
    final seesAllVentures =
        ref.watch(canProvider(Permission.viewBudgetAllVentures));

    return summaryAsync.when(
      loading: () => const _TabSkeleton(),
      error: (error, _) => _Refreshable(
        child: ErrorStateView(
          message: readableError(error),
          onRetry: () => ref.invalidate(budgetSummaryProvider),
        ),
      ),
      data: (summary) {
        final ventureRows = _visibleVentures(summary, user, seesAllVentures);
        final allocated = summary.totalBudget;
        final spent = summary.spent;
        final scopeLabel = seesAllVentures
            ? 'ALL VENTURES'
            : (user?.venture?.name.toUpperCase() ?? 'YOUR VENTURE');

        return RefreshIndicator(
          onRefresh: () async => ref.refresh(budgetSummaryProvider.future),
          child: ListView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.fromLTRB(
              NebulaSpacing.md,
              NebulaSpacing.md,
              NebulaSpacing.md,
              NebulaSpacing.xl,
            ),
            children: [
              StaggerIn(
                index: 0,
                child: _SpendVsAllocation(
                  allocated: allocated,
                  spent: spent,
                  remaining: summary.remaining,
                  utilisationPct: summary.utilizationPct,
                  scopeLabel: scopeLabel,
                ),
              ),
              const SizedBox(height: NebulaSpacing.lg),
              StaggerIn(
                index: 1,
                child: _UtilisationGauge(pct: summary.utilizationPct),
              ),
              if (ventureRows.isNotEmpty) ...[
                const SizedBox(height: NebulaSpacing.lg),
                StaggerIn(
                  index: 2,
                  child: _VentureBreakdown(
                    rows: ventureRows,
                    user: user,
                    totalSpent: spent,
                    showSegmentedBar: seesAllVentures,
                  ),
                ),
              ],
            ],
          ),
        );
      },
    );
  }

  /// A user without [Permission.viewBudgetAllVentures] only ever sees the row
  /// for their own venture, even if a response happens to carry more.
  List<({BudgetVentureBreakdown row, int index})> _visibleVentures(
    BudgetSummary summary,
    User? user,
    bool seesAllVentures,
  ) {
    final all = <({BudgetVentureBreakdown row, int index})>[
      for (var i = 0; i < summary.ventureBreakdown.length; i++)
        (row: summary.ventureBreakdown[i], index: i),
    ];
    if (seesAllVentures) return all;

    final own = user?.venture?.name.trim().toLowerCase();
    if (own == null || own.isEmpty) return const [];
    return all
        .where((e) => e.row.name.trim().toLowerCase() == own)
        .toList(growable: false);
  }
}

/// Spend against allocation, with the one bar that answers "how much is left".
class _SpendVsAllocation extends StatelessWidget {
  const _SpendVsAllocation({
    required this.allocated,
    required this.spent,
    required this.remaining,
    required this.utilisationPct,
    required this.scopeLabel,
  });

  final double allocated;
  final double spent;
  final double remaining;
  final double utilisationPct;
  final String scopeLabel;

  @override
  Widget build(BuildContext context) {
    final dl = context.dl;
    final color = _utilisationColor(context, utilisationPct);
    final fraction = allocated > 0 ? spent / allocated : 0.0;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        SectionHeader(
          'SPEND · $scopeLabel',
          trailing: Mono(_percent(utilisationPct), size: 10, color: color),
        ),
        DCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.baseline,
                textBaseline: TextBaseline.alphabetic,
                children: [
                  Flexible(
                    child: Mono(
                      _money(spent),
                      size: 27,
                      weight: FontWeight.w600,
                      color: dl.timeNext,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    'of ',
                    style: context.text.bodySmall?.copyWith(fontSize: 11.5),
                  ),
                  Flexible(
                    child: Mono(
                      _money(allocated),
                      size: 12.5,
                      color: dl.textTertiary,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: NebulaSpacing.md),
              ProgressTrack(value: fraction, color: color, height: 8),
              const SizedBox(height: NebulaSpacing.sm + 2),
              Row(
                children: [
                  Text(
                    'Remaining',
                    style: context.text.bodySmall?.copyWith(fontSize: 11.5),
                  ),
                  const Spacer(),
                  Mono(
                    _money(remaining),
                    size: 13,
                    weight: FontWeight.w600,
                    color: remaining < 0 ? dl.critical : dl.success,
                  ),
                ],
              ),
            ],
          ),
        ),
      ],
    );
  }
}

/// The utilisation dial. Every colour is resolved from the theme and handed to
/// the painter — nothing inside the paint call knows what a NebulaColor is.
class _UtilisationGauge extends StatelessWidget {
  const _UtilisationGauge({required this.pct});

  final double pct;

  @override
  Widget build(BuildContext context) {
    final dl = context.dl;
    final clamped = pct.clamp(0.0, 100.0);
    final color = _utilisationColor(context, clamped);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const SectionHeader('UTILISATION'),
        DCard(
          padding: const EdgeInsets.symmetric(vertical: NebulaSpacing.lg),
          child: Center(
            child: SizedBox(
              width: 176,
              height: 176,
              child: Stack(
                alignment: Alignment.center,
                children: [
                  CustomPaint(
                    size: const Size.square(176),
                    painter: _GaugePainter(
                      value: clamped / 100,
                      color: color,
                      track: dl.surfaceRaised,
                    ),
                  ),
                  Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Mono(
                        _percent(clamped),
                        size: 30,
                        weight: FontWeight.w600,
                        color: color,
                      ),
                      const SizedBox(height: 2),
                      Text(
                        'of allocation',
                        style: context.text.bodySmall?.copyWith(fontSize: 11),
                      ),
                    ],
                  ),
                  // Axis ticks, mono like every other figure.
                  Positioned(
                    left: 12,
                    bottom: 20,
                    child: Mono('0', size: 9, color: dl.textTertiary),
                  ),
                  Positioned(
                    right: 6,
                    bottom: 20,
                    child: Mono('100', size: 9, color: dl.textTertiary),
                  ),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }
}

class _GaugePainter extends CustomPainter {
  const _GaugePainter({
    required this.value,
    required this.color,
    required this.track,
  });

  final double value;
  final Color color;
  final Color track;

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = size.width / 2 - 12;
    const startAngle = -math.pi * 0.75;
    const sweepFull = math.pi * 1.5;
    final rect = Rect.fromCircle(center: center, radius: radius);

    final trackPaint = Paint()
      ..color = track
      ..style = PaintingStyle.stroke
      ..strokeWidth = 12
      ..strokeCap = StrokeCap.round;
    canvas.drawArc(rect, startAngle, sweepFull, false, trackPaint);

    if (value <= 0) return;
    final fillPaint = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = 12
      ..strokeCap = StrokeCap.round;
    canvas.drawArc(
      rect,
      startAngle,
      sweepFull * value.clamp(0.0, 1.0),
      false,
      fillPaint,
    );
  }

  @override
  bool shouldRepaint(_GaugePainter old) =>
      old.value != value || old.color != color || old.track != track;
}

/// Spend split by venture: one segmented bar, then the rows behind it.
class _VentureBreakdown extends StatelessWidget {
  const _VentureBreakdown({
    required this.rows,
    required this.user,
    required this.totalSpent,
    required this.showSegmentedBar,
  });

  final List<({BudgetVentureBreakdown row, int index})> rows;
  final User? user;
  final double totalSpent;
  final bool showSegmentedBar;

  @override
  Widget build(BuildContext context) {
    final colors = [
      for (final entry in rows)
        _ventureColor(entry.row.name, entry.index, user),
    ];
    final sum = rows.fold<double>(0, (t, e) => t + e.row.amount);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        SectionHeader(showSegmentedBar ? 'BY VENTURE' : 'YOUR VENTURE'),
        DCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              if (showSegmentedBar && sum > 0) ...[
                ProgressTrack.segmented(
                  [
                    for (var i = 0; i < rows.length; i++)
                      (value: rows[i].row.amount / sum, color: colors[i]),
                  ],
                  height: 8,
                ),
                const SizedBox(height: NebulaSpacing.md),
              ],
              for (var i = 0; i < rows.length; i++) ...[
                if (i > 0) const SizedBox(height: NebulaSpacing.md),
                _VentureLine(
                  breakdown: rows[i].row,
                  color: colors[i],
                  fraction: totalSpent > 0
                      ? rows[i].row.amount / totalSpent
                      : 0.0,
                ),
              ],
            ],
          ),
        ),
      ],
    );
  }
}

class _VentureLine extends StatelessWidget {
  const _VentureLine({
    required this.breakdown,
    required this.color,
    required this.fraction,
  });

  final BudgetVentureBreakdown breakdown;
  final Color color;
  final double fraction;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: [
            VentureDot(color),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                breakdown.name.isEmpty ? 'Unnamed venture' : breakdown.name,
                style: context.text.titleSmall,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ),
            const SizedBox(width: NebulaSpacing.sm),
            Mono(_money(breakdown.amount), size: 12.5),
          ],
        ),
        const SizedBox(height: 7),
        Row(
          children: [
            Expanded(child: ProgressTrack(value: fraction, color: color)),
            const SizedBox(width: 10),
            SizedBox(
              width: 44,
              child: Align(
                alignment: Alignment.centerRight,
                child: Mono(
                  _percent(breakdown.percentage),
                  size: 10,
                  color: context.dl.textTertiary,
                ),
              ),
            ),
          ],
        ),
      ],
    );
  }
}

// ── Expenses ─────────────────────────────────────────────────────────────────

class _ExpensesTab extends ConsumerWidget {
  const _ExpensesTab();

  static IconData _categoryIcon(String category) {
    switch (category.toLowerCase()) {
      case 'travel':
        return LucideIcons.plane;
      case 'software':
      case 'software licenses':
      case 'tools':
        return LucideIcons.monitor;
      case 'marketing':
        return LucideIcons.megaphone;
      case 'hr':
      case 'salaries':
        return LucideIcons.users;
      case 'office':
        return LucideIcons.building2;
      case 'training':
        return LucideIcons.graduationCap;
      default:
        return LucideIcons.receipt;
    }
  }

  static String _formatDate(String raw) {
    final parsed = DateTime.tryParse(raw);
    if (parsed == null) return raw;
    return DateFormat('d MMM yyyy').format(parsed);
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final expensesAsync = ref.watch(budgetExpensesProvider);
    final user = ref.watch(currentUserProvider);

    // Reuses the already-loaded summary purely to colour each row's venture
    // spine; it never contributes a figure.
    final ventureOrder = ref
            .watch(budgetSummaryProvider)
            .valueOrNull
            ?.ventureBreakdown
            .map((v) => v.name.trim().toLowerCase())
            .toList() ??
        const <String>[];

    return expensesAsync.when(
      loading: () => const _TabSkeleton(),
      error: (error, _) => _Refreshable(
        child: ErrorStateView(
          message: readableError(error),
          onRetry: () => ref.invalidate(budgetExpensesProvider),
        ),
      ),
      data: (expenses) {
        if (expenses.isEmpty) {
          return const _Refreshable(
            child: EmptyStateView(
              icon: LucideIcons.receipt,
              title: 'No expenses recorded',
              message: 'Expense lines are derived from logged time. Nothing '
                  'has been booked against this budget yet.',
            ),
          );
        }

        return RefreshIndicator(
          onRefresh: () async => ref.refresh(budgetExpensesProvider.future),
          child: ListView.separated(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.fromLTRB(
              NebulaSpacing.md,
              NebulaSpacing.md,
              NebulaSpacing.md,
              NebulaSpacing.xl,
            ),
            itemCount: expenses.length,
            separatorBuilder: (_, __) => const SizedBox(height: NebulaSpacing.sm),
            itemBuilder: (context, i) {
              final expense = expenses[i];
              final name = expense.ventureName?.trim().toLowerCase() ?? '';
              final position = ventureOrder.indexOf(name);
              final title = expense.category.trim().isNotEmpty
                  ? expense.category
                  : (expense.description?.trim().isNotEmpty ?? false)
                      ? expense.description!
                      : 'Expense';

              return StaggerIn(
                index: i,
                child: EntityRow(
                  title: title,
                  timeState: TimeState.past,
                  spineColor: expense.ventureName == null
                      ? null
                      : _ventureColor(expense.ventureName!, position, user),
                  leading: Icon(
                    _categoryIcon(expense.category),
                    size: 17,
                    color: context.dl.textTertiary,
                  ),
                  meta: [
                    if (expense.date.isNotEmpty)
                      Mono(_formatDate(expense.date), size: 10.5),
                    if (expense.ventureName != null &&
                        expense.ventureName!.isNotEmpty)
                      Text(expense.ventureName!),
                    if (expense.category.trim().isNotEmpty &&
                        (expense.description?.trim().isNotEmpty ?? false))
                      Text(expense.description!),
                  ],
                  trailing: Mono(
                    _money(expense.amount),
                    size: 13.5,
                    weight: FontWeight.w600,
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

// ── Monthly ──────────────────────────────────────────────────────────────────

class _MonthlyTab extends ConsumerWidget {
  const _MonthlyTab();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final monthlyAsync = ref.watch(monthlyBudgetProvider);

    return monthlyAsync.when(
      loading: () => const _TabSkeleton(),
      error: (error, _) => _Refreshable(
        child: ErrorStateView(
          message: readableError(error),
          onRetry: () => ref.invalidate(monthlyBudgetProvider),
        ),
      ),
      data: (months) {
        if (months.isEmpty) {
          return const _Refreshable(
            child: EmptyStateView(
              icon: LucideIcons.calendarDays,
              title: 'No monthly data',
              message: 'There is no month of booked spend to trend yet.',
            ),
          );
        }

        return RefreshIndicator(
          onRefresh: () async => ref.refresh(monthlyBudgetProvider.future),
          child: ListView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.fromLTRB(
              NebulaSpacing.md,
              NebulaSpacing.md,
              NebulaSpacing.md,
              NebulaSpacing.xl,
            ),
            children: [
              StaggerIn(index: 0, child: _MonthlyChart(months: months)),
              const SizedBox(height: NebulaSpacing.lg),
              const SectionHeader('BY MONTH'),
              for (var i = 0; i < months.length; i++)
                Padding(
                  padding: const EdgeInsets.only(bottom: NebulaSpacing.sm),
                  child: StaggerIn(
                    index: i + 1,
                    child: _MonthCard(month: months[i]),
                  ),
                ),
            ],
          ),
        );
      },
    );
  }
}

/// Target against actual, month by month. The painter draws only geometry; the
/// axis and value labels are [Mono] widgets laid over the same column grid.
class _MonthlyChart extends StatelessWidget {
  const _MonthlyChart({required this.months});

  final List<MonthlyBudget> months;

  @override
  Widget build(BuildContext context) {
    final dl = context.dl;
    final scheme = context.scheme;
    final peak = months.fold<double>(
      0,
      (m, b) => math.max(m, math.max(b.target, b.actual)),
    );

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        SectionHeader(
          'TARGET VS ACTUAL',
          trailing: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              _LegendSwatch(color: dl.borderStrong, label: 'TARGET'),
              const SizedBox(width: 10),
              _LegendSwatch(color: scheme.primary, label: 'ACTUAL'),
            ],
          ),
        ),
        DCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Value axis, top to bottom, in mono.
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Mono(
                    peak > 0 ? _money(peak) : _money(0),
                    size: 9,
                    color: dl.textTertiary,
                  ),
                  Mono('0', size: 9, color: dl.textTertiary),
                ],
              ),
              const SizedBox(height: 6),
              SizedBox(
                height: 132,
                child: CustomPaint(
                  size: Size.infinite,
                  painter: _MonthlyBarsPainter(
                    months: months,
                    peak: peak,
                    targetColor: dl.borderStrong,
                    actualColor: scheme.primary,
                    overColor: dl.critical,
                    gridColor: dl.border,
                  ),
                ),
              ),
              const SizedBox(height: 7),
              Row(
                children: [
                  for (final m in months)
                    Expanded(
                      child: Center(
                        child: Mono(
                          _shortMonth(m.month),
                          size: 9,
                          color: dl.textTertiary,
                        ),
                      ),
                    ),
                ],
              ),
            ],
          ),
        ),
      ],
    );
  }

  /// `Sep 2026` → `SEP`; anything else is passed through uppercased.
  static String _shortMonth(String raw) {
    final first = raw.trim().split(RegExp(r'[\s-]')).first;
    return first.isEmpty
        ? raw.toUpperCase()
        : first.substring(0, math.min(3, first.length)).toUpperCase();
  }
}

class _LegendSwatch extends StatelessWidget {
  const _LegendSwatch({required this.color, required this.label});

  final Color color;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 7,
          height: 7,
          decoration: BoxDecoration(
            color: color,
            borderRadius: BorderRadius.circular(1.5),
          ),
        ),
        const SizedBox(width: 5),
        Text(
          label,
          style: NebulaTypography.monoLabel(
            color: context.dl.textTertiary,
            fontSize: 8.5,
          ),
        ),
      ],
    );
  }
}

class _MonthlyBarsPainter extends CustomPainter {
  const _MonthlyBarsPainter({
    required this.months,
    required this.peak,
    required this.targetColor,
    required this.actualColor,
    required this.overColor,
    required this.gridColor,
  });

  final List<MonthlyBudget> months;
  final double peak;
  final Color targetColor;
  final Color actualColor;
  final Color overColor;
  final Color gridColor;

  @override
  void paint(Canvas canvas, Size size) {
    if (months.isEmpty) return;

    final grid = Paint()
      ..color = gridColor
      ..strokeWidth = 1;
    for (var i = 0; i <= 2; i++) {
      final y = size.height * (i / 2);
      canvas.drawLine(Offset(0, y), Offset(size.width, y), grid);
    }

    final slot = size.width / months.length;
    final barWidth = math.min(13.0, slot / 3.4);
    final gap = barWidth * 0.35;
    final scale = peak > 0 ? size.height / peak : 0.0;
    const radius = Radius.circular(2);

    for (var i = 0; i < months.length; i++) {
      final month = months[i];
      final centre = slot * i + slot / 2;

      void bar(double value, double dx, Color color) {
        final height = (value * scale).clamp(0.0, size.height);
        if (height <= 0) return;
        final rect = RRect.fromRectAndCorners(
          Rect.fromLTWH(
            centre + dx - barWidth / 2,
            size.height - height,
            barWidth,
            height,
          ),
          topLeft: radius,
          topRight: radius,
        );
        canvas.drawRRect(rect, Paint()..color = color);
      }

      bar(month.target, -(barWidth / 2 + gap / 2), targetColor);
      bar(
        month.actual,
        barWidth / 2 + gap / 2,
        month.actual > month.target ? overColor : actualColor,
      );
    }
  }

  @override
  bool shouldRepaint(_MonthlyBarsPainter old) =>
      old.months != months ||
      old.peak != peak ||
      old.actualColor != actualColor ||
      old.targetColor != targetColor ||
      old.overColor != overColor ||
      old.gridColor != gridColor;
}

class _MonthCard extends StatelessWidget {
  const _MonthCard({required this.month});

  final MonthlyBudget month;

  @override
  Widget build(BuildContext context) {
    final dl = context.dl;
    final variance = month.actual - month.target;
    final isOver = variance > 0;
    final tone = isOver ? dl.critical : dl.success;
    final fraction = month.target > 0 ? month.actual / month.target : 0.0;

    return DCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(month.month, style: context.text.titleSmall),
              ),
              DTag(
                isOver ? 'Over' : 'Under',
                tone: isOver ? DTone.critical : DTone.ok,
              ),
            ],
          ),
          const SizedBox(height: NebulaSpacing.md),
          ProgressTrack(
            value: fraction,
            color: isOver ? dl.critical : context.scheme.primary,
          ),
          const SizedBox(height: NebulaSpacing.sm + 2),
          Row(
            children: [
              Expanded(
                child: _Figure(label: 'Target', value: _money(month.target)),
              ),
              Expanded(
                child: _Figure(label: 'Actual', value: _money(month.actual)),
              ),
              Expanded(
                child: _Figure(
                  label: 'Variance',
                  value: _signedMoney(variance),
                  color: tone,
                  alignEnd: true,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _Figure extends StatelessWidget {
  const _Figure({
    required this.label,
    required this.value,
    this.color,
    this.alignEnd = false,
  });

  final String label;
  final String value;
  final Color? color;
  final bool alignEnd;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment:
          alignEnd ? CrossAxisAlignment.end : CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(
          label.toUpperCase(),
          style: NebulaTypography.monoLabel(
            color: context.dl.textTertiary,
            fontSize: 8.5,
          ),
        ),
        const SizedBox(height: 3),
        Mono(value, size: 12.5, weight: FontWeight.w600, color: color),
      ],
    );
  }
}

// ── Shared ───────────────────────────────────────────────────────────────────

class _TabSkeleton extends StatelessWidget {
  const _TabSkeleton();

  @override
  Widget build(BuildContext context) {
    return const Padding(
      padding: EdgeInsets.all(NebulaSpacing.md),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          ShimmerBox(height: 128, radius: NebulaSpacing.radiusMd),
          SizedBox(height: NebulaSpacing.lg),
          Expanded(child: ListSkeleton(count: 4)),
        ],
      ),
    );
  }
}

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

/// The kit's [OfflineBanner] is unconditional; this only shows it while the
/// device actually reports no connectivity.
class _OfflineStrip extends ConsumerWidget {
  const _OfflineStrip();

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
