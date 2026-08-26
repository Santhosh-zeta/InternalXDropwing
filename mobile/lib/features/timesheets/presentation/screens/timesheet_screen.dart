import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../../../core/theme/nebula_colors.dart';
import '../../../../features/auth/presentation/providers/auth_provider.dart';
import '../../data/timesheet_model.dart';
import '../providers/timesheets_provider.dart';

class TimesheetScreen extends ConsumerStatefulWidget {
  const TimesheetScreen({super.key});

  @override
  ConsumerState<TimesheetScreen> createState() => _TimesheetScreenState();
}

class _TimesheetScreenState extends ConsumerState<TimesheetScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  bool _isManager = false;

  @override
  void initState() {
    super.initState();
    final authState = ref.read(authProvider);
    final level = authState.maybeWhen(
      authenticated: (user) => user.accessLevel,
      orElse: () => 9,
    );
    _isManager = level <= 5;
    _tabController = TabController(length: _isManager ? 3 : 2, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: NebulaColors.background,
      appBar: AppBar(
        backgroundColor: NebulaColors.surfaceCard,
        elevation: 0,
        title: const Text(
          'Timesheets',
          style: TextStyle(
            fontWeight: FontWeight.w700,
            color: NebulaColors.textPrimary,
            fontSize: 20,
          ),
        ),
        centerTitle: false,
        actions: [
          IconButton(
            icon: const Icon(LucideIcons.refreshCw, color: NebulaColors.primary, size: 20),
            onPressed: () {
              ref.invalidate(timesheetsProvider);
              ref.invalidate(timesheetFinancialsProvider);
            },
            tooltip: 'Refresh',
          ),
        ],
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: NebulaColors.primary,
          indicatorWeight: 3,
          labelColor: NebulaColors.primary,
          unselectedLabelColor: NebulaColors.textSecondary,
          labelStyle: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
          tabs: [
            const Tab(text: 'My Timesheets'),
            if (_isManager) const Tab(text: 'Approvals'),
            const Tab(text: 'Summary'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _MyTimesheetsTab(isManager: _isManager),
          if (_isManager) const _PendingApprovalsTab(),
          const _SummaryTab(),
        ],
      ),
    );
  }
}

// ── My Timesheets Tab ──────────────────────────────────────────────────────────

class _MyTimesheetsTab extends ConsumerWidget {
  final bool isManager;
  const _MyTimesheetsTab({required this.isManager});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final timesheetsAsync = ref.watch(timesheetsProvider);

    return Scaffold(
      backgroundColor: Colors.transparent,
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _showLogTimeSheet(context, ref),
        backgroundColor: NebulaColors.primary,
        icon: const Icon(LucideIcons.plus, color: Colors.white),
        label: const Text('Log Time', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600)),
      ),
      body: timesheetsAsync.when(
        data: (entries) {
          if (entries.isEmpty) {
            return _EmptyState(
              icon: LucideIcons.clock,
              title: 'No time logged yet',
              subtitle: 'Tap the button below to log your first entry.',
            );
          }
          final grouped = _groupByWeek(entries);
          return RefreshIndicator(
            onRefresh: () => ref.read(timesheetsProvider.notifier).refresh(),
            color: NebulaColors.primary,
            backgroundColor: NebulaColors.surfaceCard,
            child: ListView.builder(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 96),
              itemCount: grouped.length,
              itemBuilder: (context, index) {
                final week = grouped.keys.elementAt(index);
                final weekEntries = grouped[week]!;
                return _WeekGroup(weekLabel: week, entries: weekEntries);
              },
            ),
          );
        },
        loading: () => _LoadingSkeleton(),
        error: (e, _) => _ErrorState(
          message: e.toString(),
          onRetry: () => ref.invalidate(timesheetsProvider),
        ),
      ),
    );
  }

  Map<String, List<TimesheetEntry>> _groupByWeek(List<TimesheetEntry> entries) {
    final Map<String, List<TimesheetEntry>> grouped = {};
    for (final entry in entries) {
      final weekLabel = _weekLabel(entry.date);
      grouped.putIfAbsent(weekLabel, () => []).add(entry);
    }
    return grouped;
  }

  String _weekLabel(String dateStr) {
    try {
      final dt = DateTime.parse(dateStr);
      final monday = dt.subtract(Duration(days: dt.weekday - 1));
      final sunday = monday.add(const Duration(days: 6));
      return '${DateFormat('MMM d').format(monday)} – ${DateFormat('MMM d, yyyy').format(sunday)}';
    } catch (_) {
      return 'Unknown Week';
    }
  }

  void _showLogTimeSheet(BuildContext context, WidgetRef ref) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _LogTimeBottomSheet(ref: ref),
    );
  }
}

