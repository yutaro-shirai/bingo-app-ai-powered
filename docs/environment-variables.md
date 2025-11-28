# 環境変数設定ガイド

このドキュメントでは、フロントエンドとバックエンドの環境変数の設定方法と連携について説明します。

## 📋 環境変数一覧

### バックエンド (`packages/backend/.env`)

| 変数名 | 説明 | 開発環境の値 | 本番環境の値 |
|--------|------|--------------|--------------|
| `PORT` | サーバーポート番号 | `3004` | AWS App Runnerが自動設定 |
| `ALLOWED_ORIGINS` | CORS許可オリジン | `http://localhost:3000` | `https://main.xxxxx.amplifyapp.com` |
| `NODE_ENV` | 実行環境 | `development` | `production` |
| `DATABASE_URL` | Supabase接続文字列 | Session mode URL | Session mode URL + pooling |
| `ADMIN_PASSWORD` | Admin認証パスワード | 任意 | 強力なパスワード |
| `SESSION_SECRET` | セッション暗号化キー | 任意 | `openssl rand -base64 32` で生成 |

### フロントエンド (`packages/frontend/.env.local`)

| 変数名 | 説明 | 開発環境の値 | 本番環境の値 |
|--------|------|--------------|--------------|
| `NEXT_PUBLIC_SOCKET_URL` | WebSocketサーバーURL | `http://localhost:3004` | `https://xxxxx.ap-northeast-1.awsapprunner.com` |

---

## 🔗 環境変数の連携

### 開発環境

フロントエンドとバックエンドがローカルで動作する場合：

**バックエンド** (`packages/backend/.env`):
```bash
PORT=3004
ALLOWED_ORIGINS=http://localhost:3000
```

**フロントエンド** (`packages/frontend/.env.local`):
```bash
NEXT_PUBLIC_SOCKET_URL=http://localhost:3004
```

### 本番環境

フロントエンドがAmplify、バックエンドがApp Runnerで動作する場合：

**バックエンド** (AWS App Runner環境変数):
```bash
PORT=8080  # App Runnerが自動設定
ALLOWED_ORIGINS=https://main.d1a2b3c4d5e6f7.amplifyapp.com
NODE_ENV=production
DATABASE_URL=postgresql://postgres.xxx:password@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres
ADMIN_PASSWORD=your-strong-password
SESSION_SECRET=your-generated-secret-key
```

**フロントエンド** (AWS Amplify環境変数):
```bash
NEXT_PUBLIC_SOCKET_URL=https://abc123xyz.ap-northeast-1.awsapprunner.com
```

---

## 🚀 セットアップ手順

### 1. バックエンドの設定

```bash
cd packages/backend

# .env.exampleをコピー
cp .env.example .env

# .envファイルを編集
# - DATABASE_URLにSupabase接続文字列を設定
# - ADMIN_PASSWORDを設定
# - SESSION_SECRETを設定
```

### 2. フロントエンドの設定

```bash
cd packages/frontend

# .env.exampleをコピー
cp .env.example .env.local

# .env.localファイルを編集
# - NEXT_PUBLIC_SOCKET_URLを設定（開発環境: http://localhost:3004）
```

### 3. 動作確認

```bash
# バックエンドを起動
cd packages/backend
npm run start:dev

# 別のターミナルでフロントエンドを起動
cd packages/frontend
npm run dev
```

ブラウザで `http://localhost:3000` にアクセスして動作を確認してください。

---

## 🌐 本番環境のデプロイ

### AWS App Runner（バックエンド）

1. App Runnerコンソールで環境変数を設定
2. 以下の変数を追加：
   - `ALLOWED_ORIGINS`: AmplifyのフロントエンドURL
   - `DATABASE_URL`: Supabase接続文字列（Session mode + pooling）
   - `ADMIN_PASSWORD`: 強力なパスワード
   - `SESSION_SECRET`: `openssl rand -base64 32` で生成
   - `NODE_ENV`: `production`

### AWS Amplify（フロントエンド）

1. Amplifyコンソールで環境変数を設定
2. 以下の変数を追加：
   - `NEXT_PUBLIC_SOCKET_URL`: App RunnerのバックエンドURL

---

## 🔒 セキュリティ注意事項

1. **`.env` ファイルをGitにコミットしない**
   - `.gitignore` に `.env` と `.env.local` が含まれていることを確認

2. **本番環境では強力なパスワードを使用**
   - `ADMIN_PASSWORD`: 最低16文字、英数字記号混在
   - `SESSION_SECRET`: `openssl rand -base64 32` で生成

3. **DATABASE_URLの管理**
   - パスワードが含まれるため、絶対にコミットしない
   - 本番環境では環境変数として設定

---

## 📝 環境変数の更新

環境変数を変更した場合は、サーバーを再起動してください：

```bash
# バックエンド
cd packages/backend
# Ctrl+C で停止
npm run start:dev

# フロントエンド
cd packages/frontend
# Ctrl+C で停止
npm run dev
```

---

## 🐛 トラブルシューティング

### エラー: "CORS policy: No 'Access-Control-Allow-Origin' header"

**原因**: バックエンドの `ALLOWED_ORIGINS` にフロントエンドのURLが含まれていない

**解決策**:
```bash
# packages/backend/.env
ALLOWED_ORIGINS=http://localhost:3000
```

### エラー: "WebSocket connection failed"

**原因**: フロントエンドの `NEXT_PUBLIC_SOCKET_URL` が間違っている

**解決策**:
```bash
# packages/frontend/.env.local
NEXT_PUBLIC_SOCKET_URL=http://localhost:3004
```

### エラー: "Can't reach database server"

**原因**: `DATABASE_URL` が間違っているか、Supabaseプロジェクトが起動していない

**解決策**:
1. Supabase Dashboardでプロジェクトのステータスを確認
2. `DATABASE_URL` を再確認（Session modeを使用）
