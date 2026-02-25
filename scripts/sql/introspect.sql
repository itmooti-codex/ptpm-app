SET NOCOUNT ON;

-- 1) Table inventory with row counts
SELECT
  s.name AS schema_name,
  t.name AS table_name,
  SUM(p.rows) AS row_count
FROM sys.tables t
JOIN sys.schemas s
  ON s.schema_id = t.schema_id
JOIN sys.partitions p
  ON p.object_id = t.object_id
 AND p.index_id IN (0, 1)
WHERE s.name = 'dbo'
GROUP BY s.name, t.name
ORDER BY SUM(p.rows) DESC, t.name;

-- 2) Column dictionary
SELECT
  c.TABLE_SCHEMA,
  c.TABLE_NAME,
  c.ORDINAL_POSITION,
  c.COLUMN_NAME,
  c.DATA_TYPE,
  c.CHARACTER_MAXIMUM_LENGTH,
  c.NUMERIC_PRECISION,
  c.NUMERIC_SCALE,
  c.IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS c
WHERE c.TABLE_SCHEMA = 'dbo'
ORDER BY c.TABLE_NAME, c.ORDINAL_POSITION;

-- 3) Primary keys
SELECT
  tc.TABLE_NAME,
  kcu.COLUMN_NAME,
  kcu.ORDINAL_POSITION
FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu
  ON tc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME
 AND tc.TABLE_SCHEMA = kcu.TABLE_SCHEMA
WHERE tc.CONSTRAINT_TYPE = 'PRIMARY KEY'
  AND tc.TABLE_SCHEMA = 'dbo'
ORDER BY tc.TABLE_NAME, kcu.ORDINAL_POSITION;

-- 4) Foreign keys
SELECT
  fk.name AS fk_name,
  tp.name AS parent_table,
  cp.name AS parent_column,
  tr.name AS referenced_table,
  cr.name AS referenced_column
FROM sys.foreign_keys fk
JOIN sys.foreign_key_columns fkc
  ON fk.object_id = fkc.constraint_object_id
JOIN sys.tables tp
  ON fkc.parent_object_id = tp.object_id
JOIN sys.columns cp
  ON fkc.parent_object_id = cp.object_id
 AND fkc.parent_column_id = cp.column_id
JOIN sys.tables tr
  ON fkc.referenced_object_id = tr.object_id
JOIN sys.columns cr
  ON fkc.referenced_object_id = cr.object_id
 AND fkc.referenced_column_id = cr.column_id
WHERE SCHEMA_NAME(tp.schema_id) = 'dbo'
ORDER BY tp.name, fk.name;

-- 5) Candidate watermark columns (date/time + timestamp-like names)
SELECT
  t.name AS table_name,
  c.name AS column_name,
  ty.name AS data_type
FROM sys.tables t
JOIN sys.columns c
  ON c.object_id = t.object_id
JOIN sys.types ty
  ON c.user_type_id = ty.user_type_id
WHERE t.schema_id = SCHEMA_ID('dbo')
  AND (
    c.name LIKE '%created%'
    OR c.name LIKE '%modified%'
    OR c.name LIKE '%updated%'
    OR c.name LIKE '%timestamp%'
    OR c.name LIKE '%date%'
  )
ORDER BY t.name, c.name;

-- 6) Candidate business entities by naming convention
SELECT
  t.name AS table_name
FROM sys.tables t
WHERE t.schema_id = SCHEMA_ID('dbo')
  AND (
    t.name LIKE '%Customer%'
    OR t.name LIKE '%Job%'
    OR t.name LIKE '%FollowUp%'
    OR t.name LIKE '%Quote%'
    OR t.name LIKE '%Invoice%'
    OR t.name LIKE '%Payment%'
    OR t.name LIKE '%Doc%'
  )
ORDER BY t.name;
