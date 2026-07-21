-- node: 第1〜6階層の施策ノード定義（正本 §7, §8.1）
--   第1〜3階層 : 全部署共通の共通ノード（scope='common', department_id=NULL）
--   第4〜6階層 : 部署固有ノード       （scope='dept',   department_id=対象部署）
-- level で第1〜6階層を、scope で共通/部署を識別する（§8.1）。
-- 物理削除はせず is_retired で廃止する方針（§14「物理削除と廃止の条件」は実装時確定事項として本DDLで確定）。
CREATE TABLE node (
  node_id       INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT    NOT NULL,
  subtitle      TEXT,                                              -- 補足説明。NULL可
  level         INTEGER NOT NULL CHECK (level BETWEEN 1 AND 6),
  scope         TEXT    NOT NULL CHECK (scope IN ('common', 'dept')),
  department_id TEXT    REFERENCES department(department_id),
  assignee      TEXT,                                              -- 担当者名（Step3）。NULL可
  is_retired    INTEGER NOT NULL DEFAULT 0 CHECK (is_retired IN (0, 1)),
  created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT    NOT NULL DEFAULT (datetime('now')),

  -- level / scope / department_id の三者整合（§8.1）
  --   共通ノード(第1〜3階層) : level<=3, scope='common', department_id IS NULL
  --   部署ノード(第4〜6階層) : level>=4, scope='dept',   department_id IS NOT NULL
  CHECK (
    (level <= 3 AND scope = 'common' AND department_id IS NULL)
    OR
    (level >= 4 AND scope = 'dept'   AND department_id IS NOT NULL)
  )
);