// ── Log Time Bottom Sheet ──────────────────────────────────────────────────────

class _LogTimeBottomSheet extends StatefulWidget {
  final WidgetRef ref;
  const _LogTimeBottomSheet({required this.ref});

  @override
  State<_LogTimeBottomSheet> createState() => _LogTimeBottomSheetState();
}

class _LogTimeBottomSheetState extends State<_LogTimeBottomSheet> {
  final _hoursController = TextEditingController();
  final _notesController = TextEditingController();
  DateTime _selectedDate = DateTime.now();
  bool _isLoading = false;

  @override
  void dispose() {
    _hoursController.dispose();
    _notesController.dispose();
    super.dispose();
  }

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _selectedDate,
      firstDate: DateTime.now().subtract(const Duration(days: 365)),
      lastDate: DateTime.now(),
      builder: (ctx, child) => Theme(
        data: ThemeData.dark().copyWith(
          colorScheme: const ColorScheme.dark(
            primary: NebulaColors.primary,
            surface: NebulaColors.surfaceCard,
          ),
        ),
        child: child!,
      ),
    );
    if (picked != null) setState(() => _selectedDate = picked);
  }

  Future<void> _submit() async {
    final hoursText = _hoursController.text.trim();
    final hours = double.tryParse(hoursText);
    if (hours == null || hours < 0.5 || hours > 24) {
      _showSnack('Enter hours between 0.5 and 24');
      return;
    }
    setState(() => _isLoading = true);
    try {
      await widget.ref.read(timesheetsProvider.notifier).logTime(
            hoursWorked: hours,
            date: DateFormat('yyyy-MM-dd').format(_selectedDate),
            notes: _notesController.text.trim().isEmpty
                ? null
                : _notesController.text.trim(),
          );
      if (mounted) {
        Navigator.of(context).pop();
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Time logged successfully'),
            backgroundColor: NebulaColors.success,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        _showSnack('Failed: ${e.toString().replaceAll('Exception: ', '')}');
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  void _showSnack(String msg) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(msg), backgroundColor: NebulaColors.critical),
    );
  }

  @override
  Widget build(BuildContext context) {
    final bottom = MediaQuery.of(context).viewInsets.bottom;
    return Container(
      margin: const EdgeInsets.all(16),
      padding: EdgeInsets.fromLTRB(20, 20, 20, 20 + bottom),
      decoration: BoxDecoration(
        color: NebulaColors.surfaceCard,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: NebulaColors.primary.withOpacity(0.15),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(LucideIcons.clock, color: NebulaColors.primary, size: 20),
              ),
              const SizedBox(width: 12),
              const Text(
                'Log Time',
                style: TextStyle(
                  color: NebulaColors.textPrimary,
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const Spacer(),
              IconButton(
                onPressed: () => Navigator.of(context).pop(),
                icon: const Icon(LucideIcons.x, color: NebulaColors.textSecondary),
              ),
            ],
          ),
          const SizedBox(height: 20),

          // Hours field
          const Text('Hours Worked', style: TextStyle(color: NebulaColors.textSecondary, fontSize: 12, fontWeight: FontWeight.w600)),
          const SizedBox(height: 6),
          TextFormField(
            controller: _hoursController,
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
            inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'^\d*\.?\d*'))],
            style: const TextStyle(color: NebulaColors.textPrimary),
            decoration: _inputDecoration('e.g. 4.5', LucideIcons.timer),
          ),
          const SizedBox(height: 16),

          // Date picker
          const Text('Date', style: TextStyle(color: NebulaColors.textSecondary, fontSize: 12, fontWeight: FontWeight.w600)),
          const SizedBox(height: 6),
          GestureDetector(
            onTap: _pickDate,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
              decoration: BoxDecoration(
                color: NebulaColors.surface,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: NebulaColors.surface),
              ),
              child: Row(
                children: [
                  const Icon(LucideIcons.calendar, color: NebulaColors.primary, size: 18),
                  const SizedBox(width: 10),
                  Text(
                    DateFormat('EEEE, MMM d, yyyy').format(_selectedDate),
                    style: const TextStyle(color: NebulaColors.textPrimary),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),

          // Notes field
          const Text('Notes (optional)', style: TextStyle(color: NebulaColors.textSecondary, fontSize: 12, fontWeight: FontWeight.w600)),
          const SizedBox(height: 6),
          TextFormField(
            controller: _notesController,
            maxLines: 3,
            style: const TextStyle(color: NebulaColors.textPrimary),
            decoration: _inputDecoration('What did you work on?', null),
          ),
          const SizedBox(height: 24),

          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: _isLoading ? null : _submit,
              style: ElevatedButton.styleFrom(
                backgroundColor: NebulaColors.primary,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              child: _isLoading
                  ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                  : const Text('Submit', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
            ),
          ),
        ],
      ),
    );
  }

  InputDecoration _inputDecoration(String hint, IconData? icon) {
    return InputDecoration(
      hintText: hint,
      hintStyle: const TextStyle(color: NebulaColors.textSecondary),
      prefixIcon: icon != null ? Icon(icon, color: NebulaColors.textSecondary, size: 18) : null,
      filled: true,
      fillColor: NebulaColors.surface,
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
    );
  }
}

