import 'package:freezed_annotation/freezed_annotation.dart';

part 'analytics_model.freezed.dart';
part 'analytics_model.g.dart';

@freezed
class AnalyticsReport with _$AnalyticsReport {
  const factory AnalyticsReport({
    required OverviewStats overview,
    required List<DailyTaskData> dailyTasks,
    required List<VentureTaskData> ventures,
  }) = _AnalyticsReport;

  factory AnalyticsReport.fromJson(Map<String, dynamic> json) =>
      _$AnalyticsReportFromJson(json);
}

@freezed
class OverviewStats with _$OverviewStats {
  const factory OverviewStats({
    required int totalTasks,
    required int completedTasks,
    required double completionRate,
    required int activeProjects,
    required String dateRange,
  }) = _OverviewStats;

  factory OverviewStats.fromJson(Map<String, dynamic> json) =>
      _$OverviewStatsFromJson(json);
}

@freezed
class DailyTaskData with _$DailyTaskData {
  const factory DailyTaskData({
    required String date,
    required int count,
  }) = _DailyTaskData;

  factory DailyTaskData.fromJson(Map<String, dynamic> json) =>
      _$DailyTaskDataFromJson(json);
}

@freezed
class VentureTaskData with _$VentureTaskData {
  const factory VentureTaskData({
    required String ventureName,
    required int taskCount,
    required int completedCount,
    required double completionPercentage,
  }) = _VentureTaskData;

  factory VentureTaskData.fromJson(Map<String, dynamic> json) =>
      _$VentureTaskDataFromJson(json);
}

@freezed
class TaskVelocityPoint with _$TaskVelocityPoint {
  const factory TaskVelocityPoint({
    required String date,
    required int cumulativeCount,
    required String priorityLevel,
  }) = _TaskVelocityPoint;

  factory TaskVelocityPoint.fromJson(Map<String, dynamic> json) =>
      _$TaskVelocityPointFromJson(json);
}
