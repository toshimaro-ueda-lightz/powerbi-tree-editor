INSERT INTO department (department_id, display_name) VALUES
  ('D01', '技企画'),
  ('D02', '計画（ELG）'),
  ('D03', 'SI'),
  ('D04', '設計（ELG）'),
  ('D05', '設計（構造G）'),
  ('D06', 'PM'),
  ('D07', 'S技術'),
  ('D08', '建監'),
  ('D09', '制御'),
  ('D10', '設計ユニット化グループ'),
  ('D11', 'いわき工場'),
  ('D12', 'GEC'),
  ('D13', '技生産'),
  ('D14', 'プロセス開発室'),
  ('D15', 'OUS')
ON CONFLICT(department_id) DO UPDATE SET
  display_name = excluded.display_name;