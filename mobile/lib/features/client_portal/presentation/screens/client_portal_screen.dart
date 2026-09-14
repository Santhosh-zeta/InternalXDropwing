import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../../../core/constants/access_levels.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../auth/presentation/providers/auth_provider.dart';
import '../providers/client_portal_provider.dart';
import '../../../../core/theme/theme_context.dart';

class ClientPortalScreen extends ConsumerStatefulWidget {
  const ClientPortalScreen({super.key});

  @override
  ConsumerState<ClientPortalScreen> createState() => _ClientPortalScreenState();
}

class _ClientPortalScreenState extends ConsumerState<ClientPortalScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authProvider);
    final portalData = ref.watch(clientPortalOverviewProvider);

    // Access gate: L9 only
    final isL9 = authState.maybeWhen(
      authenticated: (user) => user.accessLevel == AccessLevels.client,
      orElse: () => false,
    );

    if (!isL9) {
      return Scaffold(
        backgroundColor: context.scheme.surface,
        appBar: AppBar(
          title: Text(
            'Client Portal',
            style: TextStyle(fontWeight: FontWeight.w600, color: context.scheme.onSurface),
          ),
          backgroundColor: context.scheme.surfaceContainerHighest,
          elevation: 0,
          centerTitle: false,
        ),
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                LucideIcons.lock,
                size: 48,
                color: context.dl.critical,
              ),
              const SizedBox(height: 16),
              Text(
                'Client Portal (L9 Only)',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: context.scheme.onSurface,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                'You do not have access to this feature.',
                style: TextStyle(
                  fontSize: 14,
                  color: context.scheme.onSurfaceVariant,
                ),
              ),
            ],
          ),
        ),
      );
    }

    return Scaffold(
      backgroundColor: context.scheme.surface,
      appBar: AppBar(
        title: Text(
          'Client Portal',
          style: TextStyle(fontWeight: FontWeight.w600, color: context.scheme.onSurface),
        ),
        backgroundColor: context.scheme.surfaceContainerHighest,
        elevation: 0,
        centerTitle: false,
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: context.scheme.primary,
          labelColor: context.scheme.primary,
          unselectedLabelColor: context.scheme.onSurfaceVariant,
          tabs: const [
            Tab(text: 'Projects'),
            Tab(text: 'Deliverables'),
            Tab(text: 'Invoices'),
          ],
        ),
      ),
      body: portalData.when(
        data: (overview) {
          return TabBarView(
            controller: _tabController,
            children: [
              // Projects Tab
              _buildProjectsTab(overview.projects),
              // Deliverables Tab
              _buildDeliverablesTab(overview.deliverables),
              // Invoices Tab
              _buildInvoicesTab(overview.invoices),
            ],
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, stack) => Center(
          child: Text(
            'Error: $error',
            style: TextStyle(color: context.scheme.onSurface),
          ),
        ),
      ),
    );
  }

  Widget _buildProjectsTab(List<dynamic> projects) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        children: projects.isEmpty
            ? [
                const SizedBox(height: 80),
                Icon(LucideIcons.inbox, size: 48, color: context.scheme.onSurfaceVariant),
                const SizedBox(height: 16),
                Text(
                  'No projects',
                  style: TextStyle(color: context.scheme.onSurfaceVariant, fontSize: 16),
                ),
              ]
            : projects.map<Widget>((project) {
                return Container(
                  margin: const EdgeInsets.only(bottom: 12),
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: context.scheme.surfaceContainerHighest,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Expanded(
                            child: Text(
                              project.name,
                              style: TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.bold,
                                color: context.scheme.onSurface,
                              ),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                            decoration: BoxDecoration(
                              color: _getStatusColor(project.status).withValues(alpha: 0.2),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text(
                              project.status.toUpperCase(),
                              style: TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.bold,
                                color: _getStatusColor(project.status),
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                'Progress',
                                style: TextStyle(
                                  fontSize: 12,
                                  color: context.scheme.onSurfaceVariant,
                                ),
                              ),
                              Text(
                                '${project.progress.toInt()}%',
                                style: TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.bold,
                                  color: context.scheme.onSurface,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 6),
                          ClipRRect(
                            borderRadius: BorderRadius.circular(4),
                            child: LinearProgressIndicator(
                              value: project.progress / 100,
                              minHeight: 6,
                              backgroundColor: context.scheme.surface,
                              valueColor:
                                  AlwaysStoppedAnimation<Color>(context.scheme.primary),
                            ),
                          ),
                        ],
                      ),
                      if (project.deliverables.isNotEmpty) ...[
                        const SizedBox(height: 12),
                        Text(
                          'Deliverables',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            color: context.scheme.onSurfaceVariant,
                          ),
                        ),
                        const SizedBox(height: 6),
                        Wrap(
                          spacing: 8,
                          runSpacing: 6,
                          children: project.deliverables.map<Widget>((deliv) {
                            return Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                              decoration: BoxDecoration(
                                color: context.scheme.secondary.withValues(alpha: 0.15),
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: Text(
                                deliv,
                                style: TextStyle(
                                  fontSize: 11,
                                  color: context.scheme.secondary,
                                ),
                              ),
                            );
                          }).toList(),
                        ),
                      ],
                      if (project.teamMembers.isNotEmpty) ...[
                        const SizedBox(height: 12),
                        Text(
                          'Team',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            color: context.scheme.onSurfaceVariant,
                          ),
                        ),
                        const SizedBox(height: 6),
                        Wrap(
                          spacing: 8,
                          children: project.teamMembers.take(3).map<Widget>((member) {
                            return Tooltip(
                              message: '${member.name}\n${member.email ?? ''}',
                              child: CircleAvatar(
                                radius: 16,
                                backgroundColor: context.scheme.primary.withValues(alpha: 0.3),
                                child: Text(
                                  member.name.isNotEmpty ? member.name[0].toUpperCase() : '?',
                                  style: TextStyle(
                                    fontSize: 12,
                                    color: context.scheme.primary,
                                  ),
                                ),
                              ),
                            );
                          }).toList(),
                        ),
                      ],
                      const SizedBox(height: 12),
                      SizedBox(
                        width: double.infinity,
                        child: OutlinedButton(
                          onPressed: () {
                            showModalBottomSheet(
                              context: context,
                              backgroundColor: context.scheme.surfaceContainerHighest,
                              shape: const RoundedRectangleBorder(
                                borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
                              ),
                              builder: (ctx) => Padding(
                                padding: const EdgeInsets.all(24),
                                child: Column(
                                  mainAxisSize: MainAxisSize.min,
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      project.name,
                                      style: TextStyle(
                                        fontSize: 18,
                                        fontWeight: FontWeight.bold,
                                        color: context.scheme.onSurface,
                                      ),
                                    ),
                                    const SizedBox(height: 12),
                                    if (project.description != null &&
                                        project.description!.isNotEmpty) ...[
                                      Text(
                                        'Description',
                                        style: TextStyle(
                                          fontSize: 12,
                                          fontWeight: FontWeight.bold,
                                          color: context.scheme.onSurfaceVariant,
                                        ),
                                      ),
                                      const SizedBox(height: 6),
                                      Text(
                                        project.description!,
                                        style: TextStyle(
                                          fontSize: 13,
                                          color: context.scheme.onSurface,
                                        ),
                                      ),
                                      const SizedBox(height: 16),
                                    ],
                                    Text(
                                      'Status',
                                      style: TextStyle(
                                        fontSize: 12,
                                        fontWeight: FontWeight.bold,
                                        color: context.scheme.onSurfaceVariant,
                                      ),
                                    ),
                                    const SizedBox(height: 6),
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                      decoration: BoxDecoration(
                                        color: _getStatusColor(project.status).withValues(alpha: 0.2),
                                        borderRadius: BorderRadius.circular(6),
                                      ),
                                      child: Text(
                                        project.status.toUpperCase(),
                                        style: TextStyle(
                                          fontSize: 12,
                                          fontWeight: FontWeight.bold,
                                          color: _getStatusColor(project.status),
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            );
                          },
                          child: const Text('View Details'),
                        ),
                      ),
                    ],
                  ),
                );
              }).toList(),
      ),
    );
  }

  Widget _buildDeliverablesTab(List<dynamic> deliverables) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        children: deliverables.isEmpty
            ? [
                const SizedBox(height: 80),
                Icon(LucideIcons.inbox, size: 48, color: context.scheme.onSurfaceVariant),
                const SizedBox(height: 16),
                Text(
                  'No deliverables',
                  style: TextStyle(color: context.scheme.onSurfaceVariant, fontSize: 16),
                ),
              ]
            : deliverables.map<Widget>((deliv) {
                return Container(
                  margin: const EdgeInsets.only(bottom: 12),
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: context.scheme.surfaceContainerHighest,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: _getDeliverableStatusColor(deliv.status),
                      width: 1,
                    ),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Expanded(
                            child: Row(
                              children: [
                                Text(
                                  _getDeliverableIcon(deliv.type),
                                  style: const TextStyle(fontSize: 20),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        deliv.name,
                                        style: TextStyle(
                                          fontSize: 14,
                                          fontWeight: FontWeight.bold,
                                          color: context.scheme.onSurface,
                                        ),
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                      const SizedBox(height: 4),
                                      Text(
                                        'Due: ${DateFormat('MMM d, yyyy').format(deliv.dueDate)}',
                                        style: TextStyle(
                                          fontSize: 11,
                                          color: context.scheme.onSurfaceVariant,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                            decoration: BoxDecoration(
                              color: _getDeliverableStatusColor(deliv.status).withValues(alpha: 0.2),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text(
                              deliv.status.toUpperCase(),
                              style: TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.bold,
                                color: _getDeliverableStatusColor(deliv.status),
                              ),
                            ),
                          ),
                        ],
                      ),
                      if (deliv.description != null && deliv.description!.isNotEmpty) ...[
                        const SizedBox(height: 12),
                        Text(
                          deliv.description!,
                          style: TextStyle(
                            fontSize: 12,
                            color: context.scheme.onSurfaceVariant,
                          ),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ],
                  ),
                );
              }).toList(),
      ),
    );
  }

  Widget _buildInvoicesTab(List<dynamic> invoices) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        children: invoices.isEmpty
            ? [
                const SizedBox(height: 80),
                Icon(LucideIcons.inbox, size: 48, color: context.scheme.onSurfaceVariant),
                const SizedBox(height: 16),
                Text(
                  'No invoices',
                  style: TextStyle(color: context.scheme.onSurfaceVariant, fontSize: 16),
                ),
              ]
            : invoices.map<Widget>((invoice) {
                return Container(
                  margin: const EdgeInsets.only(bottom: 12),
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: context.scheme.surfaceContainerHighest,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Column(
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  invoice.invoiceNumber,
                                  style: TextStyle(
                                    fontSize: 14,
                                    fontWeight: FontWeight.bold,
                                    color: context.scheme.onSurface,
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  DateFormat('MMM d, yyyy').format(invoice.date),
                                  style: TextStyle(
                                    fontSize: 12,
                                    color: context.scheme.onSurfaceVariant,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.end,
                            children: [
                              Text(
                                '₹${invoice.amount.toStringAsFixed(0)}',
                                style: TextStyle(
                                  fontSize: 14,
                                  fontWeight: FontWeight.bold,
                                  color: context.scheme.onSurface,
                                ),
                              ),
                              const SizedBox(height: 4),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                decoration: BoxDecoration(
                                  color: _getInvoiceStatusColor(invoice.status)
                                      .withValues(alpha: 0.2),
                                  borderRadius: BorderRadius.circular(4),
                                ),
                                child: Text(
                                  invoice.status.toUpperCase(),
                                  style: TextStyle(
                                    fontSize: 10,
                                    fontWeight: FontWeight.bold,
                                    color: _getInvoiceStatusColor(invoice.status),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      SizedBox(
                        width: double.infinity,
                        child: OutlinedButton(
                          onPressed: () {
                            _showInvoiceDetails(context, invoice);
                          },
                          child: const Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(LucideIcons.download, size: 16),
                              SizedBox(width: 8),
                              Text('View & Download'),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                );
              }).toList(),
      ),
    );
  }

  void _showInvoiceDetails(BuildContext context, dynamic invoice) {
    showModalBottomSheet(
      context: context,
      backgroundColor: context.scheme.surfaceContainerHighest,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              invoice.invoiceNumber,
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: context.scheme.onSurface,
              ),
            ),
            const SizedBox(height: 16),
            _buildInvoiceDetailRow('Date', DateFormat('MMM d, yyyy').format(invoice.date)),
            _buildInvoiceDetailRow('Amount', '₹${invoice.amount.toStringAsFixed(0)}'),
            _buildInvoiceDetailRow(
              'Status',
              invoice.status.toUpperCase(),
              valueColor: _getInvoiceStatusColor(invoice.status),
            ),
            if (invoice.description != null && invoice.description!.isNotEmpty) ...[
              const SizedBox(height: 16),
              Text(
                'Description',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                  color: context.scheme.onSurfaceVariant,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                invoice.description!,
                style: TextStyle(
                  fontSize: 13,
                  color: context.scheme.onSurface,
                ),
              ),
            ],
            const SizedBox(height: 24),
            if (invoice.pdfUrl != null && invoice.pdfUrl!.isNotEmpty)
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  icon: const Icon(LucideIcons.download),
                  onPressed: () async {
                    final url = invoice.pdfUrl!.startsWith('http')
                        ? invoice.pdfUrl!
                        : 'https://internalx.dropwinggroups.com${invoice.pdfUrl}';
                    if (await canLaunchUrl(Uri.parse(url))) {
                      await launchUrl(Uri.parse(url));
                    }
                  },
                  label: const Text('Download PDF'),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildInvoiceDetailRow(
    String label,
    String value, {
    Color? valueColor,
  }) {
    return Column(
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              label,
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: context.scheme.onSurfaceVariant,
              ),
            ),
            Text(
              value,
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.bold,
                color: valueColor ?? context.scheme.onSurface,
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
      ],
    );
  }

  Color _getStatusColor(String status) {
    switch (status) {
      case 'active':
        return context.dl.success;
      case 'completed':
        return context.scheme.secondary;
      case 'archived':
        return context.scheme.onSurfaceVariant;
      default:
        return context.scheme.onSurfaceVariant;
    }
  }

  Color _getDeliverableStatusColor(String status) {
    switch (status) {
      case 'completed':
        return context.dl.success;
      case 'pending':
        return context.dl.warning;
      case 'overdue':
        return context.dl.critical;
      default:
        return context.scheme.onSurfaceVariant;
    }
  }

  Color _getInvoiceStatusColor(String status) {
    switch (status) {
      case 'paid':
        return context.dl.success;
      case 'pending':
        return context.dl.warning;
      case 'overdue':
        return context.dl.critical;
      default:
        return context.scheme.onSurfaceVariant;
    }
  }

  String _getDeliverableIcon(String type) {
    switch (type) {
      case 'document':
        return '📄';
      case 'code':
        return '💻';
      case 'design':
        return '🎨';
      default:
        return '📦';
    }
  }
}
