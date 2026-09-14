import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import 'state_views.dart';

/// Renders a query/table result as a horizontally- and vertically-scrollable
/// grid. Every value is stringified defensively since a raw SQL result can
/// contain any Postgres type (numbers, booleans, timestamps, null, nested
/// json).
class ResultTable extends StatelessWidget {
  final List<String> columns;
  final List<Map<String, dynamic>> rows;

  const ResultTable({super.key, required this.columns, required this.rows});

  String _cell(dynamic value) {
    if (value == null) return '—';
    if (value is bool) return value ? 'true' : 'false';
    return value.toString();
  }

  @override
  Widget build(BuildContext context) {
    if (columns.isEmpty || rows.isEmpty) {
      return const EmptyStateView(
        icon: LucideIcons.table2,
        title: 'No rows',
        message: 'This query returned no rows.',
      );
    }

    return Scrollbar(
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: SingleChildScrollView(
          child: DataTable(
            headingRowColor: WidgetStateProperty.all(mutedSurface(context)),
            columns: [
              for (final column in columns)
                DataColumn(
                  label: Text(column,
                      style: Theme.of(context).textTheme.labelSmall?.copyWith(
                            fontWeight: FontWeight.w700,
                          )),
                ),
            ],
            rows: [
              for (final row in rows)
                DataRow(
                  cells: [
                    for (final column in columns)
                      DataCell(
                        ConstrainedBox(
                          constraints: const BoxConstraints(maxWidth: 220),
                          child: Text(
                            _cell(row[column]),
                            style: Theme.of(context).textTheme.bodySmall,
                            overflow: TextOverflow.ellipsis,
                            maxLines: 2,
                          ),
                        ),
                      ),
                  ],
                ),
            ],
          ),
        ),
      ),
    );
  }
}
