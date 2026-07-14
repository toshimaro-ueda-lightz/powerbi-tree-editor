-- node_edge: 部署別の親子関係・重み・有効期間（正本 §7, §8.2, §10）
-- 第1〜3階層の共通ノード間のエッジも、部署別重みで15部署ぶん保持する（§8.5）。
-- 第1→2, 2→3, 3→4, 4→5, 5→6 の全関係を、選択部署の node_edge として扱う（§8.2）。
--
-- 有効判定（§10）:
--   基準日に有効なエッジ = valid_from <= 基準日 AND (valid_to IS NULL OR 基準日 < valid_to)
CREATE TABLE node_edge (
  edge_id        INTEGER PRIMARY KEY AUTOINCREMENT,
  department_id  TEXT    NOT NULL REFERENCES department(department_id),
  parent_node_id INTEGER NOT NULL REFERENCES node(node_id),
  child_node_id  INTEGER NOT NULL REFERENCES node(node_id),
  weight         REAL    NOT NULL CHECK (weight >= 0.0 AND weight <= 1.0),  -- 重みは0以上1以下（§10）
  valid_from     TEXT    NOT NULL,                                          -- 有効開始日 YYYY-MM-DD
  valid_to       TEXT,                                                      -- 有効終了日 / NULL = 現在有効

  -- 自己参照エッジ（親=子）は禁止（設計ルール）
  CHECK (parent_node_id <> child_node_id),

  -- 同一部署・同一親子・同一有効開始日のエッジ重複を禁止
  UNIQUE (department_id, parent_node_id, child_node_id, valid_from)
);

-- 注: 同じ親に属する有効な子の重み合計=1.0 の検証（abs(合計 - 1.0) <= 0.000001）は
--     アプリ層（保存時）の責務（§10）。DB制約にはしない。
