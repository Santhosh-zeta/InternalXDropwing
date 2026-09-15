## What this PR does

<!-- One paragraph. What changed and why. -->

## Type of change

- [ ] Bug fix
- [ ] New feature
- [ ] Refactor / cleanup
- [ ] Docs
- [ ] Chore (deps, CI, tooling)

## Layer(s) affected

- [ ] Backend
- [ ] Web frontend
- [ ] Mobile app

## RBAC impact

<!-- Did you add, remove, or change what any access level can see or do?
     If yes — which levels, which routes/screens, and why. -->

- [ ] No RBAC change
- [ ] Yes — described above

## Testing done

<!-- How did you verify this works? Describe what you ran or tested manually. -->

## Checklist

- [ ] No hardcoded credentials or secrets
- [ ] New routes call `authenticate` and `requireLevel`
- [ ] New Flutter screens use `PermissionScope` / `PermissionGate` where appropriate
- [ ] No `any` types introduced (TypeScript)
- [ ] No hardcoded hex colours in Flutter (use `context.dl.*`)
