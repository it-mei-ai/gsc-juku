# GSC学習塾 定期テスト現状分析アプリ

学校の定期テスト答案写真をもとに、生徒別・教科別の強み、弱み、次回の学習方針を確認できるWebアプリです。

公開URL: https://g.it-mei.com/jyuku

## 主な機能

- Googleスプレッドシートのアカウント台帳を使ったログイン照合
- 生徒、保護者、講師、管理者のロール別閲覧制御
- Google Drive答案フォルダ同期を想定したファイル取り込み導線
- 数学・英語のテスト結果、単元別分析、問題別コメント表示
- 弱点補強と得意分野伸長のための次回学習プラン表示
- `/jyuku` を標準公開パスにしたSitesデプロイ
- VS Codeタスクから開発、ビルド、プレビューを実行

## アカウント管理

アカウントはGoogleスプレッドシート `GSC学習塾` の `アカウント` タブで管理します。

必要な列:

| 列名 | 内容 |
| --- | --- |
| `メールアドレス` | ログインに使うメールアドレス |
| `権限` | `管理者` / `講師` / `生徒` / `保護者` |
| `ID` | 管理者ID、講師ID、生徒ID、保護者ID |

現MVPでは、Sites workerの `/api/login` がシートを読み取り、メールアドレスとIDの組み合わせを照合します。初期画面にデモ受信箱やアカウント一覧は表示しません。

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
