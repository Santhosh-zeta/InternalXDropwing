import 'package:flutter/material.dart';

import '../theme/nebula_colors.dart';
import '../theme/nebula_spacing.dart';
import '../theme/nebula_typography.dart';
import '../theme/theme_context.dart';
import 'motion.dart';
import 'primitives.dart';

/// One thing that happened, is happening, or is about to happen.
class RailEvent {
  const RailEvent({
    required this.time,
    required this.title,
    this.subtitle,
    this.state = TimeState.next,
    this.ventureColor,
    this.detail,
    this.onTap,
  });

  final DateTime time;
  final String title;
  final String? subtitle;
  final TimeState state;
  final Color? ventureColor;

  /// Optional expanded content under the event — an approval's buttons, a
  /// quoted message. Only the events that need acting on carry one.
  final Widget? detail;

  final VoidCallback? onTap;
}

/// The day on one axis.
///
/// Tasks, timesheets, approvals and calendar entries all collapse onto a
/// single vertical time rail, dimmed behind you and bright at the present
/// moment. This is the app's signature screen element and the reason Home
/// reads differently at 09:00 than at 16:00.
///
/// Luminance does the work: [TimeState.past] events recede to 45%, the live
/// one is the brightest thing on the screen and carries the only glow.
class DayRail extends StatelessWidget {
  const DayRail({super.key, required this.events, this.animate = true});

  final List<RailEvent> events;
  final bool animate;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        for (var i = 0; i < events.length; i++)
          animate
              ? StaggerIn(
                  index: i,
                  child: _RailRow(
                    event: events[i],
                    isFirst: i == 0,
                    isLast: i == events.length - 1,
                  ),
                )
              : _RailRow(
                  event: events[i],
                  isFirst: i == 0,
                  isLast: i == events.length - 1,
                ),
      ],
    );
  }
}

class _RailRow extends StatelessWidget {
  const _RailRow({
    required this.event,
    required this.isFirst,
    required this.isLast,
  });

  final RailEvent event;
  final bool isFirst;
  final bool isLast;

  String get _timeLabel {
    final h = event.time.hour.toString().padLeft(2, '0');
    final m = event.time.minute.toString().padLeft(2, '0');
    return '$h:$m';
  }

  @override
  Widget build(BuildContext context) {
    final dl = context.dl;
    final state = event.state;
    final isNow = state.isNow;
    final fg = state.foreground(context);

    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Time tick
          SizedBox(
            width: 38,
            child: Padding(
              padding: const EdgeInsets.only(top: 1),
              child: Text(
                _timeLabel,
                textAlign: TextAlign.right,
                style: NebulaTypography.mono(
                  fontSize: 10,
                  fontWeight: FontWeight.w500,
                  color: isNow
                      ? dl.timeNow
                      : state == TimeState.overdue
                          ? dl.critical
                          : dl.textTertiary,
                ),
              ),
            ),
          ),

          // The rail itself: a hairline with this event's node on it.
          SizedBox(
            width: 26,
            child: Stack(
              alignment: Alignment.topCenter,
              children: [
                Positioned(
                  top: isFirst ? 7 : 0,
                  bottom: isLast ? null : 0,
                  height: isLast ? 7 : null,
                  child: Container(width: 1, color: dl.border),
                ),
                Positioned(
                  top: 4,
                  child: isNow
                      ? const LiveDot(size: 7)
                      : Container(
                          width: 7,
                          height: 7,
                          decoration: BoxDecoration(
                            color: state == TimeState.overdue
                                ? dl.critical
                                : state == TimeState.past
                                    ? dl.timePast
                                    : dl.borderStrong,
                            shape: BoxShape.circle,
                          ),
                        ),
                ),
              ],
            ),
          ),

          // Content
          Expanded(
            child: Opacity(
              opacity: state.rowOpacity,
              child: PressScale(
                onTap: event.onTap,
                child: Padding(
                  padding: const EdgeInsets.only(bottom: NebulaSpacing.lg),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Row(
                        children: [
                          if (event.ventureColor != null) ...[
                            VentureDot(event.ventureColor!),
                            const SizedBox(width: 7),
                          ],
                          Expanded(
                            child: Text(
                              event.title,
                              style: context.text.titleSmall?.copyWith(
                                color: fg,
                                fontWeight: state.weight,
                              ),
                            ),
                          ),
                        ],
                      ),
                      if (event.subtitle != null) ...[
                        const SizedBox(height: 3),
                        Text(
                          event.subtitle!,
                          style: context.text.bodySmall?.copyWith(
                            fontSize: 11.5,
                            color: dl.textTertiary,
                          ),
                        ),
                      ],
                      if (event.detail != null) ...[
                        const SizedBox(height: NebulaSpacing.sm),
                        event.detail!,
                      ],
                    ],
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// One hour of activity in the pulse strip.
class PulseBar {
  const PulseBar({required this.hour, required this.value, this.color});

  final int hour;

  /// Event count for this hour. Never a fabricated figure — this is the
  /// number of real records the API reported.
  final int value;

  /// Dominant venture colour for the hour, when there is one.
  final Color? color;
}

/// Today's activity as 18 hourly bars, 06:00 to 23:00.
///
/// The current hour is drawn in [DaylineTokens.timeNow] and every future hour
/// is an empty track, so the strip reads as "how far into the day are we, and
/// how busy has it been" at a glance.
class PulseStrip extends StatelessWidget {
  const PulseStrip({
    super.key,
    required this.bars,
    required this.nowHour,
    this.height = 40,
  });

  final List<PulseBar> bars;
  final int nowHour;
  final double height;

  @override
  Widget build(BuildContext context) {
    final dl = context.dl;
    final maxValue = bars.fold<int>(1, (m, b) => b.value > m ? b.value : m);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(
          height: height,
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              for (var i = 0; i < bars.length; i++) ...[
                if (i > 0) const SizedBox(width: 2),
                Expanded(child: _bar(context, bars[i], maxValue, dl)),
              ],
            ],
          ),
        ),
        const SizedBox(height: 7),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            for (final h in const [6, 10, 14, 18, 22])
              Text(
                h.toString().padLeft(2, '0'),
                style: NebulaTypography.mono(
                  fontSize: 8.5,
                  color: dl.timePast,
                ),
              ),
          ],
        ),
      ],
    );
  }

  Widget _bar(BuildContext context, PulseBar bar, int maxValue, DaylineTokens dl) {
    final isFuture = bar.hour > nowHour;
    final isNow = bar.hour == nowHour;
    final fraction = bar.value == 0 ? 0.0 : bar.value / maxValue;

    final color = isFuture || bar.value == 0
        ? dl.border
        : isNow
            ? dl.timeNow
            : (bar.color ?? context.scheme.primary).withValues(alpha: 0.72);

    return FractionallySizedBox(
      heightFactor: bar.value == 0 ? 0.06 : fraction.clamp(0.08, 1.0),
      alignment: Alignment.bottomCenter,
      child: Container(
        decoration: BoxDecoration(
          color: color,
          borderRadius: BorderRadius.circular(1.5),
          boxShadow: isNow
              ? [BoxShadow(color: dl.nowGlow, blurRadius: 8)]
              : null,
        ),
      ),
    );
  }
}
