import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../../../core/theme/nebula_spacing.dart';
import 'state_views.dart';

/// One labelled value in a chart series.
class ChartDatum {
  final String label;
  final double value;

  /// Optional brand colour supplied by the API. Null means "use the theme".
  final Color? color;

  const ChartDatum({required this.label, required this.value, this.color});
}

/// A titled panel that every chart on the Reports screen sits inside.
class ReportCard extends StatelessWidget {
  final String title;
  final String subtitle;
  final Widget child;

  const ReportCard({
    super.key,
    required this.title,
    required this.subtitle,
    required this.child,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(NebulaSpacing.md),
      decoration: BoxDecoration(
        color: cardSurface(context),
        borderRadius: BorderRadius.circular(NebulaSpacing.radiusMd),
        border: Border.all(color: hairline(context)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: Theme.of(context).textTheme.titleSmall),
          const SizedBox(height: 2),
          Text(
            subtitle,
            style: Theme.of(context)
                .textTheme
                .labelSmall
                ?.copyWith(color: textSecondary(context)),
          ),
          const SizedBox(height: NebulaSpacing.md),
          child,
        ],
      ),
    );
  }
}

/// A single-series column chart, drawn with [CustomPaint] like the existing
/// analytics charts so no extra charting dependency is pulled in.
class ColumnChart extends StatelessWidget {
  final List<ChartDatum> data;
  final double height;

  /// Screen-reader sentence describing the series.
  final String semanticsLabel;

  const ColumnChart({
    super.key,
    required this.data,
    required this.semanticsLabel,
    this.height = 200,
  });

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Semantics(
      label: semanticsLabel,
      image: true,
      child: ExcludeSemantics(
        child: SizedBox(
          height: height,
          width: double.infinity,
          child: CustomPaint(
            painter: _ColumnChartPainter(
              data: data,
              barColor: scheme.primary,
              labelColor: textSecondary(context),
              valueColor: scheme.onSurface,
              gridColor: hairline(context),
              textDirection: Directionality.of(context),
            ),
          ),
        ),
      ),
    );
  }
}

class _ColumnChartPainter extends CustomPainter {
  final List<ChartDatum> data;
  final Color barColor;
  final Color labelColor;
  final Color valueColor;
  final Color gridColor;
  final TextDirection textDirection;

  _ColumnChartPainter({
    required this.data,
    required this.barColor,
    required this.labelColor,
    required this.valueColor,
    required this.gridColor,
    required this.textDirection,
  });

  @override
  void paint(Canvas canvas, Size size) {
    if (data.isEmpty) return;

    const labelHeight = 18.0;
    const valueHeight = 16.0;
    final maxValue = data.fold<double>(0, (m, d) => math.max(m, d.value));
    final plotHeight = size.height - labelHeight - valueHeight;
    if (plotHeight <= 0) return;

    // Baseline
    canvas.drawLine(
      Offset(0, size.height - labelHeight),
      Offset(size.width, size.height - labelHeight),
      Paint()
        ..color = gridColor
        ..strokeWidth = 1,
    );

    final slot = size.width / data.length;
    final barWidth = math.min(slot * 0.55, 42.0);
    final painter = TextPainter(textDirection: textDirection);

    for (var i = 0; i < data.length; i++) {
      final datum = data[i];
      final fraction = maxValue <= 0 ? 0.0 : datum.value / maxValue;
      final barHeight = fraction * plotHeight;
      final centreX = slot * i + slot / 2;
      final top = size.height - labelHeight - barHeight;

      if (barHeight > 0) {
        canvas.drawRRect(
          RRect.fromRectAndCorners(
            Rect.fromLTWH(centreX - barWidth / 2, top, barWidth, barHeight),
            topLeft: const Radius.circular(6),
            topRight: const Radius.circular(6),
          ),
          Paint()..color = datum.color ?? barColor,
        );
      }

      // Value above the bar
      painter
        ..text = TextSpan(
          text: _formatValue(datum.value),
          style: TextStyle(
              color: valueColor, fontSize: 11, fontWeight: FontWeight.w600),
        )
        ..layout(maxWidth: slot)
        ..paint(canvas,
            Offset(centreX - painter.width / 2, top - valueHeight + 2));

      // Category label below the baseline
      painter
        ..text = TextSpan(
          text: datum.label,
          style: TextStyle(color: labelColor, fontSize: 10),
        )
        ..layout(maxWidth: slot)
        ..paint(canvas,
            Offset(centreX - painter.width / 2, size.height - labelHeight + 4));
    }
  }

  @override
  bool shouldRepaint(_ColumnChartPainter old) =>
      old.data != data ||
      old.barColor != barColor ||
      old.labelColor != labelColor ||
      old.valueColor != valueColor ||
      old.gridColor != gridColor;
}