// ── Week Group Widget ──────────────────────────────────────────────────────────

class _WeekGroup extends StatelessWidget {
  final String weekLabel;
  final List<TimesheetEntry> entries;
  const _WeekGroup({required this.weekLabel, required this.entries});

  @override
  Widget build(BuildContext context) {
    final totalHours = entries.fold<double>(0, (sum, e) => sum + e.hoursWorked);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(vertical: 10),
          child: Row(
            children: [
              Text(
                weekLabel,
                style: const TextStyle(
                  color: NebulaColors.textSecondary,
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  letterSpacing: 0.5,
                ),
              ),
              const Spacer(),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: NebulaColors.primary.withOpacity(0.12),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  '${totalHours.toStringAsFixed(1)} hrs',
                  style: const TextStyle(color: NebulaColors.primary, fontSize: 11, fontWeight: FontWeight.w700),
                ),
              ),
            ],
          ),
        ),
        ...entries.map((e) => _TimesheetCard(entry: e)),
        const SizedBox(height: 8),
      ],
    );
  }
}

class _TimesheetCard extends StatelessWidget {
  final TimesheetEntry entry;
  const _TimesheetCard({required this.entry});

  Color get _statusColor {
    switch (entry.status) {
      case 'approved': return NebulaColors.success;
      case 'rejected': return NebulaColors.critical;
      default: return NebulaColors.warning;
    }
  }

