-- progress_input: 末端ノードへ直接登録する作業進捗・成果進捗（正本 §8.3, §10）
-- 進捗を直接登録できるのは有効な子を持たない末端タスクのみ（葉判定はエッジ依存のためアプリ層で担保）。
-- node_id には常に部署固有の末端ノード（第4〜6階層）が入るため、部署は node.department_id から導出でき、
-- 本テーブルに department_id は持たない（共通ノードは末端にならない、という設計判断）。
CREATE TABLE progress_input (
  input_id         INTEGER PRIMARY KEY AUTOINCREMENT,
  node_id          INTEGER NOT NULL REFERENCES node(node_id),
  as_of_date       TEXT    NOT NULL,                                                        -- 基準日 YYYY-MM-DD
  work_progress    REAL    NOT NULL CHECK (work_progress    >= 0 AND work_progress    <= 1),  -- 作業進捗（§3, §10）
  outcome_progress REAL    NOT NULL CHECK (outcome_progress >= 0 AND outcome_progress <= 1),  -- 成果進捗（§3, §10）
  note             TEXT,

  -- 同一ノード・同一基準日の直接入力は1件
  UNIQUE (node_id, as_of_date)
);
