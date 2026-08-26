import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../../../core/theme/nebula_colors.dart';
import '../../../../features/auth/data/models/auth_models.dart';
import '../../../../features/auth/presentation/providers/auth_provider.dart';
import '../../data/team_data_source.dart';
import '../providers/team_provider.dart';

// ── Local filter/search state providers ───────────────────────────────────────

enum TeamFilter { all, admin, manager, staff, intern }

final _teamSearchProvider = StateProvider<String>((ref) => '');
final _teamFilterProvider = StateProvider<TeamFilter>((ref) => TeamFilter.all);

final _filteredTeamProvider = Provider<List<User>>((ref) {
  final search = ref.watch(_teamSearchProvider).toLowerCase();
  final filter = ref.watch(_teamFilterProvider);
  return ref.watch(teamMembersProvider).maybeWhen(
        data: (members) => members.where((m) {
          final matchesSearch = search.isEmpty ||
              m.fullName.toLowerCase().contains(search) ||
              m.email.toLowerCase().contains(search) ||
              (m.designation?.toLowerCase().contains(search) ?? false) ||
              (m.department?.toLowerCase().contains(search) ?? false);
          final matchesFilter = switch (filter) {
            TeamFilter.all => true,
            TeamFilter.admin => m.accessLevel >= 3 && m.accessLevel <= 4,
            TeamFilter.manager => m.accessLevel == 5,
            TeamFilter.staff => m.accessLevel >= 6 && m.accessLevel <= 7,
            TeamFilter.intern => m.accessLevel == 8,
          };
          return matchesSearch && matchesFilter;
        }).toList(),
        orElse: () => [],
      );
});

// ── Helpers ────────────────────────────────────────────────────────────────────

String _initials(User u) {
  final parts = u.fullName.trim().split(' ');
  if (parts.length >= 2) return '${parts.first[0]}${parts.last[0]}'.toUpperCase();
  return u.fullName.isNotEmpty ? u.fullName[0].toUpperCase() : '?';
}

Color _levelColor(int level) {
  if (level <= 2) return const Color(0xFFEF4444);
  if (level <= 4) return const Color(0xFFF97316);
  if (level == 5) return const Color(0xFFF59E0B);
  if (level <= 7) return const Color(0xFF3B82F6);
  if (level == 8) return const Color(0xFF7C3AED);
  return NebulaColors.textSecondary;
}

