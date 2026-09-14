import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../../../core/constants/access_levels.dart';
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
import '../../data/team_data_source.dart';
import '../providers/team_provider.dart';

/// Team — the directory as a scannable list.
///
/// The previous version drew a two-column grid of portrait cards: 55 hardcoded
/// colour references, a bespoke `_levelColor` ramp that gave every rank its own
/// hue, and a level badge that shouted louder than the person's name. Hue in
/// this app means *venture* and nothing else, so the rank is now a neutral
/// pill and the only colour on a row is the venture spine.
///
/// A list also answers the question this screen is actually opened for — "who
/// is in this department / at this level" — which a grid of squares does not.

// ── Local filter/search state providers ───────────────────────────────────────

enum TeamFilter { all, admin, manager, staff, intern }

extension _TeamFilterLabel on TeamFilter {
  String get label => switch (this) {
        TeamFilter.all => 'All',
        TeamFilter.admin => 'Admin',
        TeamFilter.manager => 'Manager',
        TeamFilter.staff => 'Staff',
        TeamFilter.intern => 'Intern',
      };
}

final _teamSearchProvider = StateProvider<String>((ref) => '');
final _teamFilterProvider = StateProvider<TeamFilter>((ref) => TeamFilter.all);

/// The same search and bucket rules the chip row used, with one addition: the
/// result is ordered by access level *ascending*, because level 1 is the most
/// access and level 9 the least. Sorting the other way — the mistake this
/// codebase has made before — would bury the leadership at the bottom.
final _filteredTeamProvider = Provider<List<User>>((ref) {
  final search = ref.watch(_teamSearchProvider).toLowerCase();
  final filter = ref.watch(_teamFilterProvider);
  return ref.watch(teamMembersProvider).maybeWhen(
        data: (members) {
          final matched = members.where((m) {
            final matchesSearch = search.isEmpty ||
                m.fullName.toLowerCase().contains(search) ||
                m.email.toLowerCase().contains(search) ||
                (m.designation?.toLowerCase().contains(search) ?? false) ||
                (m.department?.toLowerCase().contains(search) ?? false);
            final matchesFilter = switch (filter) {
              TeamFilter.all => true,
              TeamFilter.admin => AccessLevels.isBetween(
                  m.accessLevel, AccessLevels.admin, AccessLevels.cxo),
              TeamFilter.manager => m.accessLevel == AccessLevels.manager,
              TeamFilter.staff => AccessLevels.isBetween(m.accessLevel,
                  AccessLevels.executiveStaff, AccessLevels.staff),
              TeamFilter.intern => m.accessLevel == AccessLevels.intern,
            };
            return matchesSearch && matchesFilter;
          }).toList();

          matched.sort((a, b) {
            final byLevel = a.accessLevel.compareTo(b.accessLevel);
            return byLevel != 0
                ? byLevel
                : a.fullName.toLowerCase().compareTo(b.fullName.toLowerCase());
          });
          return matched;
        },
        orElse: () => const <User>[],
      );
});

// ── Helpers ───────────────────────────────────────────────────────────────────

Color _ventureColor(Venture? venture) => NebulaColors.parseHex(
      venture?.primaryColor,
      fallback: NebulaColors.forVentureId(venture?.id),
    );

// ── Screen ────────────────────────────────────────────────────────────────────

class TeamScreen extends ConsumerWidget {
  const TeamScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Team'),
        actions: [
          IconButton(
            icon: const Icon(LucideIcons.rotateCw, size: 19),
            onPressed: () => ref.invalidate(teamMembersProvider),
            tooltip: 'Refresh',
          ),
        ],
      ),
      body: const SafeArea(
        top: false,
        bottom: false,
        child: PermissionScope(
          permission: Permission.viewTeam,
          what: 'the team directory',
          child: _TeamBody(),
        ),
      ),
    );
  }
}

