# 変革ツリー更新アプリ｜React操作モック（MVP）

Power BI変革ツリーの更新作業を行うための操作イメージを検証する、フロントエンド単体のモックです。バックエンド／SQLite接続／Excel出力は含みません。データはブラウザの `localStorage` に保存され、シードデータからいつでも初期化できます。

## 技術スタック

- React 19 + TypeScript + Vite
- [`@xyflow/react`](https://reactflow.dev/)（React Flow）＋ [`elkjs`](https://github.com/kieler/elkjs) による自動レイアウト（`layered`, 左→右）
- [`lucide-react`](https://lucide.dev/) アイコン
- [`styled-components`](https://styled-components.com/)（CSS-in-JS）。デザイントークンは `src/theme.ts` の `ThemeProvider` テーマ、グローバルリセットは `src/GlobalStyle.ts`（`createGlobalStyle`）で管理
- [Storybook](https://storybook.dev/)（`@storybook/react-vite`）で表示系コンポーネントを個別に確認可能
- [Vitest](https://vitest.dev/) + [@testing-library/react](https://testing-library.com/react)

## セットアップ

このディレクトリ（`frontend/`）単体で完結します。リポジトリ直下の `db/` や既存 `tests/` には依存しません。

```bash
cd frontend
npm install
```

## 起動方法

```bash
npm run dev
```

`http://localhost:5173`（デフォルトポート）でモックアプリが開きます。

## ビルド

```bash
npm run build
```

`tsc -b` による型チェックの後、`vite build` で `dist/` に本番ビルドを出力します。

```bash
npm run preview
```

でビルド成果物をローカルプレビューできます。

## テスト

```bash
npm test
```

`vitest run` を実行します。純関数（進捗再帰計算・重み検証・末端判定など、`src/domain/`）とモックサービス（`src/mock/`）を中心に、UI非依存のロジックを網羅しています。

```bash
npm run test:watch
```

でウォッチモード実行できます。

## Storybook

```bash
npm run storybook
```

`http://localhost:6006` で Storybook が起動し、表示系コンポーネント（Header / Sidebar / EditPanel / AddChildDialog / WeightEditorDialog / Modal / TreeNodeCard）を単体で確認できます。`TreeCanvas` は React Flow のキャンバス全体に依存するため対象外です。

```bash
npm run build-storybook
```

`storybook-static/` に静的ビルドを出力します（Git管理対象外）。

## ディレクトリ構成（抜粋）

```
src/
  domain/     # 進捗計算・重み検証・末端判定などの純関数（UI非依存）
  mock/       # シードデータ・モックサービス（localStorage永続化、コンポーネントはここ経由でのみデータに触れる）
  tree/       # React Flow + elkjs によるツリー描画
  components/ # ヘッダー・サイドバー・編集パネル・各種ダイアログ（*.styled.ts に styled-components 定義）
  theme.ts        # styled-components ThemeProvider 用デザイントークン
  GlobalStyle.ts  # createGlobalStyle によるグローバルリセット＋CSS変数供給
  App.tsx     # 画面全体の状態管理・組み立て
```

## モックデータの前提

- 部署: 営業部 (`dept-sales`) / 開発部 (`dept-dev`)
- 第1〜3階層は共通施策（`scope: 'common'`）、第4〜6階層は部署固有施策（`scope: 'dept'`）
- 営業部は第1〜6階層まで到達する経路を持ち、開発部は第4階層までで完結する例（部署により深さ・重み・可能面積が異なることを表現）
- 「モックデータ初期化」ボタンでシード状態に戻せます（未保存の変更は失われます）

## 既知の制約（MVPスコープ外）

- ノードの物理削除・廃止は未実装（「ツリーから外す」は関連づけの解除のみで、ノード・履歴は保持されます）
- KPI目標値（`kpi_target`）は参照専用データとして保持していますが、画面表示はしていません
- バックエンドAPI・SQLite接続・Excel出力は対象外です
