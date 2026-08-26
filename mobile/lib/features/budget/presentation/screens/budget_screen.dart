import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../../../core/theme/nebula_colors.dart';
import '../../../../features/auth/presentation/providers/auth_provider.dart';
import '../../data/budget_model.dart';
import '../../data/budget_provider.dart';

final _rupee = NumberFormat.currency(locale: 'en_IN', symbol: '₹', decimalDigits: 0);

class BudgetScreen extends ConsumerWidget {
  const BudgetScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authProvider);
    final user = authState.maybeWhen(
      authenticated: (u) => u,
      orElse: () => null,
    );
    final level = user?.accessLevel ?? 99;

    if (level > 4) {
      return Scaffold(
        backgroundColor: NebulaColors.background,
        appBar: AppBar(
          title: const Text('Budget',
              style: TextStyle(fontWeight: FontWeight.w600, color: NebulaColors.textPrimary)),
          backgroundColor: NebulaColors.surfaceCard,
          elevation: 0,
          centerTitle: false,
        ),
        body: Center(
          child: Container(
            margin: const EdgeInsets.all(24),
            padding: const EdgeInsets.all(32),
            decoration: BoxDecoration(
              color: NebulaColors.surfaceCard,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: NebulaColors.critical.withOpacity(0.3)),
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(LucideIcons.lock, size: 56, color: NebulaColors.critical.withOpacity(0.7)),
                const SizedBox(height: 16),
                const Text('Restricted',
                    style: TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.w700,
                        color: NebulaColors.textPrimary)),
                const SizedBox(height: 8),
                const Text('Budget data is available for L4 and above.',
                    style: TextStyle(fontSize: 14, color: NebulaColors.textSecondary),
                    textAlign: TextAlign.center),
              ],
            ),
          ),
        ),
      );
    }

    return DefaultTabController(
      length: 3,
      child: Scaffold(
        backgroundColor: NebulaColors.background,
        appBar: AppBar(
          title: const Text('Budget',
              style: TextStyle(fontWeight: FontWeight.w600, color: NebulaColors.textPrimary)),
          backgroundColor: NebulaColors.surfaceCard,
          elevation: 0,
          centerTitle: false,
          bottom: const TabBar(
            labelColor: NebulaColors.primary,
            unselectedLabelColor: NebulaColors.textSecondary,
            indicatorColor: NebulaColors.primary,
            tabs: [
              Tab(text: 'Overview'),
              Tab(text: 'Expenses'),
              Tab(text: 'Monthly'),
            ],
          ),
        ),
        body: const TabBarView(
          children: [
            _OverviewTab(),
            _ExpensesTab(),
            _MonthlyTab(),
          ],
        ),
      ),
    );
  }
}

// ── Overview Tab ──────────────────────────────────────────────────────────────

class _OverviewTab extends ConsumerWidget {
  const _OverviewTab();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final summaryAsync = ref.watch(budgetSummaryProvider);
    return summaryAsync.when(
      loading: () =>
          const Center(child: CircularProgressIndicator(color: NebulaColors.primary)),
      error: (e, _) => _ErrorView(
        message: 'Failed to load budget summary',
        onRetry: () => ref.invalidate(budgetSummaryProvider),
      ),
      data: (summary) => RefreshIndicator(
        onRefresh: () async => ref.invalidate(budgetSummaryProvider),
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            // Circular progress gauge
            Center(
              child: _CircularGauge(pct: summary.utilizationPct),
            ),
            const SizedBox(height: 24),
            // Budget cards
            Row(
              children: [
                Expanded(
                  child: _BudgetCard(
                    label: 'Total Budget',
                    value: _rupee.format(summary.totalBudget),
                    icon: LucideIcons.wallet,
                    color: NebulaColors.primary,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _BudgetCard(
                    label: 'Spent',
                    value: _rupee.format(summary.spent),
                    icon: LucideIcons.trendingDown,
                    color: NebulaColors.critical,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            _BudgetCard(
              label: 'Remaining',
              value: _rupee.format(summary.remaining),
              icon: LucideIcons.piggyBank,
              color: NebulaColors.success,
              wide: true,
            ),
            // Venture breakdown
            if (summary.ventureBreakdown.isNotEmpty) ...[
              const SizedBox(height: 24),
              const Text(
                'Venture Breakdown',
                style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    color: NebulaColors.textPrimary),
              ),
              const SizedBox(height: 12),
              ...summary.ventureBreakdown
                  .map((v) => _BudgetVentureRow(venture: v, totalSpent: summary.spent)),
            ],
          ],
        ),
      ),
    );
  }
}

class _CircularGauge extends StatelessWidget {
  final double pct;
  const _CircularGauge({required this.pct});

  Color get _color {
    if (pct >= 90) return NebulaColors.critical;
    if (pct >= 70) return NebulaColors.warning;
    return NebulaColors.success;
  }