class _TeamBody extends ConsumerWidget {
  const _TeamBody();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final membersAsync = ref.watch(teamMembersProvider);
    final members = ref.watch(_filteredTeamProvider);
    final filter = ref.watch(_teamFilterProvider);
    final search = ref.watch(_teamSearchProvider);
    final viewer = ref.watch(currentUserProvider);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(
            NebulaSpacing.md,
            NebulaSpacing.sm,
            NebulaSpacing.md,
            0,
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _SearchField(value: search),
              const SizedBox(height: NebulaSpacing.sm),
              _SegmentedFilter(
                segments: TeamFilter.values,
                selected: filter,
                labelOf: (f) => f.label,
                onChanged: (f) =>
                    ref.read(_teamFilterProvider.notifier).state = f,
              ),
              if (membersAsync.hasValue) ...[
                const SizedBox(height: NebulaSpacing.md),
                SectionHeader(
                  filter == TeamFilter.all ? 'Directory' : filter.label,
                  padding: EdgeInsets.zero,
                  trailing: Mono(
                    '${members.length}',
                    size: 11,
                    color: context.dl.textTertiary,
                  ),
                ),
              ],
            ],
          ),
        ),
        Expanded(
          child: membersAsync.when(
            loading: () => const Padding(
              padding: EdgeInsets.fromLTRB(
                NebulaSpacing.md,
                NebulaSpacing.md,
                NebulaSpacing.md,
                0,
              ),
              child: ListSkeleton(count: 6),
            ),
            error: (e, _) => ErrorStateView(
              message: readableError(e),
              onRetry: () => ref.invalidate(teamMembersProvider),
            ),
            data: (_) {
              if (members.isEmpty) {
                final filtering =
                    search.isNotEmpty || filter != TeamFilter.all;
                return EmptyStateView(
                  icon: LucideIcons.users,
                  title: filtering ? 'No one matches' : 'No team members',
                  message: filtering
                      ? 'Try a different search term or filter.'
                      : "Your organisation's team will appear here.",
                );
              }

              return RefreshIndicator(
                onRefresh: () async {
                  ref.invalidate(teamMembersProvider);
                  await ref.read(teamMembersProvider.future);
                },
                child: ListView.builder(
                  padding: const EdgeInsets.fromLTRB(
                    NebulaSpacing.md,
                    NebulaSpacing.sm,
                    NebulaSpacing.md,
                    NebulaSpacing.xxl,
                  ),
                  itemCount: members.length,
                  itemBuilder: (context, i) {
                    final member = members[i];
                    return Padding(
                      padding: const EdgeInsets.only(bottom: NebulaSpacing.sm),
                      child: StaggerIn(
                        index: i,
                        child: _MemberRow(
                          member: member,
                          isViewer: viewer?.id == member.id,
                        ),
                      ),
                    );
                  },
                ),
              );
            },
          ),
        ),
      ],
    );
  }
}

class _SearchField extends ConsumerWidget {
  const _SearchField({required this.value});

  final String value;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return TextField(
      onChanged: (v) => ref.read(_teamSearchProvider.notifier).state = v,
      style: context.text.bodyMedium?.copyWith(
        color: context.scheme.onSurface,
      ),
      decoration: InputDecoration(
        hintText: 'Search by name, email, designation…',
        prefixIcon: const Icon(LucideIcons.search, size: 17),
        suffixIcon: value.isEmpty
            ? null
            : IconButton(
                icon: const Icon(LucideIcons.x, size: 15),
                onPressed: () =>
                    ref.read(_teamSearchProvider.notifier).state = '',
              ),
        contentPadding: const EdgeInsets.symmetric(
          horizontal: NebulaSpacing.md,
          vertical: 12,
        ),
      ),
    );
  }
}

/// A compact segmented control — one bordered track, one filled segment.
///
/// Replaces the scrolling row of `ChoiceChip`s: five identically-shaped pills
/// where only the fill told you which was active read as decoration, and cost
/// a whole 48px band to say one word.
class _SegmentedFilter<T> extends StatelessWidget {
  const _SegmentedFilter({
    super.key,
    required this.segments,
    required this.selected,
    required this.labelOf,
    required this.onChanged,
  });

  final List<T> segments;
  final T selected;
  final String Function(T) labelOf;
  final ValueChanged<T> onChanged;

  @override
  Widget build(BuildContext context) {
    final dl = context.dl;

    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Container(
        padding: const EdgeInsets.all(3),
        decoration: BoxDecoration(
          color: dl.surfaceRaised,
          borderRadius: BorderRadius.circular(NebulaSpacing.radiusSm),
          border: Border.all(color: dl.border),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            for (final segment in segments)
              _Segment(
                label: labelOf(segment),
                selected: segment == selected,
                onTap: () => onChanged(segment),
              ),
          ],
        ),
      ),
    );
  }
}

class _Segment extends StatelessWidget {
  const _Segment({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final scheme = context.scheme;

    return PressScale(
      onTap: onTap,
      haptic: false,
      child: AnimatedContainer(
        duration: Motion.fast,
        curve: Motion.emphasis,
        padding: const EdgeInsets.symmetric(horizontal: 13, vertical: 7),
        decoration: BoxDecoration(
          color: selected ? scheme.primary : context.dl.surfaceRaised,
          borderRadius: BorderRadius.circular(NebulaSpacing.radiusSm - 2),
        ),
        child: Text(
          label,
          style: context.text.bodySmall?.copyWith(
            fontSize: 12,
            fontWeight: selected ? FontWeight.w600 : FontWeight.w500,
            color: selected ? scheme.onPrimary : context.dl.textTertiary,
          ),
        ),
      ),
    );
  }
}

// ── Row ───────────────────────────────────────────────────────────────────────

class _MemberRow extends StatelessWidget {
  const _MemberRow({required this.member, required this.isViewer});