Color _ventureColor(Venture? venture) {
  final hex = venture?.primaryColor;
  if (hex != null && hex.isNotEmpty) {
    try {
      return Color(int.parse('FF${hex.replaceAll('#', '')}', radix: 16));
    } catch (_) {}
  }
  return NebulaColors.primary;
}

// ── Screen ─────────────────────────────────────────────────────────────────────

class TeamScreen extends ConsumerWidget {
  const TeamScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final membersAsync = ref.watch(teamMembersProvider);
    final filteredMembers = ref.watch(_filteredTeamProvider);
    final currentFilter = ref.watch(_teamFilterProvider);
    final searchQuery = ref.watch(_teamSearchProvider);

    final authState = ref.watch(authProvider);
    final viewerLevel = authState.maybeWhen(
      authenticated: (user) => user.accessLevel,
      orElse: () => 9,
    );
    final canManage = viewerLevel <= 3;

    return Scaffold(
      backgroundColor: NebulaColors.background,
      appBar: AppBar(
        backgroundColor: NebulaColors.surfaceCard,
        elevation: 0,
        title: const Text(
          'Team',
          style: TextStyle(fontWeight: FontWeight.w700, color: NebulaColors.textPrimary, fontSize: 20),
        ),
        centerTitle: false,
        actions: [
          IconButton(
            icon: const Icon(LucideIcons.refreshCw, color: NebulaColors.primary, size: 20),
            onPressed: () => ref.invalidate(teamMembersProvider),
            tooltip: 'Refresh',
          ),
        ],
      ),
      body: Column(
        children: [
          // Search bar
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
            child: TextField(
              onChanged: (v) => ref.read(_teamSearchProvider.notifier).state = v,
              style: const TextStyle(color: NebulaColors.textPrimary),
              decoration: InputDecoration(
                hintText: 'Search by name, email, designation…',
                hintStyle: const TextStyle(color: NebulaColors.textSecondary, fontSize: 14),
                prefixIcon: const Icon(LucideIcons.search, color: NebulaColors.textSecondary, size: 18),
                suffixIcon: searchQuery.isNotEmpty
                    ? IconButton(
                        icon: const Icon(LucideIcons.x, size: 16, color: NebulaColors.textSecondary),
                        onPressed: () => ref.read(_teamSearchProvider.notifier).state = '',
                      )
                    : null,
                filled: true,
                fillColor: NebulaColors.surfaceCard,
                border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
              ),
            ),
          ),

          // Filter chips
          SizedBox(
            height: 48,
            child: ListView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              children: [
                _buildFilterChip(ref, 'All', TeamFilter.all, currentFilter),
                _buildFilterChip(ref, 'Admin (L3-L4)', TeamFilter.admin, currentFilter),
                _buildFilterChip(ref, 'Manager (L5)', TeamFilter.manager, currentFilter),
                _buildFilterChip(ref, 'Staff (L6-L7)', TeamFilter.staff, currentFilter),
                _buildFilterChip(ref, 'Intern (L8)', TeamFilter.intern, currentFilter),
              ],
            ),
          ),

          // Member count
          if (membersAsync.hasValue)
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 4, 16, 0),
              child: Align(
                alignment: Alignment.centerLeft,
                child: Text(
                  '${filteredMembers.length} member${filteredMembers.length != 1 ? 's' : ''}',
                  style: const TextStyle(color: NebulaColors.textSecondary, fontSize: 12),
                ),
              ),
            ),

          // Content
          Expanded(
            child: membersAsync.when(
              data: (_) {
                if (filteredMembers.isEmpty) {
                  return _EmptyState(
                    icon: LucideIcons.users,
                    title: searchQuery.isNotEmpty ? 'No results found' : 'No team members',
                    subtitle: searchQuery.isNotEmpty
                        ? 'Try a different search term or filter.'
                        : 'Your organisation\'s team will appear here.',
                  );
                }
                return RefreshIndicator(
                  onRefresh: () async => ref.invalidate(teamMembersProvider),
                  color: NebulaColors.primary,
                  backgroundColor: NebulaColors.surfaceCard,
                  child: GridView.builder(
                    padding: const EdgeInsets.fromLTRB(16, 10, 16, 24),
                    gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: 2,
                      crossAxisSpacing: 12,
                      mainAxisSpacing: 12,
                      childAspectRatio: 0.82,
                    ),
                    itemCount: filteredMembers.length,
                    itemBuilder: (context, index) {
                      return _MemberCard(
                        user: filteredMembers[index],
                        canManage: canManage,
                        ref: ref,
                      );
                    },
                  ),
                );
              },
              loading: () => const _LoadingSkeleton(),
              error: (e, _) => _ErrorState(
                message: e.toString(),
                onRetry: () => ref.invalidate(teamMembersProvider),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFilterChip(WidgetRef ref, String label, TeamFilter filter, TeamFilter current) {
    final selected = current == filter;
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: ChoiceChip(
        label: Text(label),
        selected: selected,
        onSelected: (_) => ref.read(_teamFilterProvider.notifier).state = filter,
        labelStyle: TextStyle(
          color: selected ? Colors.white : NebulaColors.textPrimary,
          fontWeight: selected ? FontWeight.w600 : FontWeight.normal,
          fontSize: 11,
        ),
        selectedColor: NebulaColors.primary,
        backgroundColor: NebulaColors.surfaceCard,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
          side: BorderSide(color: selected ? Colors.transparent : NebulaColors.surface),
        ),
        showCheckmark: false,
      ),
    );
  }
}

// ── Member card ────────────────────────────────────────────────────────────────

class _MemberCard extends StatelessWidget {
  final User user;
  final bool canManage;
  final WidgetRef ref;
  const _MemberCard({required this.user, required this.canManage, required this.ref});

  @override
  Widget build(BuildContext context) {
    final lc = _levelColor(user.accessLevel);
    final vc = _ventureColor(user.venture);

    return GestureDetector(
      onTap: () => _showDetail(context),
      child: Container(
        decoration: BoxDecoration(
          color: NebulaColors.surfaceCard,
          borderRadius: BorderRadius.circular(16),
          boxShadow: [
            BoxShadow(color: Colors.black.withOpacity(0.1), blurRadius: 10, offset: const Offset(0, 4)),
          ],
        ),
        padding: const EdgeInsets.all(14),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            // Avatar
            CircleAvatar(
              radius: 28,
              backgroundColor: NebulaColors.primary,
              backgroundImage: user.avatarUrl != null ? NetworkImage(user.avatarUrl!) : null,
              child: user.avatarUrl == null
                  ? Text(_initials(user),
                      style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16))
                  : null,
            ),
            const SizedBox(height: 10),

            // Name
            Text(
              user.fullName,
              textAlign: TextAlign.center,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                  color: NebulaColors.textPrimary, fontWeight: FontWeight.w600, fontSize: 13),
            ),
            if (user.designation != null) ...[
              const SizedBox(height: 2),
              Text(
                user.designation!,
                textAlign: TextAlign.center,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(color: NebulaColors.textSecondary, fontSize: 10),
              ),
            ],
            const SizedBox(height: 8),

            // Level badge
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
              decoration: BoxDecoration(
                color: lc.withOpacity(0.15),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Text(
                user.levelName,
                style: TextStyle(color: lc, fontSize: 10, fontWeight: FontWeight.w700),
              ),
            ),
            const SizedBox(height: 5),

            // Venture dot + name
            if (user.venture != null)
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                      width: 6,
                      height: 6,
                      decoration: BoxDecoration(color: vc, shape: BoxShape.circle)),
                  const SizedBox(width: 4),
                  Flexible(
                    child: Text(
                      user.venture!.name,
                      style: const TextStyle(color: NebulaColors.textSecondary, fontSize: 9),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
          ],
        ),
      ),
    );
  }

  void _showDetail(BuildContext context) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (_) => _MemberDetailSheet(user: user, canManage: canManage, ref: ref),
    );
  }
}

