-- Baseline. 0001 is deployment/postgres/init/01_schema.sql (+ 02_indexes.sql):
-- a database created from those files is already at 0001. This file only
-- exists so the numbering is continuous; the runner refuses to run on a
-- database without the baseline tables.
SELECT 1;