  @override
  Widget build(BuildContext context) {
    String dateLabel = entry.date;
    try {
      dateLabel = DateFormat('EEE, MMM d').format(DateTime.parse(entry.date));
    } catch (_) {}

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: NebulaColors.surfaceCard,
        borderRadius: BorderRadius.circular(12),
        border: Border(left: BorderSide(color: _statusColor, width: 3)),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(dateLabel, style: const TextStyle(color: NebulaColors.textSecondary, fontSize: 12)),
                const SizedBox(height: 4),
                Text(
                  entry.projectName ?? entry.taskTitle ?? 'General',
                  style: const TextStyle(color: NebulaColors.textPrimary, fontWeight: FontWeight.w600, fontSize: 14),
                ),
                if (entry.notes != null && entry.notes!.isNotEmpty) ...[
                  const SizedBox(height: 4),
                  Text(entry.notes!, style: const TextStyle(color: NebulaColors.textSecondary, fontSize: 12), maxLines: 1, overflow: TextOverflow.ellipsis),
                ],
              ],
            ),
          ),
          const SizedBox(width: 12),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                '${entry.hoursWorked.toStringAsFixed(1)} hrs',
                style: const TextStyle(color: NebulaColors.textPrimary, fontWeight: FontWeight.bold, fontSize: 16),
              ),
              const SizedBox(height: 6),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: _statusColor.withOpacity(0.15),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  entry.status.toUpperCase(),
                  style: TextStyle(color: _statusColor, fontSize: 10, fontWeight: FontWeight.w700),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

// ── Pending Approvals Tab ──────────────────────────────────────────────────────

class _PendingApprovalsTab extends ConsumerWidget {
  const _PendingApprovalsTab();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final timesheetsAsync = ref.watch(timesheetsProvider);

    return timesheetsAsync.when(
      data: (entries) {
        final pending = entries.where((e) => e.status == 'pending').toList();
        if (pending.isEmpty) {
          return _EmptyState(
            icon: LucideIcons.checkCircle,
            title: 'All caught up!',
            subtitle: 'No pending timesheets to review.',
          );
        }
        return RefreshIndicator(
          onRefresh: () => ref.read(timesheetsProvider.notifier).refresh(),
          color: NebulaColors.primary,
          backgroundColor: NebulaColors.surfaceCard,
          child: ListView.separated(
            padding: const EdgeInsets.all(16),
            itemCount: pending.length,
            separatorBuilder: (_, __) => const SizedBox(height: 12),
            itemBuilder: (context, index) {
              return _PendingApprovalCard(
                entry: pending[index],
                onApprove: () => _confirmAction(context, ref, pending[index].id, true),
                onReject: () => _confirmAction(context, ref, pending[index].id, false),
              );
            },
          ),
        );
      },
      loading: () => _LoadingSkeleton(),
      error: (e, _) => _ErrorState(
        message: e.toString(),
        onRetry: () => ref.invalidate(timesheetsProvider),
      ),
    );
  }

  Future<void> _confirmAction(BuildContext context, WidgetRef ref, int id, bool approve) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        backgroundColor: NebulaColors.surfaceCard,
        title: Text(
          approve ? 'Approve Timesheet?' : 'Reject Timesheet?',
          style: const TextStyle(color: NebulaColors.textPrimary),
        ),
        content: Text(
          approve ? 'This will approve the time entry.' : 'This will reject the time entry.',
          style: const TextStyle(color: NebulaColors.textSecondary),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel', style: TextStyle(color: NebulaColors.textSecondary)),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: approve ? NebulaColors.success : NebulaColors.critical,
            ),
            onPressed: () => Navigator.pop(context, true),
            child: Text(approve ? 'Approve' : 'Reject'),
          ),
        ],
      ),
    );
    if (confirmed == true) {
      try {
        if (approve) {
          await ref.read(timesheetsProvider.notifier).approve(id);
        } else {
          await ref.read(timesheetsProvider.notifier).reject(id);
        }
      } catch (_) {}
    }
  }
}

class _PendingApprovalCard extends StatelessWidget {
  final TimesheetEntry entry;
  final VoidCallback onApprove;
  final VoidCallback onReject;

  const _PendingApprovalCard({
    required this.entry,
    required this.onApprove,
    required this.onReject,
  });