// ── Detail bottom sheet ────────────────────────────────────────────────────────

class _MemberDetailSheet extends StatelessWidget {
  final User user;
  final bool canManage;
  final WidgetRef ref;
  const _MemberDetailSheet({required this.user, required this.canManage, required this.ref});

  @override
  Widget build(BuildContext context) {
    final lc = _levelColor(user.accessLevel);
    final vc = _ventureColor(user.venture);

    return Container(
      margin: const EdgeInsets.all(16),
      decoration: BoxDecoration(color: NebulaColors.surfaceCard, borderRadius: BorderRadius.circular(20)),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              margin: const EdgeInsets.only(top: 12),
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                  color: NebulaColors.textSecondary.withOpacity(0.3),
                  borderRadius: BorderRadius.circular(2)),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 20, 20, 28),
              child: Column(
                children: [
                  // Large avatar
                  CircleAvatar(
                    radius: 44,
                    backgroundColor: NebulaColors.primary,
                    backgroundImage:
                        user.avatarUrl != null ? NetworkImage(user.avatarUrl!) : null,
                    child: user.avatarUrl == null
                        ? Text(_initials(user),
                            style: const TextStyle(
                                color: Colors.white, fontWeight: FontWeight.bold, fontSize: 26))
                        : null,
                  ),
                  const SizedBox(height: 14),
                  Text(user.fullName,
                      style: const TextStyle(
                          color: NebulaColors.textPrimary,
                          fontWeight: FontWeight.bold,
                          fontSize: 20)),
                  const SizedBox(height: 8),

                  // Badges row
                  Wrap(
                    alignment: WrapAlignment.center,
                    spacing: 8,
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                            color: lc.withOpacity(0.15), borderRadius: BorderRadius.circular(20)),
                        child: Text(user.levelName,
                            style: TextStyle(
                                color: lc, fontSize: 12, fontWeight: FontWeight.w700)),
                      ),
                      if (user.venture != null)
                        Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Container(
                                width: 8,
                                height: 8,
                                decoration:
                                    BoxDecoration(color: vc, shape: BoxShape.circle)),
                            const SizedBox(width: 5),
                            Text(user.venture!.name,
                                style: const TextStyle(
                                    color: NebulaColors.textSecondary, fontSize: 12)),
                          ],
                        ),
                    ],
                  ),
                  const SizedBox(height: 20),
                  const Divider(color: NebulaColors.surface, height: 1),
                  const SizedBox(height: 14),

                  // Info
                  _InfoRow(icon: LucideIcons.mail, label: 'Email', value: user.email),
                  if (user.phone != null && user.phone!.isNotEmpty)
                    _InfoRow(icon: LucideIcons.phone, label: 'Phone', value: user.phone!),
                  if (user.department != null)
                    _InfoRow(
                        icon: LucideIcons.building2,
                        label: 'Department',
                        value: user.department!),
                  if (user.designation != null)
                    _InfoRow(
                        icon: LucideIcons.briefcase,
                        label: 'Designation',
                        value: user.designation!),
                  _InfoRow(
                      icon: LucideIcons.hash, label: 'Employee ID', value: user.employeeId),

                  // Admin actions
                  if (canManage) ...[
                    const SizedBox(height: 20),
                    const Divider(color: NebulaColors.surface, height: 1),
                    const SizedBox(height: 14),
                    Row(
                      children: [
                        Expanded(
                          child: OutlinedButton.icon(
                            onPressed: () => _confirmRemove(context),
                            icon: const Icon(LucideIcons.userMinus, size: 14),
                            label: const Text('Remove'),
                            style: OutlinedButton.styleFrom(
                              foregroundColor: NebulaColors.critical,
                              side: const BorderSide(color: NebulaColors.critical),
                              padding: const EdgeInsets.symmetric(vertical: 12),
                              shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(10)),
                            ),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: ElevatedButton.icon(
                            onPressed: () => _showEditLevel(context),
                            icon: const Icon(LucideIcons.shieldCheck, size: 14),
                            label: const Text('Edit Level'),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: NebulaColors.primary,
                              foregroundColor: Colors.white,
                              padding: const EdgeInsets.symmetric(vertical: 12),
                              shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(10)),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _confirmRemove(BuildContext context) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        backgroundColor: NebulaColors.surfaceCard,
        title: const Text('Remove Member?',
            style: TextStyle(color: NebulaColors.textPrimary)),
        content: Text(
          'Remove ${user.fullName} from the team?',
          style: const TextStyle(color: NebulaColors.textSecondary),
        ),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(context, false),
              child:
                  const Text('Cancel', style: TextStyle(color: NebulaColors.textSecondary))),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: NebulaColors.critical),
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Remove'),
          ),
        ],
      ),
    );
    if (confirmed == true && context.mounted) {
      try {
        final ds = ref.read(teamDataSourceProvider);
        await ds.removeMember(user.id);
        ref.invalidate(teamMembersProvider);
        if (context.mounted) Navigator.of(context).pop();
      } catch (_) {}
    }
  }

  void _showEditLevel(BuildContext context) {
    showDialog(
      context: context,
      builder: (_) => _EditLevelDialog(user: user, ref: ref),
    );
  }
}

