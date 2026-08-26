import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:intl/intl.dart';
import '../../../../core/theme/nebula_colors.dart';
import '../providers/analytics_provider.dart';
import '../widgets/chart_widgets.dart';

class AnalyticsScreen extends ConsumerStatefulWidget {
  const AnalyticsScreen({super.key});

  @override
  ConsumerState<AnalyticsScreen> createState() => _AnalyticsScreenState();
}

class _AnalyticsScreenState extends ConsumerState<AnalyticsScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  late String _selectedDateRange;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _selectedDateRange = '7d';
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final analytics = ref.watch(analyticsProvider(_selectedDateRange));
    final taskVelocity = ref.watch(taskVelocityProvider(_selectedDateRange));

    return Scaffold(
      backgroundColor: NebulaColors.background,
      appBar: AppBar(
        title: const Text('Analytics',
            style: TextStyle(
                fontWeight: FontWeight.w600, color: NebulaColors.textPrimary)),
        backgroundColor: NebulaColors.surfaceCard,
        elevation: 0,
        centerTitle: false,
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: NebulaColors.primary,
          labelColor: NebulaColors.textPrimary,
          unselectedLabelColor: NebulaColors.textSecondary,
          tabs: const [
            Tab(text: 'Overview'),
            Tab(text: 'Task Velocity'),
            Tab(text: 'Venture Breakdown'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          // Overview Tab
          analytics.when(
            data: (data) => _buildOverviewTab(context, data),
            loading: () => const _LoadingState(),
            error: (e, st) => _ErrorState(error: e.toString()),
          ),
          // Task Velocity Tab
          taskVelocity.when(
            data: (data) => _buildTaskVelocityTab(context, data),
            loading: () => const _LoadingState(),
            error: (e, st) => _ErrorState(error: e.toString()),
          ),
          // Venture Breakdown Tab
          analytics.when(
            data: (data) => _buildVentureBreakdownTab(context, data),
            loading: () => const _LoadingState(),
            error: (e, st) => _ErrorState(error: e.toString()),
          ),
        ],
      ),
    );
  }

  Widget _buildOverviewTab(BuildContext context, dynamic analyticsData) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Date Range Selector
          _buildDateRangeSelector(),
          const SizedBox(height: 24),

          // Stat Cards
          Row(
            children: [
              Expanded(
                child: _StatCard(
                  title: 'Total Tasks',
                  value: analyticsData.overview.totalTasks.toString(),
                  icon: LucideIcons.checkSquare,
                  color: NebulaColors.primary,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _StatCard(
                  title: 'Completed',
                  value: analyticsData.overview.completedTasks.toString(),
                  icon: LucideIcons.checkCircle2,
                  color: NebulaColors.success,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: _StatCard(
                  title: 'Completion Rate',
                  value: '${analyticsData.overview.completionRate.toStringAsFixed(1)}%',
                  icon: LucideIcons.trendingUp,
                  color: NebulaColors.highlight,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _StatCard(
                  title: 'Active Projects',
                  value: analyticsData.overview.activeProjects.toString(),
                  icon: LucideIcons.briefcase,
                  color: NebulaColors.warning,
                ),
              ),
            ],
          ),
          const SizedBox(height: 32),

          // Daily Tasks Chart
          const Text(
            'Tasks Completed Per Day',
            style: TextStyle(
                color: NebulaColors.textPrimary,
                fontSize: 16,
                fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 16),
          Container(
            height: 240,
            decoration: BoxDecoration(
              color: NebulaColors.surfaceCard,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: SimpleBarChart(
                data: analyticsData.dailyTasks,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTaskVelocityTab(BuildContext context, dynamic velocityData) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Cumulative Tasks Over Time',
            style: TextStyle(
                color: NebulaColors.textPrimary,
                fontSize: 16,
                fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 16),
          Container(
            height: 300,
            decoration: BoxDecoration(
              color: NebulaColors.surfaceCard,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: TaskVelocityChart(
                data: velocityData,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildVentureBreakdownTab(BuildContext context, dynamic analyticsData) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Tasks by Venture',
            style: TextStyle(
                color: NebulaColors.textPrimary,
                fontSize: 16,
                fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 16),

          // Pie Chart
          Container(
            height: 240,
            decoration: BoxDecoration(
              color: NebulaColors.surfaceCard,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: SimplePieChart(
                data: analyticsData.ventures,
              ),
            ),
          ),
          const SizedBox(height: 32),

          // Venture Table
          const Text(
            'Venture Details',
            style: TextStyle(
                color: NebulaColors.textPrimary,
                fontSize: 16,
                fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 16),
          _buildVentureTable(analyticsData.ventures),
        ],
      ),
    );
  }

  Widget _buildDateRangeSelector() {
    return Row(
      children: [
        _DateRangeButton(
          label: '7 Days',
          value: '7d',
          isSelected: _selectedDateRange == '7d',
          onTap: () {
            setState(() => _selectedDateRange = '7d');
          },
        ),
        const SizedBox(width: 8),
        _DateRangeButton(
          label: '30 Days',
          value: '30d',
          isSelected: _selectedDateRange == '30d',
          onTap: () {
            setState(() => _selectedDateRange = '30d');
          },
        ),
        const SizedBox(width: 8),
        _DateRangeButton(
          label: '90 Days',
          value: '90d',
          isSelected: _selectedDateRange == '90d',
          onTap: () {
            setState(() => _selectedDateRange = '90d');
          },
        ),
      ],
    );
  }

  Widget _buildVentureTable(List<dynamic> ventures) {
    return Container(
      decoration: BoxDecoration(
        color: NebulaColors.surfaceCard,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: const BoxDecoration(
              border: Border(
                bottom: BorderSide(
                  color: NebulaColors.surfaceCard,
                  width: 1,
                ),
              ),
            ),
            child: const Row(
              children: [
                Expanded(
                  child: Text(
                    'Venture',
                    style: TextStyle(
                        color: NebulaColors.textSecondary,
                        fontWeight: FontWeight.w500,
                        fontSize: 12),
                  ),
                ),
                Expanded(
                  child: Text(
                    'Tasks',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                        color: NebulaColors.textSecondary,
                        fontWeight: FontWeight.w500,
                        fontSize: 12),
                  ),
                ),
                Expanded(
                  child: Text(
                    'Completion',
                    textAlign: TextAlign.end,
                    style: TextStyle(
                        color: NebulaColors.textSecondary,
                        fontWeight: FontWeight.w500,
                        fontSize: 12),
                  ),
                ),
              ],
            ),
          ),
          ...List.generate(ventures.length, (index) {
            final venture = ventures[index];
            return Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              decoration: BoxDecoration(
                border: index < ventures.length - 1
                    ? const Border(
                        bottom: BorderSide(
                          color: Color(0xFF252D3D),
                          width: 0.5,
                        ),
                      )
                    : null,
              ),
              child: Row(
                children: [
                  Expanded(
                    child: Text(
                      venture.ventureName,
                      style: const TextStyle(
                          color: NebulaColors.textPrimary,
                          fontWeight: FontWeight.w500,
                          fontSize: 13),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  Expanded(
                    child: Text(
                      venture.taskCount.toString(),
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                          color: NebulaColors.textSecondary, fontSize: 12),
                    ),
                  ),
                  Expanded(
                    child: Text(
                      '${venture.completionPercentage.toStringAsFixed(0)}%',
                      textAlign: TextAlign.end,
                      style: const TextStyle(
                          color: NebulaColors.success, fontSize: 12),
                    ),
                  ),
                ],
              ),
            );
          }),
        ],
      ),
    );
  }
}

class _StatCard extends StatelessWidget {
  final String title;
  final String value;
  final IconData icon;
  final Color color;

  const _StatCard({
    required this.title,
    required this.value,
    required this.icon,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: NebulaColors.surfaceCard,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: color.withOpacity(0.2),
          width: 1,
        ),
      ),
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: color.withOpacity(0.12),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(icon, color: color, size: 20),
          ),
          const SizedBox(height: 12),
          Text(
            title,
            style: const TextStyle(
                color: NebulaColors.textSecondary, fontSize: 12),
          ),
          const SizedBox(height: 4),
          Text(
            value,
            style: const TextStyle(
                color: NebulaColors.textPrimary,
                fontSize: 24,
                fontWeight: FontWeight.w700),
          ),
        ],
      ),
    );
  }
}

class _DateRangeButton extends StatelessWidget {
  final String label;
  final String value;
  final bool isSelected;
  final VoidCallback onTap;

  const _DateRangeButton({
    required this.label,
    required this.value,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected ? NebulaColors.primary : NebulaColors.surfaceCard,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(
            color: isSelected
                ? NebulaColors.primary
                : NebulaColors.textSecondary.withOpacity(0.2),
            width: 1,
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: isSelected
                ? NebulaColors.textPrimary
                : NebulaColors.textSecondary,
            fontWeight: FontWeight.w500,
            fontSize: 12,
          ),
        ),
      ),
    );
  }
}

class _LoadingState extends StatelessWidget {
  const _LoadingState();

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const CircularProgressIndicator(color: NebulaColors.primary),
          const SizedBox(height: 16),
          const Text(
            'Loading analytics...',
            style: TextStyle(color: NebulaColors.textSecondary),
          ),
        ],
      ),
    );
  }
}

class _ErrorState extends StatelessWidget {
  final String error;

  const _ErrorState({required this.error});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(LucideIcons.alertCircle,
              size: 48, color: NebulaColors.critical),
          const SizedBox(height: 12),
          Text(
            error,
            style: const TextStyle(color: NebulaColors.textSecondary),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }
}