  @override
  Widget build(BuildContext context) {
    final clampedPct = pct.clamp(0.0, 100.0);
    return SizedBox(
      width: 180,
      height: 180,
      child: Stack(
        alignment: Alignment.center,
        children: [
          CustomPaint(
            size: const Size(180, 180),
            painter: _GaugePainter(value: clampedPct / 100, color: _color),
          ),
          Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(
                '${clampedPct.toStringAsFixed(1)}%',
                style: TextStyle(
                  fontSize: 32,
                  fontWeight: FontWeight.w800,
                  color: _color,
                ),
              ),
              const Text(
                'Utilization',
                style: TextStyle(fontSize: 13, color: NebulaColors.textSecondary),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _GaugePainter extends CustomPainter {
  final double value;
  final Color color;
  _GaugePainter({required this.value, required this.color});

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = size.width / 2 - 10;
    const startAngle = -math.pi * 0.75;
    const sweepFull = math.pi * 1.5;

    final bgPaint = Paint()
      ..color = NebulaColors.surface
      ..style = PaintingStyle.stroke
      ..strokeWidth = 14
      ..strokeCap = StrokeCap.round;

    canvas.drawArc(
      Rect.fromCircle(center: center, radius: radius),
      startAngle,
      sweepFull,
      false,
      bgPaint,
    );

    final fgPaint = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = 14
      ..strokeCap = StrokeCap.round;

    canvas.drawArc(
      Rect.fromCircle(center: center, radius: radius),
      startAngle,
      sweepFull * value,
      false,
      fgPaint,
    );
  }

  @override
  bool shouldRepaint(_GaugePainter old) => old.value != value || old.color != color;
}

class _BudgetCard extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;
  final Color color;
  final bool wide;

  const _BudgetCard({
    required this.label,
    required this.value,
    required this.icon,
    required this.color,
    this.wide = false,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: NebulaColors.surfaceCard,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(color: Colors.black.withOpacity(0.08), blurRadius: 10, offset: const Offset(0, 4)),
        ],
      ),
      child: wide
          ? Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: color.withOpacity(0.12),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Icon(icon, color: color, size: 22),
                ),
                const SizedBox(width: 14),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(value,
                        style: TextStyle(
                            fontSize: 22,
                            fontWeight: FontWeight.w800,
                            color: color)),
                    Text(label,
                        style: const TextStyle(
                            fontSize: 13, color: NebulaColors.textSecondary)),
                  ],
                ),
              ],
            )
          : Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: color.withOpacity(0.12),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Icon(icon, color: color, size: 18),
                ),
                const SizedBox(height: 10),
                Text(value,
                    style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w800,
                        color: color)),
                const SizedBox(height: 2),
                Text(label,
                    style: const TextStyle(
                        fontSize: 12, color: NebulaColors.textSecondary)),
              ],
            ),
    );
  }
}

class _BudgetVentureRow extends StatelessWidget {
  final BudgetVentureBreakdown venture;
  final double totalSpent;
  const _BudgetVentureRow({required this.venture, required this.totalSpent});

  @override
  Widget build(BuildContext context) {
    final fraction = totalSpent > 0 ? (venture.amount / totalSpent).clamp(0.0, 1.0) : 0.0;

    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: NebulaColors.surfaceCard,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Column(
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(venture.name,
                    style: const TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: NebulaColors.textPrimary)),
                Text(_rupee.format(venture.amount),
                    style: const TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.bold,
                        color: NebulaColors.primary)),
              ],
            ),
            const SizedBox(height: 8),
            ClipRRect(
              borderRadius: BorderRadius.circular(4),
              child: LinearProgressIndicator(
                value: fraction,
                backgroundColor: NebulaColors.surface,
                valueColor: const AlwaysStoppedAnimation<Color>(NebulaColors.primary),
                minHeight: 5,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Expenses Tab ──────────────────────────────────────────────────────────────

class _ExpensesTab extends ConsumerWidget {
  const _ExpensesTab();

  IconData _categoryIcon(String category) {
    switch (category.toLowerCase()) {
      case 'travel':
        return LucideIcons.plane;
      case 'software':
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

  String _formatDate(String raw) {
    try {
      final dt = DateTime.parse(raw);
      return DateFormat('MMM d, yyyy').format(dt);
    } catch (_) {
      return raw;
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final expAsync = ref.watch(budgetExpensesProvider);
    return expAsync.when(
      loading: () =>
          const Center(child: CircularProgressIndicator(color: NebulaColors.primary)),
      error: (e, _) => _ErrorView(
        message: 'Failed to load expenses',
        onRetry: () => ref.invalidate(budgetExpensesProvider),
      ),
      data: (expenses) {
        if (expenses.isEmpty) {
          return const Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(LucideIcons.receipt, size: 64, color: Colors.white24),
                SizedBox(height: 16),
                Text('No expenses recorded',
                    style: TextStyle(color: NebulaColors.textSecondary, fontSize: 16)),
              ],
            ),
          );
        }
        return RefreshIndicator(
          onRefresh: () async => ref.invalidate(budgetExpensesProvider),
          child: ListView.separated(
            padding: const EdgeInsets.all(16),
            itemCount: expenses.length,
            separatorBuilder: (_, __) => const SizedBox(height: 10),
            itemBuilder: (_, i) {
              final e = expenses[i];
              return Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: NebulaColors.surfaceCard,
                  borderRadius: BorderRadius.circular(14),
                  boxShadow: [
                    BoxShadow(
                        color: Colors.black.withOpacity(0.07),
                        blurRadius: 8,
                        offset: const Offset(0, 3)),
                  ],
                ),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: NebulaColors.primary.withOpacity(0.12),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Icon(_categoryIcon(e.category),
                          color: NebulaColors.primary, size: 20),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(e.category,
                              style: const TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w600,
                                  color: NebulaColors.textPrimary)),
                          if (e.description != null && e.description!.isNotEmpty)
                            Text(e.description!,
                                style: const TextStyle(
                                    fontSize: 12, color: NebulaColors.textSecondary),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis),
                          if (e.ventureName != null)
                            Text(e.ventureName!,
                                style: const TextStyle(
                                    fontSize: 11,
                                    color: NebulaColors.primary,
                                    fontWeight: FontWeight.w500)),
                        ],
                      ),
                    ),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Text(
                          _rupee.format(e.amount),
                          style: const TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w800,
                              color: NebulaColors.textPrimary),
                        ),
                        Text(
                          _formatDate(e.date),
                          style: const TextStyle(
                              fontSize: 11, color: NebulaColors.textSecondary),
                        ),
                      ],
                    ),
                  ],
                ),
              );
            },
          ),
        );
      },
    );
  }
}