class _InfoRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  const _InfoRow({required this.icon, required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 5),
      child: Row(
        children: [
          Icon(icon, size: 14, color: NebulaColors.primary),
          const SizedBox(width: 10),
          Text('$label: ',
              style: const TextStyle(color: NebulaColors.textSecondary, fontSize: 13)),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(
                  color: NebulaColors.textPrimary, fontSize: 13, fontWeight: FontWeight.w500),
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ],
      ),
    );
  }
}

// ── Edit level dialog ──────────────────────────────────────────────────────────

class _EditLevelDialog extends StatefulWidget {
  final User user;
  final WidgetRef ref;
  const _EditLevelDialog({required this.user, required this.ref});

  @override
  State<_EditLevelDialog> createState() => _EditLevelDialogState();
}

class _EditLevelDialogState extends State<_EditLevelDialog> {
  late int _selected;
  bool _loading = false;

  static const _levels = [
    (1, 'L1 – Super Admin'),
    (2, 'L2 – Executive'),
    (3, 'L3 – Senior Admin'),
    (4, 'L4 – Admin'),
    (5, 'L5 – Manager'),
    (6, 'L6 – Senior Staff'),
    (7, 'L7 – Staff'),
    (8, 'L8 – Intern'),
  ];

  @override
  void initState() {
    super.initState();
    _selected = widget.user.accessLevel;
  }

