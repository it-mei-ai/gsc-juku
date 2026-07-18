# 定期テスト現状分析アプリ

学校の定期テスト写真をもとに、教科別の強み・弱み・次回学習メモを確認する学習塾向けWebアプリです。

## 現在のMVP

- メールアドレス + 生徒ID / 先生IDによるマジックリンクログイン
- 使い捨てログインURLの発行・有効期限・使用済み判定のデモ
- 保護者/生徒/先生/管理者の権限別表示
- Google Drive同期を想定したファイル状態管理
- 数学・英語のサンプル分析結果
- 単元別得点率、強み、弱み、次回学習、先生メモの表示
- 他生徒データ参照の拒否を想定した権限監査表示

## デモ用アカウント

```text
保護者: parent.hinata@example.com / STU-7KQ3-92A
生徒: student.hinata@example.com / STU-7KQ3-92A
先生: teacher@gsc-juku.example.com / TCH-2026-GSC
管理者: admin@gsc-juku.example.com / ADM-2026-GSC
```

ローカルMVPでは実メール送信の代わりに、画面内のデモ受信箱へログインURLを表示します。実運用では、URL発行・メール送信・トークン保存・権限チェックをサーバー側で実装します。

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

同梱Nodeを使う場合:

```bash
PATH=/Users/michikooie/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:/Users/michikooie/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin:$PATH \
/Users/michikooie/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/pnpm build
```
