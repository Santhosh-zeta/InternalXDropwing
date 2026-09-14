/// ═══════════════════════════════════════════════════════════════════════
/// TEMPORARY DEMO MODE — added to preview the app with no backend running.
///
/// Everything this touches lives under `lib/core/demo/` plus a few small,
/// clearly-marked call sites (search the codebase for `kDemoMode`). To
/// restore the real app: delete this directory and remove those call
/// sites, or simply flip the flag below to `false`.
///
/// What it does while on:
///   - Skips login entirely — the app opens straight to Home as a seeded
///     Super Admin.
///   - Every API call is intercepted before it reaches the network and
///     answered with realistic canned data matching the real backend's
///     response shapes (see `demo_data.dart` / `demo_interceptor.dart`).
///   - Nothing is persisted: creates/edits/deletes report success but the
///     canned data does not actually change.
///   - Team Chat's REST calls (room list, message history) are mocked, but
///     the Socket.IO connection is real and will simply fail to connect in
///     the background — harmless, no crash, just no live messages.
/// ═══════════════════════════════════════════════════════════════════════
const bool kDemoMode = true;
