class KeyResultModel {
  final int id;
  final String title;
  final double targetValue;
  final double currentValue;
  final String? unit;

  KeyResultModel({
    required this.id,
    required this.title,
    required this.targetValue,
    required this.currentValue,
    this.unit,
  });

  factory KeyResultModel.fromJson(Map<String, dynamic> json) {
    return KeyResultModel(
      id: json['id'] as int? ?? 0,
      title: json['title'] as String? ?? '',
      targetValue: (json['targetValue'] ?? json['target_value'] ?? 0).toDouble(),
      currentValue: (json['currentValue'] ?? json['current_value'] ?? 0).toDouble(),
      unit: json['unit'] as String?,
    );
  }

  double get progress =>
      targetValue > 0 ? (currentValue / targetValue).clamp(0.0, 1.0) : 0.0;
}

class OKRModel {
  final int id;
  final String title;
  final String? description;
  final int progress;
  final String? quarter;
  final int? year;
  final String status;
  final String? ownerName;
  final List<KeyResultModel> keyResults;

  OKRModel({
    required this.id,
    required this.title,
    this.description,
    required this.progress,
    this.quarter,
    this.year,
    required this.status,
    this.ownerName,
    required this.keyResults,
  });

  factory OKRModel.fromJson(Map<String, dynamic> json) {
    final krList = (json['keyResults'] ?? json['key_results'] ?? []) as List;
    return OKRModel(
      id: json['id'] as int? ?? 0,
      title: json['title'] as String? ?? '',
      description: json['description'] as String?,
      progress: (json['progress'] ?? 0) as int,
      quarter: json['quarter'] as String?,
      year: json['year'] as int?,
      status: json['status'] as String? ?? 'active',
      ownerName: json['ownerName'] ?? json['owner_name'] as String?,
      keyResults: krList.map((k) => KeyResultModel.fromJson(k as Map<String, dynamic>)).toList(),
    );
  }
}

class StrategicRiskModel {
  final int id;
  final String title;
  final String? description;
  final String severity;
  final String status;
  final String? mitigation;

  StrategicRiskModel({
    required this.id,
    required this.title,
    this.description,
    required this.severity,
    required this.status,
    this.mitigation,
  });

  factory StrategicRiskModel.fromJson(Map<String, dynamic> json) {
    return StrategicRiskModel(
      id: json['id'] as int? ?? 0,
      title: json['title'] as String? ?? '',
      description: json['description'] as String?,
      severity: json['severity'] as String? ?? 'low',
      status: json['status'] as String? ?? 'open',
      mitigation: json['mitigation'] as String?,
    );
  }
}

class StrategyData {
  final List<OKRModel> okrs;
  final List<StrategicRiskModel> risks;

  StrategyData({required this.okrs, required this.risks});
}