// ── Monthly Tab ───────────────────────────────────────────────────────────────

class _MonthlyTab extends ConsumerWidget {
  const _MonthlyTab();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final monthlyAsync = ref.watch(monthlyBudgetProvider);
    return monthlyAsync.when(
      loading: () =>
          const Center(child: CircularProgressIndicator(color: NebulaColors.primary)),
      error: (e, _) => _ErrorView(
        message: 'Failed to load monthly data',
        onRetry: () => ref.invalidate(monthlyBudgetProvider),
      ),
      data: (months) {
        if (months.isEmpty) {
          return const Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(LucideIcons.calendarDays, size: 64, color: Colors.white24),
                SizedBox(height: 16),
                Text('No monthly data available',
                    style: TextStyle(color: NebulaColors.textSecondary, fontSize: 16)),
              ],
            ),
          );
        }
        return RefreshIndicator(
          onRefresh: () async => ref.invalidate(monthlyBudgetProvider),
          child: ListView.separated(
            padding: const EdgeInsets.all(16),
            itemCount: months.length,
            separatorBuilder: (_, __) => const SizedBox(height: 10),
            itemBuilder: (_, i) => _MonthCard(month: months[i]),
          ),
        );
      },
    );
  }
}

class _MonthCard extends StatelessWidget {
  final MonthlyBudget month;
  const _MonthCard({required this.month});

  @override
  Widget build(BuildContext context) {
    final variance = month.actual - month.target;
    final isOver = variance > 0;
    final varianceColor = isOver ? NebulaColors.critical : NebulaColors.success;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: NebulaColors.surfaceCard,
        borderRadius: BorderRadius.circular(14),
        boxShadow: [
          BoxShadow(
              color: Colors.black.withOpacity(0.07),
              blurRadius: 8,
              offset: const Offset(0, 3)),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            month.month,
            style: const TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.w700,
                color: NebulaColors.textPrimary),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Target',
                        style: TextStyle(
                            fontSize: 11,
                            color: NebulaColors.textSecondary,
                            fontWeight: FontWeight.w500)),
                    const SizedBox(height: 2),
                    Text(
                      _rupee.format(month.target),
                      style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w700,
                          color: NebulaColors.highlight),
                    ),
                  ],
                ),
              ),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Actual',
                        style: TextStyle(
                            fontSize: 11,
                            color: NebulaColors.textSecondary,
                            fontWeight: FontWeight.w500)),
                    const SizedBox(height: 2),
                    Text(
                      _rupee.format(month.actual),
                      style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w700,
                          color: NebulaColors.textPrimary),
                    ),
                  ],
                ),
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    isOver ? 'Over budget' : 'Under budget',
                    style: TextStyle(fontSize: 11, color: varianceColor),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    '${isOver ? '+' : ''}${_rupee.format(variance)}',
                    style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                        color: varianceColor),
                  ),
                ],
              ),
            ],
          ),
        ],
      ),
    );
  }
}

// ── Shared ────────────────────────────────────────────────────────────────────

class _ErrorView extends StatelessWidget {
  final String message;
  final VoidCallback onRetry;
  const _ErrorView({required this.message, required this.onRetry});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(LucideIcons.alertCircle, size: 48, color: NebulaColors.critical),
          const SizedBox(height: 12),
          Text(message, style: const TextStyle(color: NebulaColors.textPrimary, fontSize: 16)),
          const SizedBox(height: 16),
          ElevatedButton.icon(
            onPressed: onRetry,
            icon: const Icon(LucideIcons.refreshCw),
            label: const Text('Retry'),
          ),
        ],
      ),
    );
  }
}
