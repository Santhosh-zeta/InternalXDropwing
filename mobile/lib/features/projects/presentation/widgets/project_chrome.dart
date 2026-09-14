import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../../../core/theme/nebula_colors.dart';
import '../../../../core/theme/theme_context.dart';
import '../../../../core/widgets/primitives.dart';
import '../../data/models/project_models.dart';

/// Project classification, in one place, so the list and the detail screen
/// render the same record the same way.

/// The venture colour the API sent with the project, falling back to the
/// stable per-venture colour when the join returned no hex.
Color projectVentureColor(ProjectModel project) => NebulaColors.parseHex(
      project.ventureColor,
      fallback: NebulaColors.forVentureId(project.ventureId),
    );

/// Finished and shelved work recedes; a project past its end date reads
/// critical; everything else is ordinary upcoming work.
TimeState projectTimeState(ProjectModel project) {
  if (project.isCompleted || project.isArchived) return TimeState.past;
  final end = parseApiDate(project.endDate);
  if (end != null && end.isBefore(DateTime.now())) return TimeState.overdue;
  return TimeState.next;
}

String projectStatusLabel(String status) {
  switch (status) {
    case 'on-hold':
      return 'On hold';
    case 'active':
      return 'Active';
    case 'planning':
      return 'Planning';
    case 'completed':
      return 'Completed';
    case 'archived':
      return 'Archived';
    default:
      return status;
  }
}

DTone projectStatusTone(String status) {
  switch (status) {
    case 'completed':
      return DTone.ok;
    case 'active':
      return DTone.accent;
    case 'on-hold':
      return DTone.warn;
    default:
      return DTone.neutral;
  }
}

DTone projectPriorityTone(String priority) {
  switch (priority.toLowerCase()) {
    case 'urgent':
    case 'high':
      return DTone.critical;
    case 'medium':
      return DTone.warn;
    default:
      return DTone.neutral;
  }
}

/// Milestone status arrives as 'pending' / 'in_progress' / 'completed'.
bool isMilestoneDone(ProjectMilestone milestone) {
  final s = milestone.status.toLowerCase();
  return s == 'completed' || s == 'done';
}

TimeState milestoneTimeState(ProjectMilestone milestone) {
  if (isMilestoneDone(milestone)) return TimeState.past;
  final due = parseApiDate(milestone.dueDate);
  if (due != null && due.isBefore(DateTime.now())) return TimeState.overdue;
  return TimeState.next;
}

/// The project API sends dates as strings, and some rows carry none at all.
DateTime? parseApiDate(String? raw) {
  if (raw == null || raw.isEmpty) return null;
  return DateTime.tryParse(raw);
}

/// Formatted date, or null when there is nothing real to show.
String? formatApiDate(String? raw, {String pattern = 'd MMM yyyy'}) {
  final parsed = parseApiDate(raw);
  return parsed == null ? null : DateFormat(pattern).format(parsed);
}