/// Two-series column chart (e.g. completed tasks vs completed projects).
class GroupedColumnChart extends StatelessWidget {
  final List<String> categories;
  final List<double> seriesA;
  final List<double> seriesB;
  final String seriesALabel;
  final String seriesBLabel;
  final String semanticsLabel;
  final double height;

  const GroupedColumnChart({
    super.key,
    required this.categories,
    required this.seriesA,
    required this.seriesB,
    required this.seriesALabel,
    required this.seriesBLabel,
    required this.semanticsLabel,
    this.height = 200,
  });

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Semantics(
          label: semanticsLabel,
          image: true,
          child: ExcludeSemantics(
            child: SizedBox(
              height: height,
              width: double.infinity,
              child: CustomPaint(
                painter: _GroupedColumnPainter(
                  categories: categories,
                  seriesA: seriesA,
                  seriesB: seriesB,
                  colorA: scheme.primary,
                  colorB: scheme.secondary,
                  labelColor: textSecondary(context),
                  gridColor: hairline(context),
                  textDirection: Directionality.of(context),
                ),
              ),
            ),
          ),
        ),
        const SizedBox(height: NebulaSpacing.sm),
        Wrap(
          spacing: NebulaSpacing.md,
          runSpacing: NebulaSpacing.xs,
          children: [
            ChartLegendSwatch(color: scheme.primary, label: seriesALabel),
            ChartLegendSwatch(color: scheme.secondary, label: seriesBLabel),
          ],
        ),
      ],
    );
  }
}

class _GroupedColumnPainter extends CustomPainter {
  final List<String> categories;
  final List<double> seriesA;
  final List<double> seriesB;
  final Color colorA;
  final Color colorB;
  final Color labelColor;
  final Color gridColor;
  final TextDirection textDirection;

  _GroupedColumnPainter({
    required this.categories,
    required this.seriesA,
    required this.seriesB,
    required this.colorA,
    required this.colorB,
    required this.labelColor,
    required this.gridColor,
    required this.textDirection,
  });

  @override
  void paint(Canvas canvas, Size size) {
    if (categories.isEmpty) return;

    const labelHeight = 18.0;
    final plotHeight = size.height - labelHeight;
    if (plotHeight <= 0) return;

    final maxValue = [
      ...seriesA,
      ...seriesB,
    ].fold<double>(0, (m, v) => math.max(m, v));

    canvas.drawLine(
      Offset(0, size.height - labelHeight),
      Offset(size.width, size.height - labelHeight),
      Paint()
        ..color = gridColor
        ..strokeWidth = 1,
    );

    final slot = size.width / categories.length;
    final barWidth = math.min(slot * 0.28, 22.0);
    final painter = TextPainter(textDirection: textDirection);

    for (var i = 0; i < categories.length; i++) {
      final centreX = slot * i + slot / 2;
      final values = <double>[
        i < seriesA.length ? seriesA[i] : 0,
        i < seriesB.length ? seriesB[i] : 0,
      ];
      final colors = <Color>[colorA, colorB];

      for (var s = 0; s < values.length; s++) {
        final fraction = maxValue <= 0 ? 0.0 : values[s] / maxValue;
        final barHeight = fraction * (plotHeight - 8);
        if (barHeight <= 0) continue;
        final left = centreX + (s == 0 ? -barWidth - 2 : 2);
        canvas.drawRRect(
          RRect.fromRectAndCorners(
            Rect.fromLTWH(left, size.height - labelHeight - barHeight, barWidth,
                barHeight),
            topLeft: const Radius.circular(4),
            topRight: const Radius.circular(4),
          ),
          Paint()..color = colors[s],
        );
      }

      painter
        ..text = TextSpan(
          text: categories[i],
          style: TextStyle(color: labelColor, fontSize: 10),
        )
        ..layout(maxWidth: slot)
        ..paint(canvas,
            Offset(centreX - painter.width / 2, size.height - labelHeight + 4));
    }
  }

  @override
  bool shouldRepaint(_GroupedColumnPainter old) =>
      old.categories != categories ||
      old.seriesA != seriesA ||
      old.seriesB != seriesB ||
      old.colorA != colorA ||
      old.colorB != colorB ||
      old.labelColor != labelColor ||
      old.gridColor != gridColor;
}

/// Donut chart plus a legend listing each slice's real value.
class DonutChart extends StatelessWidget {
  final List<ChartDatum> data;
  final String semanticsLabel;
  final String centreLabel;
  final String centreValue;

  const DonutChart({
    super.key,
    required this.data,
    required this.semanticsLabel,
    required this.centreLabel,
    required this.centreValue,
  });

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final palette = <Color>[
      scheme.primary,
      scheme.secondary,
      scheme.tertiary,
      scheme.error,
      scheme.primary.withValues(alpha: 0.55),
      scheme.secondary.withValues(alpha: 0.55),
    ];
    final resolved = <Color>[
      for (var i = 0; i < data.length; i++)
        data[i].color ?? palette[i % palette.length],
    ];

