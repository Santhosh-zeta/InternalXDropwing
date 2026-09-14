import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../data/models/project_models.dart';
import '../providers/project_form_provider.dart';
import '../providers/projects_provider.dart';
import '../../../team/presentation/providers/team_provider.dart';
import '../../../../core/theme/nebula_colors.dart';
import '../../../../core/theme/app_theme.dart';

class ProjectFormScreen extends ConsumerStatefulWidget {
  final int? projectId;

  const ProjectFormScreen({super.key, this.projectId});

  @override
  ConsumerState<ProjectFormScreen> createState() => _ProjectFormScreenState();
}

class _ProjectFormScreenState extends ConsumerState<ProjectFormScreen> {
  final _formKey = GlobalKey<FormState>();
  
  // Fields
  late TextEditingController _nameController;
  late TextEditingController _descController;
  late TextEditingController _tagController;
  late TextEditingController _budgetController;
  late TextEditingController _clientNameController;
  late TextEditingController _clientEmailController;

  String _status = 'planning';
  String _priority = 'medium';
  DateTime? _startDate;
  DateTime? _endDate;
  
  // Members
  List<Map<String, dynamic>> _members = [];
  
  // Tags
  List<String> _tags = [];
  
  // Milestones
  List<Map<String, dynamic>> _milestones = [];