  final User member;
  final bool isViewer;

  @override
  Widget build(BuildContext context) {
    final venture = member.venture;

    return EntityRow(
      title: member.fullName,
      // The signed-in user is the one row that is "now": you are here.
      timeState: isViewer ? TimeState.now : TimeState.next,
      spineColor: venture == null ? null : _ventureColor(venture),
      leading: DAvatar(member.fullName, size: 34, imageUrl: member.avatarUrl),
      meta: [
        DTag(AccessLevels.nameOf(member.accessLevel)),
        if (venture != null)
          DTag.venture(venture.name, color: _ventureColor(venture)),
        if (member.department != null && member.department!.isNotEmpty)
          Text(member.department!),
        if (member.designation != null && member.designation!.isNotEmpty)
          Text(member.designation!),
      ],
      trailing: member.employeeId.isEmpty
          ? null
          : Mono(
              member.employeeId,
              size: 11,
              color: context.dl.textTertiary,
            ),
      onTap: () => showModalBottomSheet<void>(
        context: context,
        isScrollControlled: true,
        builder: (_) => _MemberSheet(member: member),
      ),
    );
  }
}

// ── Detail sheet ──────────────────────────────────────────────────────────────

class _MemberSheet extends ConsumerWidget {
  const _MemberSheet({required this.member});

  final User member;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final venture = member.venture;

