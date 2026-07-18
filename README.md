# GSC頑張らない習慣化アプリ

GSC朝活のビジネス向け8テーマと、ダイエット向けの3ヶ月目標・体重管理表アップロードを切り分けたReactアプリです。

## 主な機能

- ビジネス用の月8回テーマサイクル管理
- 火・金朝活を想定した週2回×4週の月間表示
- 8テーマ別のワーク記入
- 今日の行動タスク管理
- KGI・KPI・行動KPIの進捗管理
- ダイエット用の3ヶ月目標設定シート画像管理
- 月1枚の体重管理表を週2回アップロードする記録フロー
- 写真、現在体重、本人メモをもとにしたアドバイス表示
- AIコーチへ渡すための記録プロンプト生成
- ブラウザの `localStorage` への自動保存

## ビジネス 8テーマ

1. 目標設定
2. 現状把握
3. 強み分析
4. 価値・ニーズ分析
5. 行動分析
6. 選択と集中
7. 数値目標設定
8. アクションプラン

## ダイエット運用

ダイエットモードは、ビジネス用の8テーマサイクルから切り離した専用導線です。

最初に3ヶ月目標設定シートを1枚アップロードし、その後は1ヶ月ごとの体重管理表を週2回写真でアップロードします。現在体重とメモを入れると、進捗・提出頻度・生活メモをもとにしたアドバイスが表示されます。

現時点のアドバイスはブラウザ内のルールベースです。将来的にOCRやAI APIへ接続すると、手書き内容やグラフ推移をより自動で読み取れる設計です。

## VS Code連携

このフォルダをVS Codeで開くと、`.vscode/tasks.json` から以下を実行できます。

- `dev: Vite`: 開発サーバー起動
- `build: production`: 本番ビルド
- `preview: dist`: `dist` を `http://127.0.0.1:8765/` で確認

コマンドパレットで `Tasks: Run Task` を開いて選択してください。

## 開発起動

```bash
pnpm dev
```

この環境で通常の `node` がPATHにない場合は、Codex同梱Nodeを使います。

```bash
PATH=/Users/michikooie/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:/Users/michikooie/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin:$PATH \
/Users/michikooie/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/pnpm dev
```

## ビルド

```bash
pnpm build
```
