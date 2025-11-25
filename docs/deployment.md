# デプロイメントガイド

このドキュメントでは、ビンゴアプリをAWSにデプロイする方法を説明します。

## 📋 概要

**デプロイ構成:**
- **Frontend (Next.js)**: AWS Amplify
- **Backend (NestJS WebSocket)**: AWS App Runner
- **Git戦略**: `develop`ブランチで開発、`main`ブランチへのマージで本番デプロイ

## 🚀 初回デプロイ手順

### 1. バックエンドのデプロイ (AWS App Runner)

#### 1.1 AWS App Runnerサービスの作成

1. **AWS Consoleにログイン**して、App Runnerサービスに移動
2. **「サービスを作成」**をクリック
3. **リポジトリタイプ**: 「ソースコードリポジトリ」を選択
4. **プロバイダー**: GitHubを選択し、リポジトリを接続
5. **リポジトリとブランチ**:
   - リポジトリ: `your-username/bingo-app-by-gemini`
   - ブランチ: `main`
   - Source directory: `packages/backend`

#### 1.2 ビルド設定

**デプロイ方法**: 設定ファイルを使用

App Runnerは自動的に`apprunner.yaml`を検出します:

```yaml
version: 1.0
runtime: nodejs20
build:
  commands:
    pre-build:
      - npm ci
    build:
      - npm run build
run:
  runtime-version: 20
  command: node dist/main
  network:
    port: 3004
    env: PORT
  env:
    - name: NODE_ENV
      value: production
```

> **Note**: Dockerfileも用意されていますが、App Runnerでは`apprunner.yaml`を使用したソースコードベースのデプロイを推奨します。

#### 1.3 環境変数の設定

App Runnerコンソールで以下の環境変数を設定:

| 変数名 | 値 | 説明 |
|--------|-----|------|
| `PORT` | `3004` | バックエンドポート |
| `ALLOWED_ORIGINS` | `https://your-frontend-url.amplifyapp.com` | フロントエンドURL (後で設定) |
| `NODE_ENV` | `production` | 本番環境 |

#### 1.4 サービス設定

- **vCPU**: 0.5
- **メモリ**: 1 GB
- **自動デプロイ**: 有効化

#### 1.5 デプロイ完了後

デプロイが完了したら、App RunnerのURLをメモしてください:
```
例: https://xxxxx.ap-northeast-1.awsapprunner.com
```

---

### 2. フロントエンドのデプロイ (AWS Amplify)

#### 2.1 AWS Amplifyアプリの作成

1. **AWS Consoleにログイン**して、Amplifyコンソールに移動
2. **「新しいアプリ」** → **「Webアプリをホスト」**をクリック
3. **リポジトリプロバイダー**: GitHubを選択
4. **リポジトリとブランチ**:
   - リポジトリ: `your-username/bingo-app-by-gemini`
   - ブランチ: `main`
5. **モノレポの検出**: 自動的に検出されます
6. **アプリ名**: `bingo-app-frontend`

#### 2.2 ビルド設定の確認

Amplifyは自動的に`amplify.yml`を検出します。設定を確認:

```yaml
version: 1
applications:
  - appRoot: packages/frontend
    frontend:
      phases:
        preBuild:
          commands:
            - cd packages/frontend
            - npm ci
        build:
          commands:
            - npm run build
      artifacts:
        baseDirectory: .next
        files:
          - '**/*'
```

#### 2.3 環境変数の設定

Amplifyコンソールの「環境変数」セクションで以下を設定:

| 変数名 | 値 | 説明 |
|--------|-----|------|
| `NEXT_PUBLIC_SOCKET_URL` | `https://xxxxx.ap-northeast-1.awsapprunner.com` | バックエンドURL (App Runnerから取得) |

> **重要**: `NEXT_PUBLIC_`で始まる環境変数はビルド時にフロントエンドに埋め込まれます

#### 2.4 バックエンドのCORS設定を更新

フロントエンドのURLが確定したら、App Runnerの環境変数`ALLOWED_ORIGINS`を更新:

