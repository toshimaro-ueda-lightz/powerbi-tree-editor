-- first_level_area: 部署 × 年度 × 第1階層ノード別の対応可能面積（現行Excel「1st対応面積」§8.3, §10）
-- 保存するのは第1階層の対応面積のみ。下位階層の対応面積・進捗面積・現在の納入可能面積は
-- Power BI が算出するため保持しない（§10）。固定補正値(+2400等)も持たない（§8.3）。
-- node_id は第1階層(level=1)ノードを指す（他表参照のCHECKは不可のため level 判定はアプリ層/インポート時に担保）。
CREATE TABLE first_level_area (
  area_id       INTEGER PRIMARY KEY AUTOINCREMENT,
  department_id TEXT    NOT NULL REFERENCES department(department_id),
  fiscal_year   INTEGER NOT NULL,                        -- 年度＝開始年(4/1起点)。2026 = 2026-04-01〜2027-03-31（§10）
  node_id       INTEGER NOT NULL REFERENCES node(node_id),
  area          REAL    NOT NULL CHECK (area >= 0),      -- 対応可能面積（㎡）
  created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT    NOT NULL DEFAULT (datetime('now')),

  UNIQUE (department_id, fiscal_year, node_id)
);