  @override
  Widget build(BuildContext context) {
    String dateLabel = entry.date;
    try {
      dateLabel = DateFormat('EEE, MMM d, yyyy').format(DateTime.parse(entry.date));
    } catch (_) {}

    final initials = (entry.employeeName ?? 'U')
        .split(' ')
        .take(2)
        .map((w) => w.isNotEmpty ? w[0].toUpperCase() : '')
        .join();

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: NebulaColors.surfaceCard,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: NebulaColors.warning.withOpacity(0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              CircleAvatar(
                backgroundColor: NebulaColors.primary,
                radius: 20,
                child: Text(initials, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14)),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      entry.employeeName ?? 'Team Member',
                      style: const TextStyle(color: NebulaColors.textPrimary, fontWeight: FontWeight.w600, fontSize: 15),
                    ),
                    Text(dateLabel, style: const TextStyle(color: NebulaColors.textSecondary, fontSize: 12)),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                decoration: BoxDecoration(
                  color: NebulaColors.primary.withOpacity(0.12),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  '${entry.hoursWorked.toStringAsFixed(1)} hrs',
                  style: const TextStyle(color: NebulaColors.primary, fontWeight: FontWeight.bold, fontSize: 13),
                ),
              ),
            ],
          ),
          if (entry.projectName != null || entry.taskTitle != null) ...[
            const SizedBox(height: 10),
            Row(
              children: [
                const Icon(LucideIcons.briefcase, size: 13, color: NebulaColors.textSecondary),
                const SizedBox(width: 6),
                Text(
                  entry.projectName ?? entry.taskTitle ?? '',
                  style: const TextStyle(color: NebulaColors.textSecondary, fontSize: 13),
                ),
              ],
            ),
          ],
          if (entry.notes != null && entry.notes!.isNotEmpty) ...[
            const SizedBox(height: 8),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: NebulaColors.surface,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                entry.notes!,
                style: const TextStyle(color: NebulaColors.textSecondary, fontSize: 13),
              ),
            ),
          ],
          const SizedBox(height: 14),
          Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: onReject,
                  icon: const Icon(LucideIcons.x, size: 15),
                  label: const Text('Reject'),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: NebulaColors.critical,
                    side: const BorderSide(color: NebulaColors.critical),
                    padding: const EdgeInsets.symmetric(vertical: 10),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: ElevatedButton.icon(
                  onPressed: onApprove,
                  icon: const Icon(LucideIcons.check, size: 15),
                  label: const Text('Approve'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: NebulaColors.success,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 10),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

// ── Summary Tab ────────────────────────────────────────────────────────────────

class _SummaryTab extends ConsumerWidget {
  const _SummaryTab();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final financialsAsync = ref.watch(timesheetFinancialsProvider);

    return financialsAsync.when(
      data: (f) => RefreshIndicator(
        onRefresh: () => ref.read(timesheetFinancialsProvider.notifier).refresh(),
        color: NebulaColors.primary,
        backgroundColor: NebulaColors.surfaceCard,
        child: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            // Total hours hero card
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(vertical: 32, horizontal: 24),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFF4C1D95), NebulaColors.primary],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(20),
                boxShadow: [
                  BoxShadow(color: NebulaColors.primary.withOpacity(0.3), blurRadius: 20, offset: const Offset(0, 8)),
                ],
              ),
              child: Column(
                children: [
                  const Icon(LucideIcons.clock, color: Colors.white70, size: 32),
                  const SizedBox(height: 12),
                  Text(
                    f.totalHours.toStringAsFixed(1),
                    style: const TextStyle(color: Colors.white, fontSize: 56, fontWeight: FontWeight.w900, letterSpacing: -2),
                  ),
                  const Text('Total Hours', style: TextStyle(color: Colors.white70, fontSize: 14, fontWeight: FontWeight.w500)),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // Stats grid
            Row(
              children: [
                Expanded(child: _StatCard(label: 'Approved', value: f.approvedHours.toStringAsFixed(1), unit: 'hrs', color: NebulaColors.success, icon: LucideIcons.checkCircle)),
                const SizedBox(width: 12),
                Expanded(child: _StatCard(label: 'Pending', value: f.pendingHours.toStringAsFixed(1), unit: 'hrs', color: NebulaColors.warning, icon: LucideIcons.clock3)),
              ],
            ),
            const SizedBox(height: 12),
            _StatCard(label: 'Total Entries', value: f.totalEntries.toString(), unit: 'entries', color: NebulaColors.highlight, icon: LucideIcons.listChecks, fullWidth: true),
          ],
        ),
      ),
      loading: () => _LoadingSkeleton(),
      error: (e, _) => _ErrorState(
        message: e.toString(),
        onRetry: () => ref.invalidate(timesheetFinancialsProvider),
      ),
    );
  }
}

