import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/layout/main_layout_screen.dart';
import '../../../../core/rbac/permissions.dart';
import '../../../../core/rbac/rbac_widgets.dart';
import '../../../../core/theme/nebula_spacing.dart';
import '../../../../core/theme/nebula_typography.dart';
import '../../../../core/theme/theme_context.dart';
import '../../../../core/widgets/motion.dart';
import '../../../../core/widgets/state_views.dart';

/// Everything that is not one of the five tabs.
///
/// Deliberately driven by the same `drawerSections` map the drawer uses, so
/// the two can never disagree about what exists or who may see it. Previously
/// they were separate hand-maintained lists, and they had already drifted:
/// the drawer offered entries that did nothing while Workspace offered tiles
/// the drawer had never heard of.
class WorkspaceScreen extends ConsumerWidget {
  const WorkspaceScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(currentUserProvider);

    final sections = [
      for (final s in drawerSections)
        (
          title: s.title,
          links: s.links
              .where((l) => l.permission == null || Rbac.can(user, l.permission!))
              .toList(),
        )
    ].where((s) => s.links.isNotEmpty).toList();

    return Scaffold(
      appBar: AppBar(title: const Text('Workspace')),
      body: sections.isEmpty
          ? const EmptyStateView(
              title: 'Nothing here yet',
              message:
                  'Your account does not have access to any additional modules.',
            )
          : ListView(
              padding: const EdgeInsets.fromLTRB(
                NebulaSpacing.md,
                NebulaSpacing.sm,
                NebulaSpacing.md,
                NebulaSpacing.xxl,
              ),
              children: [
                for (var s = 0; s < sections.length; s++) ...[
                  if (s > 0) const SizedBox(height: NebulaSpacing.lg),
                  Padding(
                    padding: const EdgeInsets.only(bottom: NebulaSpacing.sm),
                    child: Text(
                      sections[s].title.toUpperCase(),
                      style: NebulaTypography.monoLabel(
                        color: context.dl.textTertiary,
                      ),
                    ),
                  ),
                  GridView.count(
                    crossAxisCount: 2,
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    mainAxisSpacing: NebulaSpacing.sm,
                    crossAxisSpacing: NebulaSpacing.sm,
                    childAspectRatio: 1.55,
                    children: [
                      for (var i = 0; i < sections[s].links.length; i++)
                        StaggerIn(
                          index: i,
                          child: _Tile(link: sections[s].links[i]),
                        ),
                    ],
                  ),
                ],
              ],
            ),
    );
  }
}

class _Tile extends StatelessWidget {
  const _Tile({required this.link});

  final DrawerLink link;

  @override
  Widget build(BuildContext context) {
    final dl = context.dl;

    return PressScale(
      onTap: () => context.push(link.route),
      child: Container(
        padding: const EdgeInsets.all(13),
        decoration: BoxDecoration(
          color: context.scheme.surfaceContainerHighest,
          borderRadius: BorderRadius.circular(NebulaSpacing.radiusMd),
          border: Border.all(color: dl.border),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Icon(link.icon, size: 20, color: context.scheme.primary),
            Text(
              link.label,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: context.text.titleSmall,
            ),
          ],
        ),
      ),
    );
  }
}
