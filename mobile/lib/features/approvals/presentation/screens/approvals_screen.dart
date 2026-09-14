import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../../../core/constants/access_levels.dart';
import '../../../auth/presentation/providers/auth_provider.dart';
import '../../data/models/approval_model.dart';
import '../providers/approval_provider.dart';
import '../../../../core/theme/theme_context.dart';

class ApprovalsScreen extends ConsumerStatefulWidget {
  const ApprovalsScreen({super.key});

  @override
  ConsumerState<ApprovalsScreen> createState() => _ApprovalsScreenState();
}

class _ApprovalsScreenState extends ConsumerState<ApprovalsScreen> {
  late TextEditingController _searchController;
  String _selectedFilter = 'All';
  final List<String> _filterOptions = [
    'All',
    'Timesheets',
    'Documents',
    'Leave',
    'Expenses'
  ];

  @override
  void initState() {
    super.initState();
    _searchController = TextEditingController();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  bool _canAccessApprovals() {
    final authState = ref.read(authProvider);
    return authState.maybeWhen(
      authenticated: (user) {
        // `PATCH /api/timesheets/:id/approve` rejects level 6 and below,
        // so Manager (5) and above may decide approvals.
        return AccessLevels.hasAtLeast(
            user.accessLevel, ApiAccess.approveTimesheet);
      },
      orElse: () => false,
    );
  }

  List<ApprovalRequest> _filterApprovals(List<ApprovalRequest> approvals) {
    // Filter by type if not "All"
    List<ApprovalRequest> filtered = approvals;
    if (_selectedFilter != 'All') {
      filtered = filtered
          .where((a) => a.type.toLowerCase() == _selectedFilter.toLowerCase())
          .toList();
    }

    // Filter by search query
    if (_searchController.text.isNotEmpty) {
      final query = _searchController.text.toLowerCase();
      filtered = filtered
          .where((a) =>
              a.requesterName.toLowerCase().contains(query) ||
              a.title.toLowerCase().contains(query))
          .toList();
    }

    return filtered;
  }

  Color _getTypeColor(String type) {
    switch (type.toLowerCase()) {
      case 'timesheets':
        return context.scheme.secondary;
      case 'document':
        return context.scheme.primary;
      case 'leave':
        return context.dl.success;
      case 'expense':
        return context.dl.warning;
      default:
        return context.scheme.onSurfaceVariant;
    }
  }

  String _formatTimeAgo(DateTime date) {
    final now = DateTime.now();
    final diff = now.difference(date);

    if (diff.inSeconds < 60) {
      return 'just now';
    } else if (diff.inMinutes < 60) {
      return '${diff.inMinutes}m ago';
    } else if (diff.inHours < 24) {
      return '${diff.inHours}h ago';
    } else if (diff.inDays < 7) {
      return '${diff.inDays}d ago';
    } else {
      return '${(diff.inDays / 7).floor()}w ago';
    }
  }

  @override
  Widget build(BuildContext context) {
    // Check access level
    if (!_canAccessApprovals()) {
      return Scaffold(
        appBar: AppBar(
          title: Text(
            'Approvals',
            style: GoogleFonts.inter(
              fontWeight: FontWeight.bold,
              fontSize: 20,
              color: context.scheme.onSurface,
            ),
          ),
          backgroundColor: context.scheme.surface,
          elevation: 0,
          scrolledUnderElevation: 0,
        ),
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                LucideIcons.lock,
                size: 48,
                color: context.scheme.onSurfaceVariant,
              ),
              const SizedBox(height: 16),
              Text(
                'Access Restricted',
                style: GoogleFonts.inter(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: context.scheme.onSurface,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                'Only managers (L1-L5) can access approvals',
                style: GoogleFonts.inter(
                  fontSize: 14,
                  color: context.scheme.onSurfaceVariant,
                ),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      );
    }

    final approvalsAsync = ref.watch(approvalsProvider);

    return Scaffold(
      appBar: AppBar(
        title: Text(
          'Approvals',
          style: GoogleFonts.inter(
            fontWeight: FontWeight.bold,
            fontSize: 20,
            color: context.scheme.onSurface,
          ),
        ),
        backgroundColor: context.scheme.surface,
        elevation: 0,
        scrolledUnderElevation: 0,
      ),
      body: approvalsAsync.when(
        loading: () => Center(
          child: CircularProgressIndicator(
            valueColor:
                AlwaysStoppedAnimation<Color>(context.scheme.primary),
          ),
        ),
        error: (error, stackTrace) => Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                LucideIcons.alertCircle,
                size: 48,
                color: context.dl.critical,
              ),
              const SizedBox(height: 16),
              Text(
                'Error loading approvals',
                style: GoogleFonts.inter(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: context.scheme.onSurface,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                error.toString(),
                style: GoogleFonts.inter(
                  fontSize: 12,
                  color: context.scheme.onSurfaceVariant,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 24),
              ElevatedButton(
                onPressed: () {
                  ref.invalidate(approvalsProvider);
                },
                child: const Text('Retry'),
              ),
            ],
          ),
        ),
        data: (approvals) {
          final filteredApprovals = _filterApprovals(approvals);

          return Column(
            children: [
              // Search Bar
              Padding(
                padding: const EdgeInsets.all(16.0),
                child: TextField(
                  controller: _searchController,
                  onChanged: (_) => setState(() {}),
                  decoration: InputDecoration(
                    hintText: 'Search by name or title...',
                    hintStyle: GoogleFonts.inter(
                      color: context.scheme.onSurfaceVariant,
                      fontSize: 14,
                    ),
                    filled: true,
                    fillColor: context.scheme.surfaceContainerHighest,
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(8),
                      borderSide: BorderSide(
                        color: Colors.white.withValues(alpha: 0.1),
                      ),
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(8),
                      borderSide: BorderSide(
                        color: Colors.white.withValues(alpha: 0.1),
                      ),
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(8),
                      borderSide: BorderSide(
                        color: context.scheme.primary,
                        width: 2,
                      ),
                    ),
                    prefixIcon: Icon(
                      LucideIcons.search,
                      color: context.scheme.onSurfaceVariant,
                      size: 20,
                    ),
                    suffixIcon: _searchController.text.isNotEmpty
                        ? IconButton(
                            icon: Icon(
                              LucideIcons.x,
                              color: context.scheme.onSurfaceVariant,
                              size: 20,
                            ),
                            onPressed: () {
                              _searchController.clear();
                              setState(() {});
                            },
                          )
                        : null,
                  ),
                  style: GoogleFonts.inter(
                    color: context.scheme.onSurface,
                    fontSize: 14,
                  ),
                ),
              ),
              // Filter Chips
              SizedBox(
                height: 50,
                child: ListView.builder(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  scrollDirection: Axis.horizontal,
                  itemCount: _filterOptions.length,
                  itemBuilder: (context, index) {
                    final filter = _filterOptions[index];
                    final isSelected = _selectedFilter == filter;

                    return Padding(
                      padding: const EdgeInsets.only(right: 8.0),
                      child: FilterChip(
                        label: Text(
                          filter,
                          style: GoogleFonts.inter(
                            fontSize: 12,
                            fontWeight: FontWeight.w500,
                            color: isSelected
                                ? Colors.white
                                : context.scheme.onSurfaceVariant,
                          ),
                        ),
                        selected: isSelected,
                        onSelected: (selected) {
                          setState(() {
                            _selectedFilter = filter;
                          });
                        },
                        backgroundColor: context.scheme.surfaceContainerHighest,
                        selectedColor: context.scheme.primary,
                        side: BorderSide(
                          color: isSelected
                              ? context.scheme.primary
                              : Colors.white.withValues(alpha: 0.1),
                        ),
                      ),
                    );
                  },
                ),
              ),
              const SizedBox(height: 16),
              // Approvals List
              Expanded(
                child: filteredApprovals.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(
                              LucideIcons.inbox,
                              size: 48,
                              color: context.scheme.onSurfaceVariant,
                            ),
                            const SizedBox(height: 16),
                            Text(
                              _searchController.text.isEmpty &&
                                      _selectedFilter == 'All'
                                  ? 'No pending approvals'
                                  : 'No results found',
                              style: GoogleFonts.inter(
                                fontSize: 16,
                                fontWeight: FontWeight.bold,
                                color: context.scheme.onSurface,
                              ),
                            ),
                            const SizedBox(height: 8),
                            Text(
                              'All caught up!',
                              style: GoogleFonts.inter(
                                fontSize: 14,
                                color: context.scheme.onSurfaceVariant,
                              ),
                            ),
                          ],
                        ),
                      )
                    : ListView.builder(
                        padding: const EdgeInsets.symmetric(horizontal: 16),
                        itemCount: filteredApprovals.length,
                        itemBuilder: (context, index) {
                          final approval = filteredApprovals[index];
                          return Padding(
                            padding: const EdgeInsets.only(bottom: 12.0),
                            child: _ApprovalCard(
                              approval: approval,
                              getTypeColor: _getTypeColor,
                              formatTimeAgo: _formatTimeAgo,
                              onApprove: () {
                                ref
                                    .read(approvalActionProvider.notifier)
                                    .approveRequest(approval.id);
                              },
                              onReject: () {
                                ref
                                    .read(approvalActionProvider.notifier)
                                    .rejectRequest(approval.id);
                              },
                            ),
                          );
                        },
                      ),
              ),
            ],
          );
        },
      ),
    );
  }
}