```
ALLOWED_ORIGINS=https://main.xxxxx.amplifyapp.com,http://localhost:3000
```

> 複数のURLをカンマ区切りで指定できます

#### 2.5 デプロイ

「保存してデプロイ」をクリックしてデプロイを開始します。

---

## 🔄 Git ブランチ戦略

### ブランチ構成

- **`main`ブランチ**: 本番環境（AWS Amplify & App Runnerでデプロイ）
- **`develop`ブランチ**: 開発環境（ローカルで動作確認）

### 開発フロー

```bash
# develop ブランチで開発
git checkout develop

# 機能追加や修正
git add .
git commit -m "機能追加: XXX"

# develop にプッシュ
git push origin develop

# ローカルでテスト後、main にマージ
git checkout main
git merge develop
git push origin main  # ← 自動デプロイがトリガーされる
```

### デプロイトリガー

- `main`ブランチへのプッシュ → 自動的に本番環境にデプロイ
- `develop`ブランチへのプッシュ → デプロイなし（ローカル開発用）

---

## 🧪 デプロイ前のローカル検証

### フロントエンドのビルド確認

```bash
cd packages/frontend
npm run build
```

エラーがないことを確認してください。

### バックエンドのビルド確認

```bash
cd packages/backend
npm run build
```

`dist`フォルダが生成されることを確認してください。

### App Runner設定ファイルの確認

```bash
cat packages/backend/apprunner.yaml
```

設定ファイルが正しく配置されていることを確認してください。

> **Note**: Dockerを使用する場合は、`Dockerfile`も用意されています:
> ```bash
> cd packages/backend
> docker build -t bingo-backend .
> docker run -p 3004:3004 bingo-backend
> ```

---

## 🔧 トラブルシューティング

### フロントエンドがバックエンドに接続できない

**原因**: バックエンドのCORS設定が正しくない

**解決方法**:
1. App Runnerの環境変数`ALLOWED_ORIGINS`にフロントエンドURLが含まれているか確認
2. App Runnerを再デプロイして設定を反映

### ビルドエラーが発生

**フロントエンド**:
```bash
cd packages/frontend
npm ci
npm run build
```

**バックエンド**:
```bash
cd packages/backend
npm ci
npm run build
```

ローカルでビルドエラーを解決してから再デプロイしてください。

### WebSocket接続が切れる

**原因**: App Runnerのタイムアウト設定

**解決方法**:
- App Runnerは長時間のWebSocket接続をサポートしていますが、アイドル状態が続くと切断される場合があります
- フロントエンド側で再接続ロジックを実装（既に実装済み）

### 環境変数が反映されない

**Amplify**:
- 環境変数を変更した後、手動で「再デプロイ」をトリガーする必要があります

**App Runner**:
- 環境変数を変更した後、自動的に再デプロイされます

---

## 📊 コスト管理

### イベント時のみ使用する場合

**推奨フロー**:
1. イベント前日: App Runnerサービスを起動（または作成）
2. イベント開催: アプリを使用
3. イベント終了後: App Runnerサービスを一時停止または削除

**コスト**: 約¥30/イベント（4時間使用の場合）

### 常時稼働する場合

**想定コスト**:
- AWS Amplify (Frontend): 無料枠内 〜 $1-2/月
- AWS App Runner (Backend): $3-10/月

---

## 🔐 セキュリティのベストプラクティス

1. **環境変数の管理**: AWSコンソールで直接設定し、Gitにコミットしない
2. **CORS設定**: `ALLOWED_ORIGINS`を正しく設定し、不要なオリジンを許可しない
3. **HTTPSの使用**: AmplifyとApp Runnerは自動的にHTTPSを提供します

---

## 📚 参考リンク

- [AWS Amplify ドキュメント](https://docs.aws.amazon.com/amplify/)
- [AWS App Runner ドキュメント](https://docs.aws.amazon.com/apprunner/)
- [Next.js デプロイメント](https://nextjs.org/docs/deployment)
- [NestJS デプロイメント](https://docs.nestjs.com/faq/serverless)
