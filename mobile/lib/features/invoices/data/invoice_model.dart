/// Models for `GET /api/invoices` and `GET /api/invoices/:id`.
///
/// Invoices are derived server-side from *approved* timesheets grouped by
/// venture and month (see `backend/src/controllers/invoice.controller.js`), so
/// every field below maps 1:1 onto a key the controller actually emits.
library;

/// Safely coerces the numeric values Postgres returns, which arrive as either a
/// JSON number or a decimal string depending on the column type.
double _toDouble(dynamic value) {
  if (value is num) return value.toDouble();
  if (value is String) return double.tryParse(value) ?? 0;
  return 0;
}

/// One row of `GET /api/invoices`.
class InvoiceSummary {
  final String id;
  final String invoiceNumber;
  final int? ventureId;
  final String ventureName;

  /// `YYYY-MM` billing period.
  final String month;
  final double totalHours;
  final double totalAmount;
  final String status;
  final String issueDate;

  const InvoiceSummary({
    required this.id,
    required this.invoiceNumber,
    required this.ventureId,
    required this.ventureName,
    required this.month,
    required this.totalHours,
    required this.totalAmount,
    required this.status,
    required this.issueDate,
  });

  factory InvoiceSummary.fromJson(Map<String, dynamic> json) {
    return InvoiceSummary(
      id: json['id']?.toString() ?? '',
      invoiceNumber: json['invoice_number']?.toString() ?? '',
      ventureId: json['venture_id'] is int
          ? json['venture_id'] as int
          : int.tryParse(json['venture_id']?.toString() ?? ''),
      ventureName: json['venture_name']?.toString() ?? '',
      month: json['month']?.toString() ?? '',
      totalHours: _toDouble(json['total_hours']),
      totalAmount: _toDouble(json['total_amount']),
      status: json['status']?.toString() ?? '',
      issueDate: json['issue_date']?.toString() ?? '',
    );
  }
}

/// A single billed timesheet entry inside an invoice.
class InvoiceLineItem {
  final int? id;
  final String date;
  final String developer;
  final String project;

  /// Task title, or the timesheet note when the entry has no linked task.
  /// Null when the timesheet carried neither.
  final String? task;
  final double hours;
  final double amount;

  const InvoiceLineItem({
    required this.id,
    required this.date,
    required this.developer,
    required this.project,
    required this.task,
    required this.hours,
    required this.amount,
  });

  factory InvoiceLineItem.fromJson(Map<String, dynamic> json) {
    final task = json['task']?.toString();
    return InvoiceLineItem(
      id: json['id'] is int
          ? json['id'] as int
          : int.tryParse(json['id']?.toString() ?? ''),
      date: json['date']?.toString() ?? '',
      developer: json['developer']?.toString() ?? '',
      project: json['project']?.toString() ?? '',
      task: (task == null || task.isEmpty) ? null : task,
      hours: _toDouble(json['hours']),
      amount: _toDouble(json['amount']),
    );
  }
}

/// Response body of `GET /api/invoices/:id`.
class InvoiceDetail {
  final String id;
  final String invoiceNumber;
  final String month;
  final String ventureName;
  final List<InvoiceLineItem> items;
  final double totalHours;
  final double totalAmount;
  final double billingRate;
  final String issueDate;
  final String dueDate;

  const InvoiceDetail({
    required this.id,
    required this.invoiceNumber,
    required this.month,
    required this.ventureName,
    required this.items,
    required this.totalHours,
    required this.totalAmount,
    required this.billingRate,
    required this.issueDate,
    required this.dueDate,
  });

  factory InvoiceDetail.fromJson(Map<String, dynamic> json) {
    final rawItems = json['items'];
    return InvoiceDetail(
      id: json['id']?.toString() ?? '',
      invoiceNumber: json['invoice_number']?.toString() ?? '',
      month: json['month']?.toString() ?? '',
      ventureName: json['venture_name']?.toString() ?? '',
      items: rawItems is List
          ? rawItems
              .whereType<Map<String, dynamic>>()
              .map(InvoiceLineItem.fromJson)
              .toList()
          : const <InvoiceLineItem>[],
      totalHours: _toDouble(json['total_hours']),
      totalAmount: _toDouble(json['total_amount']),
      billingRate: _toDouble(json['billing_rate']),
      issueDate: json['issue_date']?.toString() ?? '',
      dueDate: json['due_date']?.toString() ?? '',
    );
  }
}
