import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../providers/home_provider.dart';
import '../../../auth/presentation/providers/auth_provider.dart';
import '../../../../core/theme/nebula_colors.dart';
import '../widgets/dynamic_nebula_background.dart';
import '../widgets/greeting_section.dart';
import '../widgets/mission_control_layer.dart';
import '../widgets/nebula_hero_orb.dart';
import '../widgets/command_center_grid.dart';
import '../widgets/mission_board.dart';
import '../widgets/venture_galaxy.dart';
import '../widgets/venture_summary_section.dart';
import '../widgets/announcements_section.dart';
import '../widgets/live_activity_stream.dart';
import '../widgets/ai_executive_assistant.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../../projects/presentation/providers/projects_provider.dart';
import '../../../documents/presentation/providers/documents_provider.dart';

class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final homeDataAsync = ref.watch(homeDataProvider);
    final authState = ref.watch(authProvider);
    final currentUser = authState.maybeWhen(
      authenticated: (user) => user,
      orElse: () => null,
    );

    if (currentUser == null) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }

    return Scaffold(
      backgroundColor: NebulaColors.background,
      extendBodyBehindAppBar: true,
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(LucideIcons.menu, color: NebulaColors.textPrimary),
          onPressed: () => Scaffold.of(context).openDrawer(),
        ),
        title: const Text(
          'DROPWING GROUP',
          style: TextStyle(
            fontWeight: FontWeight.bold, 
            letterSpacing: 2, 
            fontSize: 12,
            color: NebulaColors.textSecondary,
          ),
        ),
        centerTitle: true,
        actions: const [
          _NotificationBell(),
          Padding(
            padding: EdgeInsets.only(right: 16.0),
            child: CircleAvatar(
              radius: 16,
              backgroundColor: NebulaColors.surfaceCard,
              child: Icon(LucideIcons.user, size: 20, color: NebulaColors.primary),
            ),
          ),
        ],
        elevation: 0,
        backgroundColor: Colors.transparent,
      ),
      body: DynamicNebulaBackground(
        child: homeDataAsync.when(
          data: (data) {
            // Calculate today's mission data.
            //
            // Real task_status values are lowercase ('completed', not
            // 'Completed' — see 01_schema.sql); comparing against the wrong
            // case here used to make every completed high-priority task
            // count as still-critical forever.
            int critical = 0;
            for (var t in data.tasks) {
              if (t.priority.toLowerCase() == 'high' && t.status != 'completed') {
                critical++;
              }
            }
            int pendingProjects = 0;
            int runningProjects = 0;
            ref.watch(projectListProvider).whenData((projs) {
              runningProjects = projs.where((p) => p.isActive).length;
              // Projects that need a decision or a kickoff, not every
              // project (which used to include completed and archived ones).
              pendingProjects = projs.where((p) => p.isPending).length;
            });

            int documents = 0;
            ref.watch(documentsProvider).whenData((docs) {
              documents = docs.length;
            });

            // Real completion rate over this user's visible tasks — there is
            // no "organization health" figure anywhere in the API.
            final completedCount = data.tasks.where((t) => t.status == 'completed').length;
            final completionRate = data.tasks.isEmpty
                ? 0
                : ((completedCount / data.tasks.length) * 100).round();

            return RefreshIndicator(
              onRefresh: () async {
                ref.invalidate(homeDataProvider);
                ref.invalidate(unreadNotificationsProvider);
              },
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                child: Padding(
                  padding: EdgeInsets.only(
                    top: MediaQuery.of(context).padding.top + kToolbarHeight + 24.0,
                    left: 20.0,
                    right: 20.0,
                    bottom: 40.0,
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      GreetingSection(user: currentUser),
                      const SizedBox(height: 32),
                      
                      NebulaHeroOrb(
                        completionRate: completionRate,
                        activeVentures: data.analytics.userDistribution.length,
                        runningProjects: runningProjects,
                        openTasks: data.tasks.length,
                      ),
                      
                      const SizedBox(height: 32),
                      
                      MissionControlLayer(
                        criticalTasks: critical,
                        pendingProjects: pendingProjects,
                        documentsToApprove: documents,
                      ),
                      const SizedBox(height: 32),

                      const CommandCenterGrid(),
                      const SizedBox(height: 32),

                      // Company announcements (below Admin) and the
                      // cross-venture roll-up (Admin and above) are two
                      // halves of the same real data the API already
                      // returns — each renders nothing for the audience
                      // it isn't meant for.
                      AnnouncementsSection(data: data, accessLevel: currentUser.accessLevel),
                      VentureSummarySection(data: data, accessLevel: currentUser.accessLevel),
                      const SizedBox(height: 32),

                      VentureGalaxy(data: data),
                      const SizedBox(height: 32),
                      
                      MissionBoard(tasks: data.tasks),
                      const SizedBox(height: 32),
                      
                      LiveActivityStream(activities: data.analytics.recentActivity),
                      const SizedBox(height: 32),
                      
                      AiExecutiveAssistant(userName: currentUser.fullName),
                      const SizedBox(height: 40),
                    ],
                  ),
                ),
              ),
            );
          },
          loading: () => const Center(child: CircularProgressIndicator(color: NebulaColors.primary)),
          error: (error, stack) {
            if (error.toString().contains('401')) {
              return Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(LucideIcons.shieldAlert, size: 48, color: NebulaColors.critical),
                    const SizedBox(height: 16),
                    const Text('Session Expired', style: TextStyle(color: NebulaColors.textPrimary, fontSize: 18, fontWeight: FontWeight.bold)),
                    const SizedBox(height: 8),
                    const Text('Please log in again to continue.', style: TextStyle(color: NebulaColors.textSecondary)),
                    const SizedBox(height: 24),
                    ElevatedButton(
                      style: ElevatedButton.styleFrom(backgroundColor: NebulaColors.primary),
                      onPressed: () {
                        ref.read(authProvider.notifier).logout();
                      },
                      child: const Text('Log In Again', style: TextStyle(color: Colors.white)),
                    ),
                  ],
                ),
              );
            }
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(20.0),
                child: Text('Error: $error', style: const TextStyle(color: NebulaColors.critical)),
              ),
            );
          },
        ),
      ),
    );
  }
}

class _NotificationBell extends ConsumerWidget {
  const _NotificationBell();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return IconButton(
      icon: const Icon(LucideIcons.bell, color: NebulaColors.textPrimary),
      onPressed: () => context.push('/notifications'),
    );
  }
}