  Future<void> _save() async {
    setState(() => _loading = true);
    try {
      final ds = widget.ref.read(teamDataSourceProvider);
      await ds.updateMemberLevel(widget.user.id, _selected);
      widget.ref.invalidate(teamMembersProvider);
      if (mounted) {
        Navigator.of(context).pop(); // close dialog
        Navigator.of(context).pop(); // close detail sheet
      }
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      backgroundColor: NebulaColors.surfaceCard,
      title: const Text('Edit Level', style: TextStyle(color: NebulaColors.textPrimary)),
      content: SizedBox(
        width: double.maxFinite,
        child: ListView(
          shrinkWrap: true,
          children: _levels
              .map((lvl) => RadioListTile<int>(
                    title: Text(lvl.$2,
                        style: const TextStyle(color: NebulaColors.textPrimary, fontSize: 14)),
                    value: lvl.$1,
                    groupValue: _selected,
                    activeColor: NebulaColors.primary,
                    onChanged: (v) => setState(() => _selected = v!),
                    dense: true,
                  ))
              .toList(),
        ),
      ),
      actions: [
        TextButton(
            onPressed: () => Navigator.pop(context),
            child:
                const Text('Cancel', style: TextStyle(color: NebulaColors.textSecondary))),
        ElevatedButton(
          onPressed: _loading ? null : _save,
          style: ElevatedButton.styleFrom(
              backgroundColor: NebulaColors.primary, foregroundColor: Colors.white),
          child: _loading
              ? const SizedBox(
                  height: 16,
                  width: 16,
                  child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
              : const Text('Save'),
        ),
      ],
    );
  }
}

// ── Skeleton ───────────────────────────────────────────────────────────────────

class _LoadingSkeleton extends StatefulWidget {
  const _LoadingSkeleton();

  @override
  State<_LoadingSkeleton> createState() => _LoadingSkeletonState();
}

class _LoadingSkeletonState extends State<_LoadingSkeleton>
    with SingleTickerProviderStateMixin {
  late AnimationController _ctrl;
  late Animation<double> _anim;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(vsync: this, duration: const Duration(milliseconds: 900))
      ..repeat(reverse: true);
    _anim = Tween(begin: 0.25, end: 0.65).animate(_ctrl);
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _anim,
      builder: (_, __) => GridView.builder(
        padding: const EdgeInsets.all(16),
        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: 2,
          crossAxisSpacing: 12,
          mainAxisSpacing: 12,
          childAspectRatio: 0.82,
        ),
        itemCount: 6,
        itemBuilder: (_, __) => Container(
          decoration: BoxDecoration(
            color: NebulaColors.surfaceCard.withOpacity(_anim.value),
            borderRadius: BorderRadius.circular(16),
          ),
        ),
      ),
    );
  }
}

// ── Empty / Error states ───────────────────────────────────────────────────────

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
            Text(title,
                style: const TextStyle(
                    color: NebulaColors.textPrimary,
                    fontSize: 18,
                    fontWeight: FontWeight.w600)),
            const SizedBox(height: 8),
            Text(subtitle,
                textAlign: TextAlign.center,
                style:
                    const TextStyle(color: NebulaColors.textSecondary, fontSize: 14)),
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
            const Text('Something went wrong',
                style: TextStyle(
                    color: NebulaColors.textPrimary,
                    fontSize: 16,
                    fontWeight: FontWeight.w600)),
            const SizedBox(height: 8),
            Text(message.replaceAll('Exception: ', ''),
                textAlign: TextAlign.center,
                style:
                    const TextStyle(color: NebulaColors.textSecondary, fontSize: 12)),
            const SizedBox(height: 20),
            ElevatedButton.icon(
              onPressed: onRetry,
              icon: const Icon(LucideIcons.refreshCw, size: 16),
              label: const Text('Retry'),
              style: ElevatedButton.styleFrom(
                  backgroundColor: NebulaColors.primary, foregroundColor: Colors.white),
            ),
          ],
        ),
      ),
    );
  }
}