    return Column(
      children: [
        Semantics(
          label: semanticsLabel,
          image: true,
          child: ExcludeSemantics(
            child: SizedBox(
              height: 180,
              width: 180,
              child: Stack(
                alignment: Alignment.center,
                children: [
                  CustomPaint(
                    size: const Size(180, 180),
                    painter: _DonutPainter(
                      values: data.map((d) => d.value).toList(),
                      colors: resolved,
                      trackColor: mutedSurface(context),
                    ),
                  ),
                  Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(centreValue,
                          style: Theme.of(context).textTheme.titleLarge),
                      Text(
                        centreLabel,
                        style: Theme.of(context)
                            .textTheme
                            .labelSmall
                            ?.copyWith(color: textSecondary(context)),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ),
        const SizedBox(height: NebulaSpacing.md),
        Wrap(
          spacing: NebulaSpacing.md,
          runSpacing: NebulaSpacing.xs,
          alignment: WrapAlignment.center,
          children: [
            for (var i = 0; i < data.length; i++)
              ChartLegendSwatch(
                color: resolved[i],
                label: '${data[i].label} · ${_formatValue(data[i].value)}',
              ),
          ],
        ),
      ],
    );
  }
}

class _DonutPainter extends CustomPainter {
  final List<double> values;
  final List<Color> colors;
  final Color trackColor;

  _DonutPainter({
    required this.values,
    required this.colors,
    required this.trackColor,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final centre = Offset(size.width / 2, size.height / 2);
    final radius = math.min(size.width, size.height) / 2 - 8;
    const strokeWidth = 26.0;
    final rect = Rect.fromCircle(center: centre, radius: radius);

    canvas.drawCircle(
      centre,
      radius,
      Paint()
        ..color = trackColor
        ..style = PaintingStyle.stroke
        ..strokeWidth = strokeWidth,
    );

    final total = values.fold<double>(0, (sum, v) => sum + v);
    if (total <= 0) return;

    var startAngle = -math.pi / 2;
    for (var i = 0; i < values.length; i++) {
      final sweep = (values[i] / total) * math.pi * 2;
      if (sweep <= 0) continue;
      canvas.drawArc(
        rect,
        startAngle,
        sweep,
        false,
        Paint()
          ..color = colors[i % colors.length]
          ..style = PaintingStyle.stroke
          ..strokeWidth = strokeWidth,
      );
      startAngle += sweep;
    }
  }

  @override
  bool shouldRepaint(_DonutPainter old) =>
      old.values != values ||
      old.colors != colors ||
      old.trackColor != trackColor;
}

/// Coloured square plus caption, used by the chart legends.
class ChartLegendSwatch extends StatelessWidget {
  final Color color;
  final String label;

  const ChartLegendSwatch({super.key, required this.color, required this.label});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 10,
          height: 10,
          decoration: BoxDecoration(
            color: color,
            borderRadius: BorderRadius.circular(3),
          ),
        ),
        const SizedBox(width: NebulaSpacing.xs + 2),
        Text(
          label,
          style: Theme.of(context)
              .textTheme
              .labelSmall
              ?.copyWith(color: textSecondary(context)),
        ),
      ],
    );
  }
}

/// Horizontal proportional bar, used for the per-venture budget split.
class ProportionBar extends StatelessWidget {
  final String label;
  final String valueLabel;
  final double fraction;
  final Color color;

  const ProportionBar({
    super.key,
    required this.label,
    required this.valueLabel,
    required this.fraction,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label: '$label: $valueLabel',
      child: ExcludeSemantics(
        child: Padding(
          padding: const EdgeInsets.only(bottom: NebulaSpacing.sm + 4),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(label,
                        style: Theme.of(context).textTheme.bodySmall,
                        overflow: TextOverflow.ellipsis),
                  ),
                  const SizedBox(width: NebulaSpacing.sm),
                  Text(valueLabel,
                      style: Theme.of(context).textTheme.labelSmall?.copyWith(
                            color: color,
                            fontWeight: FontWeight.w700,
                          )),
                ],
              ),
              const SizedBox(height: NebulaSpacing.xs + 2),
              ClipRRect(
                borderRadius: BorderRadius.circular(4),
                child: LinearProgressIndicator(
                  value: fraction.clamp(0.0, 1.0),
                  minHeight: 6,
                  backgroundColor: mutedSurface(context),
                  valueColor: AlwaysStoppedAnimation<Color>(color),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Renders whole numbers without a trailing `.0`.
String _formatValue(double value) {
  if (value == value.roundToDouble()) return value.toStringAsFixed(0);
  return value.toStringAsFixed(1);
}
