# GSC学習塾 定期テスト現状分析アプリ

学校の定期テスト答案写真をもとに、生徒別・教科別の強み、弱み、次回の学習方針を確認できるWebアプリです。

## 主な機能

- メールアドレスと生徒ID / 先生IDによるマジックリンクログイン
- 生徒、保護者、講師、管理者のロール別閲覧制御
- Google Drive答案フォルダ同期を想定したファイル取り込み導線
- 数学・英語のテスト結果、単元別分析、問題別コメント表示
- 弱点補強と得意分野伸長のための次回学習プラン表示
- VS Codeタスクから開発、ビルド、プレビューを実行

## デモログイン

画面左のフォームに以下のいずれかを入れると、画面内の「デモ受信箱」にログインURLが届きます。

| ロール | メールアドレス | ID |
| --- | --- | --- |
| 保護者 | `parent.hinata@example.com` | `STU-7KQ3-92A` |
| 生徒 | `student.hinata@example.com` | `STU-7KQ3-92A` |
| 講師 | `teacher@gsc-juku.example.com` | `TCH-2026-GSC` |
| 管理者 | `admin@gsc-juku.example.com` | `ADM-2026-GSC` |

## VS Code連携

このフォルダをVS Codeで開くと、`.vscode/tasks.json` から以下を実行できます。

- `dev: Vite`: 開発サーバー起動
- `build: production`: 本番ビルド
- `preview: dist`: `dist` を `http://127.0.0.1:8765/` で確認

コマンドパレットで `Tasks: Run Task` を開いて選択してください。

## 開発起動

```bash
pnpm install
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

ビルド後は `dist/server/index.js` が生成され、OpenAI Sitesへデプロイできる形式になります。