    return SafeArea(
      top: false,
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(
          NebulaSpacing.md,
          NebulaSpacing.sm,
          NebulaSpacing.md,
          NebulaSpacing.lg,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Row(
              children: [
                DAvatar(member.fullName, size: 52, imageUrl: member.avatarUrl),
                const SizedBox(width: NebulaSpacing.md),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(member.fullName, style: context.text.titleLarge),
                      const SizedBox(height: 7),
                      Wrap(
                        spacing: 6,
                        runSpacing: 6,
                        children: [
                          DTag(AccessLevels.nameOf(member.accessLevel)),
                          if (venture != null)
                            DTag.venture(
                              venture.name,
                              color: _ventureColor(venture),
                            ),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: NebulaSpacing.lg),
            const SectionHeader('Details'),
            _InfoRow(
              icon: LucideIcons.hash,
              label: 'Employee ID',
              value: member.employeeId,
              mono: true,
            ),
            _InfoRow(
              icon: LucideIcons.mail,
              label: 'Email',
              value: member.email,
            ),
            if (member.phone != null && member.phone!.isNotEmpty)
              _InfoRow(
                icon: LucideIcons.phone,
                label: 'Phone',
                value: member.phone!,
                mono: true,
              ),
            if (member.department != null && member.department!.isNotEmpty)
              _InfoRow(
                icon: LucideIcons.building2,
                label: 'Department',
                value: member.department!,
              ),
            if (member.designation != null && member.designation!.isNotEmpty)
              _InfoRow(
                icon: LucideIcons.briefcase,
                label: 'Designation',
                value: member.designation!,
              ),
            _InfoRow(
              icon: LucideIcons.shieldCheck,
              label: 'Access level',
              // Level 1 is the most access, 9 the least — the number is shown
              // alongside the name so the ordering is never guessed at.
              value: 'L${member.accessLevel} · '
                  '${AccessLevels.nameOf(member.accessLevel)}',
              mono: true,
            ),

            // Actions the backend will accept. Hidden, never disabled — a
            // greyed-out button is an invitation to file a support ticket.
            PermissionGate(
              permission: Permission.manageTeam,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const SizedBox(height: NebulaSpacing.lg),
                  const SectionHeader('Manage'),
                  Row(
                    children: [
                      Expanded(
                        child: FilledButton.icon(
                          onPressed: () => showDialog<void>(
                            context: context,
                            builder: (_) => _EditLevelDialog(member: member),
                          ),
                          icon: const Icon(LucideIcons.shieldCheck, size: 15),
                          label: const Text('Edit level'),
                        ),
                      ),
                      // `DELETE /api/team-members/:id` is requireLevel(3), one
                      // step above manageTeam — so removal is gated on the
                      // stricter of the two rather than 403-ing a CXO.
                      PermissionGate(
                        permission: Permission.deleteUser,
                        child: Row(
                          children: [
                            const SizedBox(width: NebulaSpacing.sm),
                            Expanded(
                              child: _RemoveButton(member: member),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _RemoveButton extends ConsumerWidget {
  const _RemoveButton({required this.member});

  final User member;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final dl = context.dl;

    return OutlinedButton.icon(
      onPressed: () => _confirm(context, ref),
      icon: const Icon(LucideIcons.userMinus, size: 15),
      label: const Text('Remove'),
      style: OutlinedButton.styleFrom(
        foregroundColor: dl.critical,
        side: BorderSide(color: dl.critical.withValues(alpha: 0.5)),
      ),
    );
  }

  Future<void> _confirm(BuildContext context, WidgetRef ref) async {
    final messenger = ScaffoldMessenger.of(context);
    final navigator = Navigator.of(context);

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Remove member?'),
        content: Text(
          '${member.fullName} loses access to the platform immediately. '
          'This cannot be undone from here.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            style: FilledButton.styleFrom(
              backgroundColor: dialogContext.dl.critical,
            ),
            onPressed: () => Navigator.pop(dialogContext, true),
            child: const Text('Remove'),
          ),
        ],
      ),
    );
    if (confirmed != true) return;

    try {
      await ref.read(teamDataSourceProvider).removeMember(member.id);
      ref.invalidate(teamMembersProvider);
      navigator.pop();
    } catch (e) {
      // The previous version swallowed this in an empty catch, so a failed
      // removal looked exactly like a successful one.
      messenger.showSnackBar(SnackBar(content: Text(readableError(e))));
    }
  }
}

class _InfoRow extends StatelessWidget {
  const _InfoRow({
    required this.icon,
    required this.label,
    required this.value,
    this.mono = false,
  });

  final IconData icon;
  final String label;
  final String value;
  final bool mono;

  @override
  Widget build(BuildContext context) {
    final dl = context.dl;

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 15, color: dl.textTertiary),
          const SizedBox(width: 10),
          SizedBox(
            width: 104,
            child: Text(
              label,
              style: context.text.bodySmall?.copyWith(color: dl.textTertiary),
            ),
          ),
          Expanded(
            child: mono
                ? Mono(value, size: 12)
                : Text(
                    value,
                    style: context.text.bodyMedium?.copyWith(
                      color: context.scheme.onSurface,
                    ),
                  ),
          ),
        ],
      ),
    );
  }
}

// ── Edit level dialog ─────────────────────────────────────────────────────────

class _EditLevelDialog extends ConsumerStatefulWidget {
  const _EditLevelDialog({required this.member});

  final User member;

  @override
  ConsumerState<_EditLevelDialog> createState() => _EditLevelDialogState();
}

class _EditLevelDialogState extends ConsumerState<_EditLevelDialog> {
  late int _selected = widget.member.accessLevel;
  bool _saving = false;

  /// Every level, most-privileged first. `atOrAbove(lowest)` walks 1 → 9,
  /// which is the order a human reads a rank ladder in.
  static final List<int> _levels = AccessLevels.atOrAbove(AccessLevels.lowest);

  Future<void> _save() async {
    final messenger = ScaffoldMessenger.of(context);
    final navigator = Navigator.of(context);

    setState(() => _saving = true);
    try {
      await ref
          .read(teamDataSourceProvider)
          .updateMemberLevel(widget.member.id, _selected);
      ref.invalidate(teamMembersProvider);
      navigator.pop(); // dialog
      navigator.pop(); // detail sheet
    } catch (e) {
      if (mounted) setState(() => _saving = false);
      messenger.showSnackBar(SnackBar(content: Text(readableError(e))));
    }
  }

  @override
  Widget build(BuildContext context) {
    final dl = context.dl;

    return AlertDialog(
      title: const Text('Access level'),
      content: SizedBox(
        width: double.maxFinite,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              'Level 1 carries the most access, level 9 the least.',
              style: context.text.bodySmall,
            ),
            const SizedBox(height: NebulaSpacing.sm),
            Flexible(
              child: RadioGroup<int>(
                groupValue: _selected,
                onChanged: (v) => setState(() => _selected = v ?? _selected),
                child: ListView(
                  shrinkWrap: true,
                  children: [
                    for (final level in _levels)
                      RadioListTile<int>(
                        value: level,
                        dense: true,
                        contentPadding: EdgeInsets.zero,
                        title: Row(
                          children: [
                            Mono(
                              'L$level',
                              size: 11,
                              color: dl.textTertiary,
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Text(
                                AccessLevels.nameOf(level),
                                style: context.text.bodyMedium?.copyWith(
                                  color: context.scheme.onSurface,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: _saving ? null : () => Navigator.pop(context),
          child: const Text('Cancel'),
        ),
        FilledButton(
          onPressed: _saving ? null : _save,
          child: _saving
              ? SizedBox(
                  height: 15,
                  width: 15,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    color: context.scheme.onPrimary,
                  ),
                )
              : const Text('Save'),
        ),
      ],
    );
  }
}

/// Kept so the mono label import is meaningful to readers scanning the header:
/// section labels below the app bar use it via [SectionHeader].
// ignore: unused_element
TextStyle _monoLabel(BuildContext context) =>
    NebulaTypography.monoLabel(color: context.dl.textTertiary);
