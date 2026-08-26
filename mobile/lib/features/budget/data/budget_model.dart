class BudgetVentureBreakdown {
  final String name;
  final double amount;
  final double percentage;

  BudgetVentureBreakdown({
    required this.name,
    required this.amount,
    required this.percentage,
  });

  factory BudgetVentureBreakdown.fromJson(Map<String, dynamic> json) {
    return BudgetVentureBreakdown(
      name: json['name'] as String? ?? '',
      amount: (json['amount'] ?? json['spent'] ?? 0).toDouble(),
      percentage: (json['percentage'] ?? json['pct'] ?? 0).toDouble(),
    );
  }
}

class BudgetSummary {
  final double totalBudget;
  final double spent;
  final double remaining;
  final double utilizationPct;
  final List<BudgetVentureBreakdown> ventureBreakdown;

  BudgetSummary({
    required this.totalBudget,
    required this.spent,
    required this.remaining,
    required this.utilizationPct,
    required this.ventureBreakdown,
  });

  factory BudgetSummary.fromJson(Map<String, dynamic> json) {
    final vbList = (json['ventureBreakdown'] ?? json['venture_breakdown'] ?? json['ventures'] ?? []) as List;
    final total = (json['totalBudget'] ?? json['total_budget'] ?? json['total'] ?? 0).toDouble();
    final spentVal = (json['spent'] ?? json['totalSpent'] ?? json['total_spent'] ?? 0).toDouble();
    final remainVal = (json['remaining'] ?? (total - spentVal)).toDouble();
    final utilPct = total > 0
        ? (json['utilizationPct'] ?? json['utilization_pct'] ?? (spentVal / total * 100)).toDouble()
        : 0.0;
    return BudgetSummary(
      totalBudget: total,
      spent: spentVal,
      remaining: remainVal,
      utilizationPct: utilPct,
      ventureBreakdown: vbList.map((v) => BudgetVentureBreakdown.fromJson(v as Map<String, dynamic>)).toList(),
    );
  }
}

class ExpenseEntry {
  final int id;
  final String category;
  final double amount;
  final String date;
  final String? description;
  final String? ventureName;

  ExpenseEntry({
    required this.id,
    required this.category,
    required this.amount,
    required this.date,
    this.description,
    this.ventureName,
  });

  factory ExpenseEntry.fromJson(Map<String, dynamic> json) {
    return ExpenseEntry(
      id: json['id'] as int? ?? 0,
      category: json['category'] as String? ?? '',
      amount: (json['amount'] ?? 0).toDouble(),
      date: json['date'] ?? json['createdAt'] ?? json['created_at'] as String? ?? '',
      description: json['description'] as String?,
      ventureName: json['ventureName'] ?? json['venture_name'] ?? json['venture']?['name'] as String?,
    );
  }
}

class MonthlyBudget {
  final String month;
  final double target;
  final double actual;

  MonthlyBudget({
    required this.month,
    required this.target,
    required this.actual,
  });

  factory MonthlyBudget.fromJson(Map<String, dynamic> json) {
    return MonthlyBudget(
      month: json['month'] as String? ?? '',
      target: (json['target'] ?? json['budget'] ?? 0).toDouble(),
      actual: (json['actual'] ?? json['spent'] ?? 0).toDouble(),
    );
  }
}
