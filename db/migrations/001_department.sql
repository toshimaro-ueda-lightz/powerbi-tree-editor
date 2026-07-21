CREATE TABLE department (
  department_id TEXT PRIMARY KEY,          -- 'D01'〜'D15'
  display_name  TEXT NOT NULL UNIQUE       -- Power BI作成単位の部署名
);