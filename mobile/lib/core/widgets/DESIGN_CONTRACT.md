# Dayline — implementation contract

Every screen follows this. It exists so 38 screens built by different hands
come out as one app.

## The two rules

1. **Brightness encodes time.** Past content recedes, *now* is the highest
   contrast thing on screen, upcoming is in between. Classify content with
   `TimeState` and let the kit render it. Never hand-roll an opacity for this.
2. **Hue only encodes venture.** `context.scheme.primary` (violet) is the only
   interactive accent; `context.dl.critical` is the only alarm. If a colour is
   not a venture colour, a semantic status, or the accent, it does not belong.

## Never do this

- `NebulaColors.background`, `NebulaColors.textPrimary`, `Color(0xFF...)`, or
  `Colors.cyan` inside a widget tree. Every colour comes from
  `context.scheme.*` or `context.dl.*`.
- `NebulaTypography.heading1` / `.body1` / `.caption` — all deprecated,
  dark-only, and a light-mode bug. Use `context.text.*`.
- `backgroundColor:` on a `Scaffold` or `AppBar`. The theme already sets both;
  restating them is what broke light mode in the first place.
- Proportional digits for a figure. Money, hours, dates, counts, IDs and
  percentages all use `Mono` or `NebulaTypography.mono(...)`.
- Inventing a number the API does not return. The previous app displayed a
  hardcoded "92% health"; there is no such field. If the data is not there,
  do not render the element.

## The kit — `lib/core/widgets/`

| Widget | Use |
|---|---|
| `DCard` | Any panel. `accent:` draws a venture spine. |
| `SectionHeader('LABEL', actionLabel: …)` | Every section title. |
| `EntityRow` | Every list row, in every module. |
| `GroupHeader('Overdue', count: 1, tone: DTone.critical)` | Divider inside a list. |
| `StatTile` / `MetricRow` | Figures with captions. |
| `DTag` / `DTag.venture` | Status pills. |
| `DAvatar(name)` | People. Colour derives from the name. |
| `VentureDot(color)` | Venture marker. |
| `ProgressTrack` / `.segmented` | Bars. |
| `Mono('₹4,20,000')` | Figures. |
| `LiveDot` | The live indicator. The only looping animation in the app — do not add another. |
| `DayRail` + `RailEvent` | The day on one time axis. |
| `PulseStrip` + `PulseBar` | Hourly activity. |
| `StaggerIn(index: i, child: …)` | Entrance for list items. |
| `PressScale(onTap: …)` | Anything tappable that navigates or commits. |
| `CountUp` | A figure that changes. |
| `ListSkeleton` / `EmptyStateView` / `ErrorStateView` / `RestrictedStateView` / `OfflineBanner` | States. |
| `readableError(e)` | Turn a thrown object into user-facing copy. |

Import via `package:mobile/core/widgets/...` or a relative path.

## Colour access

```dart
context.scheme.primary        // accent
context.scheme.onSurface      // body text
context.dl.timeNow            // brightest — now
context.dl.timePast           // receded — done
context.dl.border             // hairline
context.dl.critical           // alarm
context.text.titleMedium      // type
```

`NebulaColors.parseHex(record.primaryColor)` turns an API hex into a `Color`.
`NebulaColors.forVentureId(id)` is the fallback when a record carries no hex.

## RBAC — `lib/core/rbac/`

Mirrors the backend. Lower level number = MORE access (1 = Super Admin,
9 = Client), so every comparison is `<=`. A check written `level >= 4` is
backwards and shipped as a real bug in the previous version.

```dart
ref.watch(currentUserProvider)              // User?
ref.watch(canProvider(Permission.deleteTask))

PermissionGate(permission: Permission.createTask, child: fab)   // hide an action
PermissionScope(permission: Permission.viewAudit,               // gate a screen
                what: 'the audit log', child: body)
```

Hide actions the user cannot perform rather than disabling them. Gate the
screen body with `PermissionScope` so a restricted user gets an explanation,
not a 403.

**Mobile gating is UX, not security** — the server enforces. But it must match
the server, or the UI offers something that then fails.

## States — every data screen handles four

Loading → `ListSkeleton`. Error → `ErrorStateView(message: readableError(e), onRetry: …)`.
Empty → `EmptyStateView`. Restricted → `PermissionScope`.

## Motion

`StaggerIn` on list items. `PressScale` on tappables. `CountUp` on changing
figures. Nothing else loops except `LiveDot`. Everything respects
`MediaQuery.disableAnimationsOf` — the kit already does.