class _StatCard extends StatelessWidget {
  final String label;
  final String value;
  final String unit;
  final Color color;
  final IconData icon;
  final bool fullWidth;

  const _StatCard({
    required this.label,
    required this.value,
    required this.unit,
    required this.color,
    required this.icon,
    this.fullWidth = false,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: fullWidth ? double.infinity : null,
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: NebulaColors.surfaceCard,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: color.withOpacity(0.2)),
      ),
      child: Row(
        mainAxisAlignment: fullWidth ? MainAxisAlignment.spaceBetween : MainAxisAlignment.start,
        children: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label, style: const TextStyle(color: NebulaColors.textSecondary, fontSize: 12, fontWeight: FontWeight.w500)),
              const SizedBox(height: 6),
              Row(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(value, style: TextStyle(color: color, fontSize: 28, fontWeight: FontWeight.w900)),
                  const SizedBox(width: 4),
                  Padding(
                    padding: const EdgeInsets.only(bottom: 4),
                    child: Text(unit, style: const TextStyle(color: NebulaColors.textSecondary, fontSize: 12)),
                  ),
                ],
              ),
            ],
          ),
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: color.withOpacity(0.12),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, color: color, size: 22),
          ),
        ],
      ),
    );
  }
}

// ── Shared Utility Widgets ─────────────────────────────────────────────────────

class _EmptyState extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  const _EmptyState({required this.icon, required this.title, required this.subtitle});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, size: 64, color: NebulaColors.textSecondary.withOpacity(0.4)),
            const SizedBox(height: 16),
            Text(title, style: const TextStyle(color: NebulaColors.textPrimary, fontSize: 18, fontWeight: FontWeight.w600)),
            const SizedBox(height: 8),
            Text(subtitle, textAlign: TextAlign.center, style: const TextStyle(color: NebulaColors.textSecondary, fontSize: 14)),
          ],
        ),
      ),
    );
  }
}

class _ErrorState extends StatelessWidget {
  final String message;
  final VoidCallback onRetry;
  const _ErrorState({required this.message, required this.onRetry});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(LucideIcons.alertCircle, size: 48, color: NebulaColors.critical),
            const SizedBox(height: 12),
            const Text('Something went wrong', style: TextStyle(color: NebulaColors.textPrimary, fontSize: 16, fontWeight: FontWeight.w600)),
            const SizedBox(height: 8),
            Text(message.replaceAll('Exception: ', ''), textAlign: TextAlign.center, style: const TextStyle(color: NebulaColors.textSecondary, fontSize: 12)),
            const SizedBox(height: 20),
            ElevatedButton.icon(
              onPressed: onRetry,
              icon: const Icon(LucideIcons.refreshCw, size: 16),
              label: const Text('Retry'),
              style: ElevatedButton.styleFrom(backgroundColor: NebulaColors.primary, foregroundColor: Colors.white),
            ),
          ],
        ),
      ),
    );
  }
}

class _LoadingSkeleton extends StatefulWidget {
  @override
  State<_LoadingSkeleton> createState() => _LoadingSkeletonState();
}

class _LoadingSkeletonState extends State<_LoadingSkeleton> with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _animation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(vsync: this, duration: const Duration(milliseconds: 1000))
      ..repeat(reverse: true);
    _animation = Tween(begin: 0.3, end: 0.7).animate(_controller);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _animation,
      builder: (_, __) => ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: 5,
        itemBuilder: (_, index) => Container(
          margin: const EdgeInsets.only(bottom: 12),
          height: 80,
          decoration: BoxDecoration(
            color: NebulaColors.surfaceCard.withOpacity(_animation.value),
            borderRadius: BorderRadius.circular(12),
          ),
        ),
      ),
    );
  }
}
