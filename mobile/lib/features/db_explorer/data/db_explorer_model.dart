/// Models for `backend/src/routes/database.routes.js` (`/api/database`).
/// Level 1 (Super Admin) only — this executes arbitrary SQL against
/// production.
library;

/// One column descriptor from `GET /api/database/table/:name`
/// (`SELECT column_name as Field, data_type as Type ...`).
class TableColumn {
  final String field;
  final String type;

  const TableColumn({required this.field, required this.type});

  factory TableColumn.fromJson(Map<String, dynamic> json) {
    return TableColumn(
      field: json['Field']?.toString() ?? json['field']?.toString() ?? '',
      type: json['Type']?.toString() ?? json['type']?.toString() ?? '',
    );
  }
}

/// The full response of `GET /api/database/table/:name`.
class TablePreview {
  final List<TableColumn> columns;
  final List<Map<String, dynamic>> rows;
  final int totalCount;

  const TablePreview({
    required this.columns,
    required this.rows,
    required this.totalCount,
  });

  factory TablePreview.fromJson(Map<String, dynamic> json) {
    final rawColumns = json['columns'];
    final rawRows = json['rows'];
    final rawTotal = json['totalCount'];

    int total;
    if (rawTotal is num) {
      total = rawTotal.round();
    } else {
      total = int.tryParse(rawTotal?.toString() ?? '') ?? 0;
    }

    return TablePreview(
      columns: rawColumns is List
          ? rawColumns
              .whereType<Map<String, dynamic>>()
              .map(TableColumn.fromJson)
              .toList()
          : const <TableColumn>[],
      rows: rawRows is List
          ? rawRows.whereType<Map<String, dynamic>>().toList()
          : const <Map<String, dynamic>>[],
      totalCount: total,
    );
  }
}

/// The response of `POST /api/database/query`.
class QueryResult {
  final List<Map<String, dynamic>> results;
  final List<String> fields;

  const QueryResult({required this.results, required this.fields});

  factory QueryResult.fromJson(Map<String, dynamic> json) {
    final rawResults = json['results'];
    final rawFields = json['fields'];
    return QueryResult(
      results: rawResults is List
          ? rawResults.whereType<Map<String, dynamic>>().toList()
          : const <Map<String, dynamic>>[],
      fields: rawFields is List ? rawFields.map((f) => f.toString()).toList() : const <String>[],
    );
  }
}
