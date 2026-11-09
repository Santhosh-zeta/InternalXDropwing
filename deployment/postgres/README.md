# PostgreSQL

- `init/01_schema.sql`, `02_indexes.sql`, `03_seed.sql`: the schema **at head** plus reference rows
  (ventures, access levels). Used by `docker-compose.dev.yml` on first start and by the test suite.
  Production does not need them: an empty database is built by `backend/migrations` at server boot.
- `backend/migrations/NNNN_*.sql` is the single place for schema changes. Every change touches both a
  new migration and `init/01_schema.sql`; `backend/tests/schema-equivalence.test.js` fails if they diverge.
- Production stack, backups and restore: [`docs/production-checklist.md`](../../docs/production-checklist.md),
  `docker-compose.yml`, `deployment/backup/`.