class _ApprovalCard extends StatefulWidget {
  final ApprovalRequest approval;
  final Color Function(String) getTypeColor;
  final String Function(DateTime) formatTimeAgo;
  final VoidCallback onApprove;
  final VoidCallback onReject;

  const _ApprovalCard({
    required this.approval,
    required this.getTypeColor,
    required this.formatTimeAgo,
    required this.onApprove,
    required this.onReject,
  });

  @override
  State<_ApprovalCard> createState() => _ApprovalCardState();
}

class _ApprovalCardState extends State<_ApprovalCard> {
  bool _isExpanded = false;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: context.scheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: Colors.white.withValues(alpha: 0.1),
          width: 1,
        ),
      ),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeInOut,
        child: Column(
          children: [
            // Card Header (Always Visible)
            GestureDetector(
              onTap: () {
                setState(() {
                  _isExpanded = !_isExpanded;
                });
              },
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Type Badge and Date
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 8,
                            vertical: 4,
                          ),
                          decoration: BoxDecoration(
                            color: widget.getTypeColor(widget.approval.type)
                                .withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(6),
                            border: Border.all(
                              color: widget.getTypeColor(widget.approval.type)
                                  .withValues(alpha: 0.3),
                            ),
                          ),
                          child: Text(
                            widget.approval.type.toUpperCase(),
                            style: GoogleFonts.inter(
                              fontSize: 11,
                              fontWeight: FontWeight.bold,
                              color:
                                  widget.getTypeColor(widget.approval.type),
                              letterSpacing: 0.5,
                            ),
                          ),
                        ),
                        Text(
                          widget.formatTimeAgo(widget.approval.createdAt),
                          style: GoogleFonts.inter(
                            fontSize: 12,
                            color: context.scheme.onSurfaceVariant,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    // Requester Name and Title
                    Text(
                      widget.approval.requesterName,
                      style: GoogleFonts.inter(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: context.scheme.onSurface,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      widget.approval.title,
                      style: GoogleFonts.inter(
                        fontSize: 13,
                        color: context.scheme.onSurfaceVariant,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 12),
                    // Expand Icon
                    Row(
                      mainAxisAlignment: MainAxisAlignment.end,
                      children: [
                        Icon(
                          _isExpanded
                              ? LucideIcons.chevronUp
                              : LucideIcons.chevronDown,
                          color: context.scheme.onSurfaceVariant,
                          size: 20,
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
            // Expanded Content
            if (_isExpanded) ...[
              Divider(
                height: 1,
                color: Colors.white.withValues(alpha: 0.1),
              ),
              Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Full Details
                    Text(
                      'Request Details',
                      style: GoogleFonts.inter(
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                        color: context.scheme.onSurfaceVariant,
                        letterSpacing: 0.5,
                      ),
                    ),
                    const SizedBox(height: 12),
                    _DetailRow(
                      label: 'Type',
                      value: widget.approval.type,
                    ),
                    _DetailRow(
                      label: 'Requester',
                      value: widget.approval.requesterName,
                    ),
                    _DetailRow(
                      label: 'Status',
                      value: widget.approval.status,
                    ),
                    _DetailRow(
                      label: 'Date',
                      value: widget.approval.createdAt.toString().split('.')[0],
                    ),
                    // Metadata if available
                    if (widget.approval.metadata != null) ...[
                      const SizedBox(height: 12),
                      Text(
                        'Additional Information',
                        style: GoogleFonts.inter(
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                          color: context.scheme.onSurfaceVariant,
                          letterSpacing: 0.5,
                        ),
                      ),
                      const SizedBox(height: 8),
                      ...widget.approval.metadata!.entries.map(
                        (e) => _DetailRow(
                          label: e.key,
                          value: e.value.toString(),
                        ),
                      ),
                    ],
                    const SizedBox(height: 16),
                    // Action Buttons
                    Row(
                      children: [
                        Expanded(
                          child: ElevatedButton(
                            onPressed: widget.onApprove,
                            style: ElevatedButton.styleFrom(
                              backgroundColor: context.dl.success,
                              foregroundColor: Colors.white,
                              padding:
                                  const EdgeInsets.symmetric(vertical: 12),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(8),
                              ),
                            ),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                const Icon(
                                  LucideIcons.check,
                                  size: 18,
                                ),
                                const SizedBox(width: 8),
                                Text(
                                  'Approve',
                                  style: GoogleFonts.inter(
                                    fontWeight: FontWeight.w600,
                                    fontSize: 14,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: ElevatedButton(
                            onPressed: widget.onReject,
                            style: ElevatedButton.styleFrom(
                              backgroundColor: context.dl.critical,
                              foregroundColor: Colors.white,
                              padding:
                                  const EdgeInsets.symmetric(vertical: 12),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(8),
                              ),
                            ),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                const Icon(
                                  LucideIcons.x,
                                  size: 18,
                                ),
                                const SizedBox(width: 8),
                                Text(
                                  'Reject',
                                  style: GoogleFonts.inter(
                                    fontWeight: FontWeight.w600,
                                    fontSize: 14,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _DetailRow extends StatelessWidget {
  final String label;
  final String value;

  const _DetailRow({
    required this.label,
    required this.value,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: GoogleFonts.inter(
              fontSize: 13,
              color: context.scheme.onSurfaceVariant,
            ),
          ),
          Expanded(
            child: Text(
              value,
              textAlign: TextAlign.end,
              style: GoogleFonts.inter(
                fontSize: 13,
                color: context.scheme.onSurface,
                fontWeight: FontWeight.w500,
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ],
      ),
    );
  }
}
