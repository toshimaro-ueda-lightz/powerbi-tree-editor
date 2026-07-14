-- kpi_target: 部署 × 年度別の年度KPI目標（§7, §8.3）
-- 対応可能面積（first_level_area）とは粒度が異なる（面積は第1階層別、KPI目標は年度単位）ため
-- 別テーブルとする。
CREATE TABLE kpi_target (
  kpi_id        INTEGER PRIMARY KEY AUTOINCREMENT,
  department_id TEXT    NOT NULL REFERENCES department(department_id),
  fiscal_year   INTEGER NOT NULL,                        -- 年度＝開始年(4/1起点)
  target_value  REAL    NOT NULL,                        -- 年度KPI目標
  created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT    NOT NULL DEFAULT (datetime('now')),

  UNIQUE (department_id, fiscal_year)
);