  @override
  void initState() {
    super.initState();
    _nameController = TextEditingController();
    _descController = TextEditingController();
    _tagController = TextEditingController();
    _budgetController = TextEditingController(text: '0');
    _clientNameController = TextEditingController();
    _clientEmailController = TextEditingController();

    if (widget.projectId != null) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        final projectState = ref.read(projectDetailProvider(widget.projectId!));
        if (projectState.hasValue) {
          final project = projectState.value!;
          _nameController.text = project.name;
          _descController.text = project.description ?? '';
          _status = project.status;
          _priority = project.priority;
          _budgetController.text = project.budget?.toString() ?? '0';
          _startDate = project.startDate != null ? DateTime.parse(project.startDate!) : null;
          _endDate = project.endDate != null ? DateTime.parse(project.endDate!) : null;
          _clientNameController.text = project.clientName ?? '';
          _clientEmailController.text = project.clientEmail ?? '';
          
          _tags = List.from(project.tags);
          
          _members = project.members.map((m) => {
            'user_id': m.userId,
            'role': m.role ?? 'Contributor'
          }).toList();

          _milestones = project.milestones.map((m) => {
            'title': m.title,
            'description': m.description,
            'due_date': m.dueDate,
            'status': m.status
          }).toList();

          setState(() {});
        }
      });
    }
  }

  @override
  void dispose() {
    _nameController.dispose();
    _descController.dispose();
    _tagController.dispose();
    _budgetController.dispose();
    _clientNameController.dispose();
    _clientEmailController.dispose();
    super.dispose();
  }

  void _submit() async {
    if (_formKey.currentState!.validate()) {
      final dto = ProjectRequestDto(
        name: _nameController.text,
        description: _descController.text,
        status: _status,
        priority: _priority,
        budget: double.tryParse(_budgetController.text),
        startDate: _startDate?.toIso8601String(),
        endDate: _endDate?.toIso8601String(),
        clientName: _clientNameController.text,
        clientEmail: _clientEmailController.text,
        tags: _tags,
        members: _members,
        milestones: _milestones,
      );

      final success = await ref.read(projectFormControllerProvider.notifier).submitProject(
        dto,
        existingProjectId: widget.projectId,
      );

      if (success && mounted) {
        context.pop();
      }
    }
  }

  void _deleteProject() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: NebulaColors.surfaceCard,
        title: const Text('Delete Project', style: TextStyle(color: NebulaColors.textPrimary)),
        content: const Text('Are you sure you want to delete this project? This action cannot be undone.', style: TextStyle(color: NebulaColors.textSecondary)),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancel', style: TextStyle(color: NebulaColors.textSecondary)),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Delete', style: TextStyle(color: NebulaColors.critical)),
          ),
        ],
      ),
    );

    if (confirmed ?? false) {
      try {
        await ref.read(projectFormControllerProvider.notifier).deleteProject(widget.projectId!);
        if (mounted) {
          context.go('/projects');
        }
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Failed to delete project: $e')),
          );
        }
      }
    }
  }

  void _addTag() {
    final text = _tagController.text.trim();
    if (text.isNotEmpty && !_tags.contains(text)) {
      setState(() {
        _tags.add(text);
        _tagController.clear();
      });
    }
  }

  void _addMilestone() {
    setState(() {
      _milestones.add({
        'title': '',
        'description': '',
        'due_date': null,
        'status': 'pending'
      });
    });
  }

  // UI Helpers
  InputDecoration _customInputDecoration(String hint, {IconData? icon, String? prefixText}) {
    return InputDecoration(
      hintText: hint,
      hintStyle: const TextStyle(color: NebulaColors.textSecondary, fontSize: 13),
      prefixText: prefixText,
      prefixStyle: const TextStyle(color: NebulaColors.success, fontWeight: FontWeight.bold, fontSize: 14),
      prefixIcon: icon != null ? Icon(icon, size: 16, color: NebulaColors.textSecondary) : null,
      filled: true,
      fillColor: NebulaColors.surfaceCard,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(color: Colors.white.withValues(alpha: 0.1)),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(color: Colors.white.withValues(alpha: 0.1)),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: NebulaColors.primary),
      ),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
    );
  }

  Widget _buildSectionLabel(String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8.0),
      child: Text(
        text.toUpperCase(),
        style: const TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.bold,
          letterSpacing: 1.2,
          color: NebulaColors.textSecondary,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final formState = ref.watch(projectFormControllerProvider);
    final usersAsync = ref.watch(teamMembersProvider);

    ref.listen(projectFormControllerProvider, (prev, next) {
      if (next is AsyncError) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(next.error.toString())),
        );
      }
    });

    final isEdit = widget.projectId != null;

    return Scaffold(
      backgroundColor: NebulaColors.background,
      appBar: AppBar(
        backgroundColor: NebulaColors.surface,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.close, color: NebulaColors.textSecondary),
          onPressed: () => context.pop(),
        ),
        title: const Text(''), // Empty, using custom header
      ),
      body: formState is AsyncLoading
          ? const Center(child: CircularProgressIndicator(color: NebulaColors.primary))
          : SingleChildScrollView(
              padding: const EdgeInsets.all(20.0),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // 1. Global Workspace Node Header
                    Row(
                      children: [
                        Container(
                          width: 48,
                          height: 48,
                          decoration: BoxDecoration(
                            color: NebulaColors.primary.withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(color: NebulaColors.primary.withValues(alpha: 0.2)),
                          ),
                          child: const Icon(Icons.track_changes, color: NebulaColors.primary, size: 24),
                        ),
                        const SizedBox(width: 16),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              isEdit ? 'Project Infrastructure' : 'New Project Architecture',
                              style: const TextStyle(
                                fontSize: 20,
                                fontWeight: FontWeight.bold,
                                color: NebulaColors.textPrimary,
                              ),
                            ),
                            const SizedBox(height: 2),
                            const Text(
                              'GLOBAL WORKSPACE NODE',
                              style: TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.bold,
                                letterSpacing: 1.5,
                                color: NebulaColors.textSecondary,
                              ),
                            ),
                          ],
                        )
                      ],
                    ),
                    const SizedBox(height: 32),

                    // 2. Identification Section
                    _buildSectionLabel('Identification'),
                    TextFormField(
                      controller: _nameController,
                      style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600, color: NebulaColors.textPrimary),
                      decoration: _customInputDecoration('Enter project title...'),
                      validator: (v) => v == null || v.isEmpty ? 'Required' : null,
                    ),
                    const SizedBox(height: 16),
                    _buildSectionLabel('Project Tags'),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: _tags.map((tag) => Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                        decoration: BoxDecoration(
                          color: NebulaColors.primary.withValues(alpha: 0.1),
                          border: Border.all(color: NebulaColors.primary.withValues(alpha: 0.2)),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              tag.toUpperCase(),
                              style: const TextStyle(color: NebulaColors.primary, fontSize: 10, fontWeight: FontWeight.bold, letterSpacing: 1),
                            ),
                            const SizedBox(width: 6),
                            GestureDetector(
                              onTap: () => setState(() => _tags.remove(tag)),
                              child: const Icon(Icons.close, size: 12, color: NebulaColors.primary),
                            )
                          ],
                        ),
                      )).toList(),
                    ),
                    const SizedBox(height: 8),
                    TextFormField(
                      controller: _tagController,
                      style: const TextStyle(fontSize: 13, color: NebulaColors.textPrimary),
                      decoration: _customInputDecoration('Add tag and press Enter...', icon: Icons.local_offer_outlined),
                      onFieldSubmitted: (_) => _addTag(),
                    ),
                    const SizedBox(height: 16),
                    _buildSectionLabel('Operational Directive'),
                    TextFormField(
                      controller: _descController,
                      style: const TextStyle(fontSize: 14, color: NebulaColors.textPrimary),
                      decoration: _customInputDecoration('Define project scope and objectives...'),
                      maxLines: 3,
                    ),
                    
                    const SizedBox(height: 32),

                    // 3. Classification Grid
                    Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              _buildSectionLabel('Phase'),
                              DropdownButtonFormField<String>(
                                initialValue: _status,
                                dropdownColor: NebulaColors.surfaceCard,
                                icon: const Icon(Icons.access_time, size: 16, color: NebulaColors.textSecondary),
                                decoration: _customInputDecoration(''),
                                items: const [
                                  DropdownMenuItem(value: 'planning', child: Text('Planning', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600))),
                                  DropdownMenuItem(value: 'active', child: Text('Active', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600))),
                                  DropdownMenuItem(value: 'on-hold', child: Text('On Hold', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600))),
                                  DropdownMenuItem(value: 'completed', child: Text('Completed', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600))),
                                ],
                                onChanged: (v) => setState(() => _status = v!),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              _buildSectionLabel('Criticality'),
                              DropdownButtonFormField<String>(
                                initialValue: _priority,
                                dropdownColor: NebulaColors.surfaceCard,
                                icon: const Icon(Icons.security, size: 16, color: NebulaColors.textSecondary),
                                decoration: _customInputDecoration(''),
                                items: const [
                                  DropdownMenuItem(value: 'low', child: Text('Low', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600))),
                                  DropdownMenuItem(value: 'medium', child: Text('Medium', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600))),
                                  DropdownMenuItem(value: 'high', child: Text('High', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600))),
                                  DropdownMenuItem(value: 'urgent', child: Text('Urgent', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600))),
                                ],
                                onChanged: (v) => setState(() => _priority = v!),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),

                    const SizedBox(height: 32),

                    // 4. Human Capital Allocation
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        _buildSectionLabel('Human Capital Allocation'),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                          decoration: BoxDecoration(
                            color: NebulaColors.primary.withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Text('${_members.length} Assigned', style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: NebulaColors.primary)),
                        )
                      ],
                    ),
                    Container(
                      decoration: BoxDecoration(
                        color: NebulaColors.surface,
                        border: Border.all(color: Colors.white.withValues(alpha: 0.05)),
                        borderRadius: BorderRadius.circular(16),
                      ),
                      padding: const EdgeInsets.all(12),
                      height: 240,
                      child: usersAsync.when(
                        data: (users) => ListView.separated(
                          itemCount: users.length,
                          separatorBuilder: (_, __) => const SizedBox(height: 8),
                          itemBuilder: (context, index) {
                            final user = users[index];
                            final memberIndex = _members.indexWhere((m) => m['user_id'] == user.id);
                            final isSelected = memberIndex != -1;
                            
                            return AnimatedContainer(
                              duration: const Duration(milliseconds: 200),
                              padding: const EdgeInsets.all(10),
                              decoration: BoxDecoration(
                                color: isSelected ? NebulaColors.primary.withValues(alpha: 0.1) : NebulaColors.surfaceCard,
                                border: Border.all(color: isSelected ? NebulaColors.primary.withValues(alpha: 0.3) : Colors.transparent),
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Column(
                                children: [
                                  InkWell(
                                    onTap: () {
                                      setState(() {
                                        if (isSelected) {
                                          _members.removeAt(memberIndex);
                                        } else {
                                          _members.add({'user_id': user.id, 'role': 'Contributor'});
                                        }
                                      });
                                    },
                                    child: Row(
                                      children: [
                                        CircleAvatar(
                                          radius: 16,
                                          backgroundColor: NebulaColors.surface,
                                          child: Text(user.fullName[0], style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: NebulaColors.textPrimary)),
                                        ),
                                        const SizedBox(width: 12),
                                        Expanded(
                                          child: Column(
                                            crossAxisAlignment: CrossAxisAlignment.start,
                                            children: [
                                              Text(user.fullName, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: NebulaColors.textPrimary)),
                                              Text(user.designation ?? 'Specialist', style: const TextStyle(fontSize: 10, color: NebulaColors.textSecondary)),
                                            ],
                                          ),
                                        ),
                                        Container(
                                          width: 20,
                                          height: 20,
                                          decoration: BoxDecoration(
                                            color: isSelected ? NebulaColors.primary : Colors.transparent,
                                            border: Border.all(color: isSelected ? NebulaColors.primary : Colors.white.withValues(alpha: 0.2)),
                                            shape: BoxShape.circle,
                                          ),
                                          child: isSelected ? const Icon(Icons.check, size: 12, color: Colors.white) : null,
                                        ),
                                      ],
                                    ),
                                  ),
                                  if (isSelected) ...[
                                    const SizedBox(height: 8),
                                    Padding(
                                      padding: const EdgeInsets.only(left: 44.0, right: 28),
                                      child: DropdownButtonHideUnderline(
                                        child: DropdownButton<String>(
                                          isDense: true,
                                          value: _members[memberIndex]['role'],
                                          dropdownColor: NebulaColors.surfaceCard,
                                          icon: const Icon(Icons.arrow_drop_down, color: NebulaColors.primary, size: 16),
                                          style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: NebulaColors.primary),
                                          items: const [
                                            DropdownMenuItem(value: 'Lead', child: Text('Project Lead')),
                                            DropdownMenuItem(value: 'Contributor', child: Text('Contributor')),
                                            DropdownMenuItem(value: 'Reviewer', child: Text('Reviewer')),
                                            DropdownMenuItem(value: 'Architect', child: Text('Architect')),
                                            DropdownMenuItem(value: 'Stakeholder', child: Text('Stakeholder')),
                                          ],
                                          onChanged: (v) {
                                            setState(() {
                                              _members[memberIndex]['role'] = v;
                                            });
                                          },
                                        ),
                                      ),
                                    )
                                  ]
                                ],
                              ),
                            );
                          },
                        ),
                        loading: () => const Center(child: CircularProgressIndicator(color: NebulaColors.primary)),
                        error: (_, __) => const Center(child: Text('Failed to load users')),
                      ),
                    ),

                    const SizedBox(height: 32),

                    // 5. Timeline & Budget
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: NebulaColors.surface.withValues(alpha: 0.5),
                        border: Border.all(color: Colors.white.withValues(alpha: 0.1), style: BorderStyle.none), // Dashed borders aren't native in basic Flutter, we use faint solid
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              const Icon(Icons.calendar_month, size: 14, color: NebulaColors.primary),
                              const SizedBox(width: 8),
                              _buildSectionLabel('Chronology & Capital'),
                            ],
                          ),
                          const SizedBox(height: 16),
                          Row(
                            children: [
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    const Text('DEPLOYMENT', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: NebulaColors.textSecondary)),
                                    const SizedBox(height: 6),
                                    InkWell(
                                      onTap: () async {
                                        final picked = await showDatePicker(
                                          context: context,
                                          initialDate: _startDate ?? DateTime.now(),
                                          firstDate: DateTime(2000),
                                          lastDate: DateTime(2101),
                                          builder: (context, child) => Theme(data: AppTheme.darkTheme, child: child!),
                                        );
                                        if (picked != null) setState(() => _startDate = picked);
                                      },
                                      child: Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                                        decoration: BoxDecoration(
                                          color: NebulaColors.surfaceCard,
                                          borderRadius: BorderRadius.circular(12),
                                          border: Border.all(color: Colors.white.withValues(alpha: 0.1)),
                                        ),
                                        child: Text(_startDate == null ? 'Select Date' : DateFormat('yyyy-MM-dd').format(_startDate!), style: const TextStyle(fontSize: 13, color: NebulaColors.textPrimary)),
                                      ),
                                    )
                                  ],
                                ),
                              ),
                              const SizedBox(width: 16),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    const Text('TERMINATION', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: NebulaColors.textSecondary)),
                                    const SizedBox(height: 6),
                                    InkWell(
                                      onTap: () async {
                                        final picked = await showDatePicker(
                                          context: context,
                                          initialDate: _endDate ?? DateTime.now(),
                                          firstDate: DateTime(2000),
                                          lastDate: DateTime(2101),
                                          builder: (context, child) => Theme(data: AppTheme.darkTheme, child: child!),
                                        );
                                        if (picked != null) setState(() => _endDate = picked);
                                      },
                                      child: Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                                        decoration: BoxDecoration(
                                          color: NebulaColors.surfaceCard,
                                          borderRadius: BorderRadius.circular(12),
                                          border: Border.all(color: Colors.white.withValues(alpha: 0.1)),
                                        ),
                                        child: Text(_endDate == null ? 'Select Date' : DateFormat('yyyy-MM-dd').format(_endDate!), style: const TextStyle(fontSize: 13, color: NebulaColors.textPrimary)),
                                      ),
                                    )
                                  ],
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 16),
                          const Text('BUDGETARY ALLOCATION (USD)', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: NebulaColors.textSecondary)),
                          const SizedBox(height: 6),
                          TextFormField(
                            controller: _budgetController,
                            style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: NebulaColors.success),
                            keyboardType: TextInputType.number,
                            decoration: _customInputDecoration('', icon: Icons.attach_money),
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: 32),

                    // 6. Client Intelligence
                    Row(
                      children: [
                        const Icon(Icons.business, size: 14, color: NebulaColors.textSecondary),
                        const SizedBox(width: 8),
                        _buildSectionLabel('Client Intelligence'),
                      ],
                    ),
                    const SizedBox(height: 8),
                    TextFormField(
                      controller: _clientNameController,
                      style: const TextStyle(fontSize: 13, color: NebulaColors.textPrimary),
                      decoration: _customInputDecoration('Stakeholder Entity / Name'),
                    ),
                    const SizedBox(height: 12),
                    TextFormField(
                      controller: _clientEmailController,
                      style: const TextStyle(fontSize: 13, color: NebulaColors.textPrimary),
                      keyboardType: TextInputType.emailAddress,
                      decoration: _customInputDecoration('Contact Protocol (Email)'),
                    ),

                    const SizedBox(height: 32),

                    // 7. Milestones
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        _buildSectionLabel('Project Milestones'),
                        GestureDetector(
                          onTap: _addMilestone,
                          child: const Row(
                            children: [
                              Icon(Icons.add, size: 12, color: NebulaColors.primary),
                              SizedBox(width: 4),
                              Text('Add Milestone', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: NebulaColors.primary)),
                            ],
                          ),
                        )
                      ],
                    ),
                    if (_milestones.isEmpty)
                      Container(
                        padding: const EdgeInsets.all(24),
                        decoration: BoxDecoration(
                          border: Border.all(color: Colors.white.withValues(alpha: 0.1)),
                          borderRadius: BorderRadius.circular(16),
                        ),
                        child: const Center(
                          child: Text('NO MILESTONES DEFINED.', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w500, letterSpacing: 1, color: NebulaColors.textSecondary)),
                        ),
                      ),
                    ListView.separated(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      itemCount: _milestones.length,
                      separatorBuilder: (_, __) => const SizedBox(height: 12),
                      itemBuilder: (context, idx) {
                        final m = _milestones[idx];
                        return Container(
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: NebulaColors.surfaceCard,
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(color: Colors.white.withValues(alpha: 0.1)),
                          ),
                          child: Column(
                            children: [
                              Row(
                                children: [
                                  Expanded(
                                    child: TextFormField(
                                      initialValue: m['title'],
                                      style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: NebulaColors.textPrimary),
                                      decoration: const InputDecoration(
                                        hintText: 'Milestone Title',
                                        hintStyle: TextStyle(color: NebulaColors.textSecondary),
                                        border: UnderlineInputBorder(borderSide: BorderSide(color: Colors.white24)),
                                        enabledBorder: UnderlineInputBorder(borderSide: BorderSide(color: Colors.white24)),
                                        focusedBorder: UnderlineInputBorder(borderSide: BorderSide(color: NebulaColors.primary)),
                                        isDense: true,
                                        contentPadding: EdgeInsets.symmetric(vertical: 8),
                                      ),
                                      onChanged: (v) => m['title'] = v,
                                    ),
                                  ),
                                  IconButton(
                                    icon: const Icon(Icons.close, size: 14, color: NebulaColors.textSecondary),
                                    padding: EdgeInsets.zero,
                                    constraints: const BoxConstraints(),
                                    onPressed: () => setState(() => _milestones.removeAt(idx)),
                                  )
                                ],
                              ),
                              const SizedBox(height: 12),
                              Row(
                                children: [
                                  Expanded(
                                    child: InkWell(
                                      onTap: () async {
                                        final picked = await showDatePicker(
                                          context: context,
                                          initialDate: m['due_date'] != null ? DateTime.parse(m['due_date']) : DateTime.now(),
                                          firstDate: DateTime(2000),
                                          lastDate: DateTime(2101),
                                          builder: (context, child) => Theme(data: AppTheme.darkTheme, child: child!),
                                        );
                                        if (picked != null) {
                                          setState(() => m['due_date'] = picked.toIso8601String());
                                        }
                                      },
                                      child: Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
                                        decoration: BoxDecoration(
                                          border: Border.all(color: Colors.white.withValues(alpha: 0.1)),
                                          borderRadius: BorderRadius.circular(6),
                                        ),
                                        child: Text(m['due_date'] == null ? 'Set Date' : DateFormat('yyyy-MM-dd').format(DateTime.parse(m['due_date'])), style: const TextStyle(fontSize: 11, color: NebulaColors.textPrimary)),
                                      ),
                                    ),
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 8),
                                      decoration: BoxDecoration(
                                        border: Border.all(color: Colors.white.withValues(alpha: 0.1)),
                                        borderRadius: BorderRadius.circular(6),
                                      ),
                                      child: DropdownButtonHideUnderline(
                                        child: DropdownButton<String>(
                                          value: m['status'],
                                          isDense: true,
                                          isExpanded: true,
                                          dropdownColor: NebulaColors.surfaceCard,
                                          style: const TextStyle(fontSize: 11, color: NebulaColors.textPrimary),
                                          items: const [
                                            DropdownMenuItem(value: 'pending', child: Text('Pending')),
                                            DropdownMenuItem(value: 'completed', child: Text('Completed')),
                                          ],
                                          onChanged: (v) => setState(() => m['status'] = v!),
                                        ),
                                      ),
                                    ),
                                  ),
                                ],
                              )
                            ],
                          ),
                        );
                      },
                    ),

                    const SizedBox(height: 48),

                    // 8. Actions
                    Row(
                      children: [
                        if (isEdit)
                          Expanded(
                            flex: 1,
                            child: Padding(
                              padding: const EdgeInsets.only(right: 12.0),
                              child: ElevatedButton(
                                onPressed: _deleteProject,
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: NebulaColors.critical.withValues(alpha: 0.1),
                                  foregroundColor: NebulaColors.critical,
                                  elevation: 0,
                                  padding: const EdgeInsets.symmetric(vertical: 16),
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                ),
                                child: const Row(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    Icon(Icons.delete_outline, size: 16),
                                    SizedBox(width: 8),
                                    Text('Purge', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                                  ],
                                ),
                              ),
                            ),
                          ),
                        Expanded(
                          flex: 2,
                          child: ElevatedButton(
                            onPressed: _submit,
                            style: ElevatedButton.styleFrom(
                              backgroundColor: NebulaColors.primary,
                              foregroundColor: Colors.white,
                              elevation: 8,
                              shadowColor: NebulaColors.primary.withValues(alpha: 0.5),
                              padding: const EdgeInsets.symmetric(vertical: 16),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                            ),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                const Icon(Icons.check, size: 16),
                                const SizedBox(width: 8),
                                Text(isEdit ? 'Update Architecture' : 'Initialize Project', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 32),
                  ],
                ),
              ),
            ),
    );
  }
}
