import 'package:flutter/material.dart';

class WorkspaceScreen extends StatelessWidget {
  const WorkspaceScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text('Workspace',
            style: TextStyle(fontWeight: FontWeight.w600)),
        backgroundColor: Colors.white,
        elevation: 0,
        centerTitle: false,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Your Hub for Knowledge & Strategy',
              style: TextStyle(fontSize: 16, color: Colors.grey),
            ),
            const SizedBox(height: 24),
            _buildSection(
              context,
              title: 'Learning',
              icon: Icons.school_outlined,
              color: Colors.purple,
              items: [
                _WorkspaceItem(
                    title: 'Courses', icon: Icons.play_lesson_outlined),
                _WorkspaceItem(
                    title: 'Resources', icon: Icons.library_books_outlined),
                _WorkspaceItem(
                    title: 'Checklists', icon: Icons.checklist_rtl_outlined),
              ],
            ),
            const SizedBox(height: 20),
            _buildSection(
              context,
              title: 'Documents',
              icon: Icons.folder_open_outlined,
              color: Colors.blue,
              items: [
                _WorkspaceItem(
                    title: 'Company Docs', icon: Icons.business_outlined),
                _WorkspaceItem(
                    title: 'Project Docs', icon: Icons.snippet_folder_outlined),
                _WorkspaceItem(title: 'Policies', icon: Icons.policy_outlined),
              ],
            ),
            const SizedBox(height: 20),
            _buildSection(
              context,
              title: 'Strategy',
              icon: Icons.lightbulb_outline,
              color: Colors.orange,
              items: [
                _WorkspaceItem(
                    title: 'OKRs', icon: Icons.track_changes_outlined),
                _WorkspaceItem(title: 'KPIs', icon: Icons.trending_up_outlined),
                _WorkspaceItem(
                    title: 'Risks', icon: Icons.warning_amber_outlined),
              ],
            ),
            const SizedBox(height: 20),
            _buildSection(
              context,
              title: 'Analytics',
              icon: Icons.analytics_outlined,
              color: Colors.teal,
              items: [
                _WorkspaceItem(
                    title: 'Performance', icon: Icons.speed_outlined),
                _WorkspaceItem(title: 'Reports', icon: Icons.pie_chart_outline),
                _WorkspaceItem(
                    title: 'Insights', icon: Icons.insights_outlined),
              ],
            ),
            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }

  Widget _buildSection(
    BuildContext context, {
    required String title,
    required IconData icon,
    required Color color,
    required List<_WorkspaceItem> items,
  }) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.03),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: color.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(icon, color: color, size: 24),
              ),
              const SizedBox(width: 12),
              Text(
                title,
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: Colors.black87,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          GridView.count(
            crossAxisCount: 3,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            mainAxisSpacing: 16,
            crossAxisSpacing: 16,
            childAspectRatio: 0.85,
            children: items
                .map((item) => _buildItemCard(context, item, color))
                .toList(),
          ),
        ],
      ),
    );
  }

  Widget _buildItemCard(
      BuildContext context, _WorkspaceItem item, Color sectionColor) {
    return InkWell(
      onTap: () {
        // Navigation will be implemented based on routes
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Navigating to ${item.title}...')),
        );
      },
      borderRadius: BorderRadius.circular(12),
      child: Container(
        decoration: BoxDecoration(
          color: const Color(0xFFF8FAFC),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: Colors.grey.shade100),
        ),
        padding: const EdgeInsets.all(12),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(item.icon, color: sectionColor.withOpacity(0.8), size: 28),
            const SizedBox(height: 12),
            Text(
              item.title,
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: Colors.black87,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _WorkspaceItem {
  final String title;
  final IconData icon;

  _WorkspaceItem({required this.title, required this.icon});
}
