# CLAUDE.md — 開発ガイド / 思想

このリポジトリ（変革ツリー更新アプリ）の開発は、次の2つを全ブランチ共通の思想とする。

1. **ループ工学（Loop Engineering）** による自律・自己検証型の開発
2. **React コンポーネント指向** のフロントエンド

正本（設計の真実）:
- 業務要件・設計判断 … [Notion「MVP設計・再開ガイド」](https://app.notion.com/p/MVP-39b65e19c30c8149a5f5ed7065de12d1?source=copy_link)
- 画面仕様 … [Notion「画面設計書（MVP）」](https://app.notion.com/p/MVP-39b65e19c30c81aeaafdcdb9e983b2cb?source=copy_link)
- コード / DB定義 / マイグレーション / 計算・出力ロジック / テスト … GitHub
- 作業の追跡 … GitHub Issues / Pull Request

---

## 1. ループ工学の開発思想

参考:
- https://claude.com/blog/getting-started-with-loops
- https://addyosmani.com/blog/loop-engineering/

原則:
- **ゴールは定量・検証可能な完了条件で定義する。** 「動いたはず」で止めない。完了条件は機械判定できる形（テスト件数・ビルド exit・型エラー0・しきい値）にする。
- **自己検証ループを回す。** 実装 → 検証 → 修正 を、全完了条件が green になるまで反復。決定的チェックはスクリプト（`tsc` / `test` / `build`）で回し、UI は実ブラウザで実操作＋スクショまで確認する。
- **実装者と検証者を分ける（"自分の宿題を自分で採点しない"）。** 実装は委譲エージェント（Sonnet）、レビューは別（Opus）が担い、差分・挙動・見た目を必ず上位モデル/人が確認する。
- **worktree で隔離する。** 並行作業の衝突を防ぐため作業ブランチを切り、`main` / `develop` へ直接書かない。
- **状態は外部メモリに残す。** 会話ではなく Issue / PR / Notion / コードに記録する（モデルは忘れる、リポジトリは忘れない）。
- **エンジニアであり続ける。** ループは思考を省く言い訳にしない。レビューは非交渉。速く出すほど「コードの存在」と「自分の理解」の差が開くことに抗う。

作業の Definition of Done:
- [ ] 型: `tsc --noEmit` エラー0
- [ ] テスト: 全パス（件数を確認）
- [ ] ビルド: 成功（exit 0）
- [ ] 実挙動: 変更点を実際に動かして確認（UI はブラウザ＋1280px スクショで文字切れ・重なりなし）
- [ ] 追跡: Issue / PR を更新。設計変更なら Notion 正本も更新

---

## 2. フロントエンド（React コンポーネント指向）

構成: リポジトリのルートが npm workspace。install はルートで行う（各ワークスペース単体での install はしない）。

| ワークスペース | 役割 |
| --- | --- |
| `packages/domain`（`@powerbi-tree-editor/domain`） | UI にも保存先にも依存しない純関数と共有型（進捗再帰計算・重み検証・末端判定・エラーコード・一時ID判定） |
| `api` | ローカルAPI（Fastify）。SQLite（better-sqlite3）に触る唯一の層 |
| `frontend` | React 画面 |

アーキテクチャ: **React → ローカルAPI（Fastify）→ SQLite**。

原則:
- **React から SQLite を直接触らない。必ず API を介す。** `frontend` は `db/` に直接依存しない（DBアクセスは `api` の責務）。ただし `frontend` は自分の dev / build / test を持つ。
- **ロジックを二重定義しない（真実は1つ）。** UI 非依存の純関数は `packages/domain/` に置き、`frontend` と `api` の双方が同じ実装を共有する。コピーして持たせない。
- **React コンポーネントで構成する。** ロジックは上記のとおり純関数モジュールへ分離し、テスト可能にする。
- **データアクセスはサービス層を経由する**（`frontend/src/api/apiService.ts`）。コンポーネントはこのモジュールだけを経由する。
- **DB と画面の型のズレは API 境界で吸収する。** DB 列名にフロントの型を合わせるのではなく、API がマッピングの責務を持つ。現時点で吸収しているズレ:
  - `node_id` / `edge_id` … DB は INTEGER、フロントは string。API 境界で文字列化し、リクエストでは整数へ戻す。
  - `department.display_name` → フロントの `DepartmentRecord.name`。
  - `node.is_retired` … フロントの型には持たず、API 側で `is_retired = 0` のみ返す（廃止ノードを除外）。
- **UI 文言はハードコードしない。** 単一の文言モジュール（`frontend/src/strings.ts`）に集約する（多言語化 = i18n はしない。単一情報源のみ）。サーバ側で文言が必要な場合も、API はエラーコードを返しフロントで `strings.ts` に対応づける（文言の単一情報源を維持する）。
- **スタイルは styled-components（CSS-in-JS）を用いる。** デザイントークンは `ThemeProvider` のテーマで管理する。
- **コンポーネントは Storybook で確認可能にする。**
- 状態は「操作不能 / 入力エラー / 未選択 / 空データ」も用意する。

保存モデル: 「未保存」概念を維持し、サーバ側の編集セッション（作業コピー＋変更ログ）で実装する。各操作は即時検証されるが SQLite には書かれず、「保存」で作業コピー全体を1トランザクションで適用、「破棄」でセッションを捨てる（DBは無変更）。

`frontend/src/mock/` は削除していないが、`App.tsx` からは参照しない。Storybook のフィクスチャとテストのためだけに残しており、**ランタイムのモックモードとしてはサポートしない。**

---

## 3. コマンド / 制約

セットアップ（リポジトリのルートで実行）:

```bash
npm install       # workspace 全体（packages/domain / api / frontend）を install
npm run migrate   # data/tree.sqlite を作成しシードを流す（起動前に必要）
npm run dev       # API (:5175) と Vite (:5173) を同時起動。Vite が /api を API へ proxy
```

`http://localhost:5173` で開く。個別に起動する場合は `npm run dev -w api` / `npm run dev -w frontend`。

テスト:

```bash
npm test                                   # ルート = DB層（tests/ が db/migrate.ts を検証）
npm run test -w @powerbi-tree-editor/domain
npm run test -w @powerbi-tree-editor/api
npm run test -w frontend
```

型チェック / ビルド:

```bash
npx tsc --noEmit -p tsconfig.json                  # ルート（DB層）
npx tsc --noEmit -p packages/domain/tsconfig.json
npx tsc --noEmit -p api/tsconfig.json
cd frontend && npx tsc -b                          # frontend
npm run build -w frontend                          # tsc -b && vite build
```

制約:
- **既存の `db/` 配下（マイグレーション・seed・migrate.ts）は変更しない。**
- API 起動時にマイグレーション／シードを自動実行しない。シードは `ON CONFLICT DO UPDATE` で冪等に上書きするため、起動のたびに流すと保存済みの重み・`valid_to` 等を壊す。スキーマ準備は `npm run migrate` の責務とする。
