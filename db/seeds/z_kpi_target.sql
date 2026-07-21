-- kpi_target 初回インポート（§8.4）: 部署×年度の年度KPI目標
-- 生成元: kpi_target.csv。同じ kpi_id で再実行しても重複しない冪等シード。
-- kpi_target は department のみに依存する（node FK なし）が、first_level_area と揃えて z_ 接頭辞にしている。
INSERT INTO kpi_target (kpi_id, department_id, fiscal_year, target_value) VALUES
  (1, 'D04', 2026, 60000)
ON CONFLICT(kpi_id) DO UPDATE SET
  department_id = excluded.department_id,
  fiscal_year   = excluded.fiscal_year,
  target_value  = excluded.target_value,
  updated_at    = datetime('now');
