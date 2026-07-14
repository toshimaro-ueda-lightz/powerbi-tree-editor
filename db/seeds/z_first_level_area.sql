-- first_level_area 初回インポート（§8.4）: 部署×年度×第1階層ノードの対応可能面積（1st対応面積）
-- 生成元: first_level_area.csv。同じ area_id で再実行しても重複しない冪等シード。
-- 【実行順】node への FK があるため node.sql の後に流す必要がある。seed はファイル名昇順で
--   実行されるため、node 系より後に来るよう接頭辞 z_ を付けている（departments→node→node_edge→progress→z_*）。
INSERT INTO first_level_area (area_id, department_id, fiscal_year, node_id, area) VALUES
  (1, 'D04', 2026, 1, 32024),
  (2, 'D04', 2026, 2, 212),
  (3, 'D04', 2026, 3, 27623),
  (4, 'D04', 2026, 4, 69),
  (5, 'D04', 2026, 5, 72)
ON CONFLICT(area_id) DO UPDATE SET
  department_id = excluded.department_id,
  fiscal_year   = excluded.fiscal_year,
  node_id       = excluded.node_id,
  area          = excluded.area,
  updated_at    = datetime('now');
