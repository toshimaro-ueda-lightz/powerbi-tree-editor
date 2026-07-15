# 変革ツリー更新アプリ｜フロントエンド（MVP）

Power BI変革ツリーの更新作業を行う画面です。**React → ローカルAPI（Fastify）→ SQLite** の構成で、React から SQLite を直接触ることはありません。データアクセスは必ず API を介します。

データアクセスは `src/api/apiService.ts`（サービス層）に集約しています。コンポーネントはこのモジュールだけを経由し、`localStorage` への永続化は行いません。

## 保存モデル

「保存」ボタンを押すまで SQLite には書き込まれません。編集中の状態はサーバ側の**編集セッション**（ツリーの作業コピー）が保持します。

- 最初の操作時にセッションが自動で始まり、以降の操作はサーバ上の作業コピーへ適用されます。
- 各操作は**その場で検証**されます（重み合計100%・末端のみ進捗・範囲チェックなど）。エラーは操作した時点で返るため、保存時にまとめて噴出することはありません。
- **保存**（ヘッダー「変更をSQLiteへ保存」）… 作業コピー全体を1トランザクションで SQLite へ適用します。
- **破棄**（ヘッダー「変更を破棄」）… セッションを捨てるだけで、SQLite は無変更のまま保存済みの状態に戻ります。

セッションはサーバのメモリ上にあります（単一ユーザのローカルアプリのため）。ブラウザをリロードしても未保存の変更は保持されますが、API サーバを再起動すると失われます（保存済みデータは失われません）。

## 技術スタック

- React 19 + TypeScript + Vite
- [`@xyflow/react`](https://reactflow.dev/)（React Flow）＋ [`elkjs`](https://github.com/kieler/elkjs) による自動レイアウト（`layered`, 左→右）
- [`lucide-react`](https://lucide.dev/) アイコン
- [`styled-components`](https://styled-components.com/)（CSS-in-JS）。デザイントークンは `src/theme.ts` の `ThemeProvider` テーマ、グローバルリセットは `src/GlobalStyle.ts`（`createGlobalStyle`）で管理
- [Storybook](https://storybook.dev/)（`@storybook/react-vite`）で表示系コンポーネントを個別に確認可能
- [Vitest](https://vitest.dev/) + [@testing-library/react](https://testing-library.com/react)

## セットアップ

リポジトリはルートが npm workspace（`packages/domain` / `api` / `frontend`）です。**install はリポジトリのルートで行います**（`frontend/` 単体での install は行いません）。

```bash
# リポジトリのルートで
npm install
```

`frontend` は `db/` に直接依存しません（DBへのアクセスは `api` の責務です）が、dev / build / test は自分のワークスペースに持ちます。

## 起動方法

事前に SQLite の作成が必要です（初回のみ、およびマイグレーション追加時）。

```bash
# リポジトリのルートで
npm run migrate   # data/tree.sqlite を作成してシードを流す
npm run dev       # API (:5175) と Vite (:5173) を同時に起動
```

`http://localhost:5173` で開きます。Vite が `/api` へのリクエストを API サーバ（`http://127.0.0.1:5175`）へ proxy します（`vite.config.ts`）。

`frontend` 単体で dev サーバだけを動かすこともできますが、その場合も別途 API を起動しておく必要があります。

```bash
npm run dev -w frontend          # Vite のみ
npm run dev -w api               # API のみ
```

## ビルド

```bash
npm run build -w frontend
```

`tsc -b` による型チェックの後、`vite build` で `dist/` に本番ビルドを出力します。

```bash
npm run preview -w frontend
```

でビルド成果物をローカルプレビューできます。

## テスト

```bash
npm run test -w frontend
```

`vitest run` を実行します。サービス層（`src/api/apiService.ts`）とモックサービス（`src/mock/`）を中心に、UI非依存のロジックを対象としています。進捗再帰計算・重み検証・末端判定などの純関数は `packages/domain` へ移設済みで、テストもそちらにあります（`npm run test -w @powerbi-tree-editor/domain`）。

```bash
npm run test:watch -w frontend
```

でウォッチモード実行できます。

## Storybook

```bash
npm run storybook -w frontend
```

`http://localhost:6006` で Storybook が起動し、表示系コンポーネント（Header / Sidebar / EditPanel / AddChildDialog / WeightEditorDialog / Modal / TreeNodeCard）を単体で確認できます。`TreeCanvas` は React Flow のキャンバス全体に依存するため対象外です。

```bash
npm run build-storybook -w frontend
```

`storybook-static/` に静的ビルドを出力します（Git管理対象外）。

## ディレクトリ構成（抜粋）

```
src/
  api/        # サービス層。apiService.ts 経由でのみデータに触れる（API通信・エラーコード→文言の対応づけ）
  mock/       # Storybook用フィクスチャとテスト用のモック（下記「mock/ の位置づけ」参照）
  tree/       # React Flow + elkjs によるツリー描画
  components/ # ヘッダー・サイドバー・編集パネル・各種ダイアログ（*.styled.ts に styled-components 定義）
  hooks/      # useApiVersion（サービス層の更新に追従して再描画）
  config.ts       # 年度など画面全体の静的設定
  strings.ts      # UI文言の単一情報源
  types.ts        # 画面向けの型（共有分は @powerbi-tree-editor/domain を再export）
  theme.ts        # styled-components ThemeProvider 用デザイントークン
  GlobalStyle.ts  # createGlobalStyle によるグローバルリセット＋CSS変数供給
  App.tsx     # 画面全体の状態管理・組み立て
```

進捗再帰計算・重み検証・末端判定などの純関数は `packages/domain`（`@powerbi-tree-editor/domain`）にあり、`frontend` と `api` が同じ実装を共有します（ロジックを二重定義しません）。

## `mock/` の位置づけ

`src/mock/` は**削除していません**が、`App.tsx` からは参照していません。残している目的は次の2つだけです。

- Storybook のフィクスチャ（`storyFixtures.ts`）
- テスト（`mockService.test.ts` による業務ルールの回帰確認）

**ランタイムのモックモードとしてはサポートしません。** アプリを動かすには API と SQLite が必要です。`mock/` のシードデータ（営業部 / 開発部などの `dept-*`）は SQLite の実データ（`D01`〜`D15`）とは無関係で、テストとStorybook用の固定値です。

## 既知の制約（MVPスコープ外）

- ノードの物理削除は行いません（「ツリーから外す」は関連づけ（linkage）の解除のみで、ノード・履歴は保持されます）
- KPI目標値（`kpi_target`）は API から取得していますが、画面表示はしていません
- Excel出力は対象外です
