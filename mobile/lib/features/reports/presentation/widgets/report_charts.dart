import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../../../core/theme/nebula_colors.dart';
import '../../../../core/theme/nebula_spacing.dart';
import '../../../../core/theme/nebula_typography.dart';
import '../../../../core/theme/theme_context.dart';
import '../../../../core/widgets/primitives.dart';

/// The Reports chart kit.
///
/// These are the only real charts in the app and they stay hand-painted: a
/// charting package would bring its own palette, its own type and its own idea
/// of a card, and none of the three would match Dayline.
///
/// Two rules hold everywhere in this file:
///
///  * **No literal colours.** Bars, ticks, baselines and legends all resolve
///    through `context.scheme.*` / `context.dl.*`, or through a venture hex the
///    API actually sent, so every chart is legible on both grounds.
///  * **Every figure is mono.** Axis ticks, value labels and legend figures use
///    [NebulaTypography.mono] / [NebulaTypography.monoLabel], so a column of
///    numbers lines up and a changing value does not reflow its row.

/// Parses a `#RRGGBB` / `#AARRGGBB` colour the API sent on a venture record.
///
/// Returns `null` — rather than a guess — when the field is missing or
/// malformed, so the caller falls back to a theme colour instead of rendering
/// an invented brand colour.
Color? apiColor(String? hex) {
  if (hex == null) return null;
  var value = hex.trim().replaceFirst('#', '');
  if (value.isEmpty) return null;
  if (value.length == 6) value = 'FF$value';
  if (value.length != 8) return null;
  if (int.tryParse(value, radix: 16) == null) return null;
  return NebulaColors.parseHex(hex);
}

/// Categorical colours for slices that are not ventures carrying their own hex.
///
/// Drawn from the venture fallbacks, because every categorical series on this
/// screen *is* a venture split — using the semantic error/success colours as
/// chart categories would make hue mean two different things at once.
List<Color> _categoricalPalette(BuildContext context) => const [
      ...NebulaColors.ventureFallbacks,
    ];

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
    return DCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SectionHeader(title, padding: EdgeInsets.zero),
          const SizedBox(height: 2),
          Text(
            subtitle,
            style: context.text.bodySmall?.copyWith(
              color: context.dl.textTertiary,
            ),
          ),
          const SizedBox(height: NebulaSpacing.md),
          child,
        ],
      ),
    );
  }
}

/// A single-series column chart.
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
              barColor: context.scheme.primary,
              labelColor: context.scheme.onSurfaceVariant,
              valueColor: context.scheme.onSurface,
              gridColor: context.dl.border,
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

      // Value above the bar — a figure, so mono.
      painter
        ..text = TextSpan(
          text: formatChartValue(datum.value),
          style: NebulaTypography.mono(
            fontSize: 11,
            fontWeight: FontWeight.w600,
            color: valueColor,
          ),
        )
        ..layout(maxWidth: slot)
        ..paint(canvas,
            Offset(centreX - painter.width / 2, top - valueHeight + 2));

      // Category tick below the baseline.
      painter
        ..text = TextSpan(
          text: datum.label.toUpperCase(),
          style: NebulaTypography.monoLabel(color: labelColor, fontSize: 9),
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
    final scheme = context.scheme;
    final totalA = seriesA.fold<double>(0, (s, v) => s + v);
    final totalB = seriesB.fold<double>(0, (s, v) => s + v);

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
                  labelColor: scheme.onSurfaceVariant,
                  gridColor: context.dl.border,
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
            ChartLegendSwatch(
              color: scheme.primary,
              label: seriesALabel,
              value: formatChartValue(totalA),
            ),
            ChartLegendSwatch(
              color: scheme.secondary,
              label: seriesBLabel,
              value: formatChartValue(totalB),
            ),
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
          text: categories[i].toUpperCase(),
          style: NebulaTypography.monoLabel(color: labelColor, fontSize: 9),
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
    final palette = _categoricalPalette(context);
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
                      trackColor: context.dl.surfaceRaised,
                    ),
                  ),
                  Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Mono(
                        centreValue,
                        size: 22,
                        weight: FontWeight.w600,
                        color: context.dl.timeNow,
                      ),
                      const SizedBox(height: 2),
                      Text(
                        centreLabel.toUpperCase(),
                        style: NebulaTypography.monoLabel(
                          color: context.dl.textTertiary,
                          fontSize: 9,
                        ),
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
                label: data[i].label,
                value: formatChartValue(data[i].value),
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

/// Coloured square, caption and — where there is one — a mono figure.
class ChartLegendSwatch extends StatelessWidget {
  final Color color;
  final String label;

  /// The series' figure. Rendered mono; omit when the swatch is a pure key.
  final String? value;

  const ChartLegendSwatch({
    super.key,
    required this.color,
    required this.label,
    this.value,
  });

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
          style: context.text.bodySmall?.copyWith(
            fontSize: 11.5,
            color: context.scheme.onSurfaceVariant,
          ),
        ),
        if (value != null) ...[
          const SizedBox(width: 6),
          Mono(value!, size: 11.5, weight: FontWeight.w600),
        ],
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
    final share = fraction.isNaN ? 0.0 : fraction.clamp(0.0, 1.0);

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
                  VentureDot(color),
                  const SizedBox(width: 7),
                  Expanded(
                    child: Text(
                      label,
                      overflow: TextOverflow.ellipsis,
                      style: context.text.titleSmall,
                    ),
                  ),
                  const SizedBox(width: NebulaSpacing.sm),
                  Mono(valueLabel, size: 12, weight: FontWeight.w600),
                ],
              ),
              const SizedBox(height: NebulaSpacing.xs + 2),
              Row(
                children: [
                  Expanded(
                    child: ProgressTrack(value: share, color: color, height: 6),
                  ),
                  const SizedBox(width: NebulaSpacing.sm),
                  SizedBox(
                    width: 38,
                    child: Align(
                      alignment: Alignment.centerRight,
                      child: Mono(
                        '${(share * 100).round()}%',
                        size: 10.5,
                        color: context.dl.textTertiary,
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

/// Renders whole numbers without a trailing `.0`.
String formatChartValue(double value) {
  if (value == value.roundToDouble()) return value.toStringAsFixed(0);
  return value.toStringAsFixed(1);
}
