# Contributing to InternalX

Thanks for taking the time. Whether it's a bug fix, a new feature, or just better docs — contributions are welcome.

---

## Before you start

- Check the [open issues](https://github.com/Santhosh-zeta/InternalXDropwing/issues) to see if someone is already working on it.
- For anything non-trivial, open an issue first and describe what you want to do. This avoids wasted effort if the direction doesn't fit.
- By contributing you agree that your changes will be released under the [MIT License](LICENSE).

---

## Development setup

```bash
git clone https://github.com/Santhosh-zeta/InternalXDropwing.git
cd InternalXDropwing
docker compose up -d          # PostgreSQL 16 on :5432

# API
cd backend && cp .env.example .env   # fill in your values
npm install && npm run seed && npm run dev

# Web
cd frontend && cp .env.example .env.local
npm install && npm run dev

# Mobile (optional)
cd mobile && flutter pub get
flutter run --dart-define=API_URL=http://10.0.2.2:5000/api
```

Full setup details are in [README.md](README.md#-quick-start).

---

## How to contribute

1. **Fork** the repository and create your branch from `main`.
2. **Make your changes.** Keep each PR focused — one fix or feature per PR.
3. **Test your changes** against the stack you modified.
4. **Open a pull request** against `main` and fill in the template.

---

## Branch naming

| Type | Pattern | Example |
| :-- | :-- | :-- |
| Feature | `feat/<short-description>` | `feat/invoice-pdf-export` |
| Bug fix | `fix/<short-description>` | `fix/timesheet-approval-race` |
| Docs | `docs/<short-description>` | `docs/deployment-guide` |
| Chore | `chore/<short-description>` | `chore/upgrade-socket-io` |

---

## Coding standards

### Backend (Node / Express)

- Parameterised queries only — no string-interpolated SQL.
- New routes must call `authenticate` and `requireLevel(n)` — never expose a mutation without both.
- Every privileged mutation must write an audit log entry.
- Add request validation via `validate.middleware.js` on any new `POST` / `PUT` / `PATCH`.

### Frontend (Next.js / TypeScript)

- All types — no `any`.
- Routes that render privileged data must be wrapped in `<RequireAuth>`.
- Use the existing Nebula component library (`frontend/src/components/ui/`) before creating new components.

### Mobile (Flutter / Dart)

- Follow the existing clean-architecture layout: `data/` → `domain/` → `presentation/`.
- Use `context.dl` and `context.text` for colours and typography — never hardcode hex values.
- RBAC gates: wrap screens in `PermissionScope` and actions in `PermissionGate` (see `core/rbac/rbac_widgets.dart`).
- Every new screen needs a corresponding entry in `app_router.dart` and `main_layout_screen.dart`.

### General

- Keep commits focused and the message clear: `fix(timesheets): guard context after async dialog`.
- Don't add dependencies without a good reason — describe the trade-off in the PR.

---

## Reporting a vulnerability

Please read [SECURITY.md](SECURITY.md) before filing a public issue.

---

## Code of conduct

This project follows the [Contributor Covenant](CODE_OF_CONDUCT.md). Be kind.
