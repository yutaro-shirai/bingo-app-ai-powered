# ビンゴアプリ デプロイメントガイド

このドキュメントでは、以下の構成でビンゴアプリを本番環境へデプロイする手順を説明します。

*   **Frontend**: AWS Amplify (Next.js) - `main` ブランチへのマージで**自動デプロイ**
*   **Backend**: AWS App Runner (NestJS / WebSocket) - AWSコンソールから**手動デプロイ**
*   **Database**: Supabase (PostgreSQL) - ローカルから**マイグレーション実行**

---

## 📋 デプロイフロー概要

```
1. [Supabase] ローカルからマイグレーション実行 (スキーマ変更時のみ)
        ↓
2. [App Runner] AWSコンソールから手動デプロイ (バックエンド変更時)
        ↓
3. [Amplify] mainブランチへマージ → 自動デプロイ (フロントエンド変更時)
```

---

## 🚀 初回セットアップ

### ステップ 1: データベースのセットアップ (Supabase)

1.  [Supabase Dashboard](https://supabase.com/dashboard) で **「New Project」** を作成
    *   **Name**: `bingo-app-prod` (任意)
    *   **Database Password**: 強力なパスワードを設定 (必ず控える)
    *   **Region**: `Tokyo`
2.  **接続文字列の取得**: Settings > Database > Connection string > URI
3.  `packages/backend/.env.production` を作成:
    ```env
    DATABASE_URL="postgresql://postgres.xxxx:[PASSWORD]@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres"
    ```

---

### ステップ 2: バックエンドのセットアップ (AWS App Runner)

1.  **AWS Console > App Runner > サービスの作成**
2.  **ソース設定**:
    *   リポジトリ: GitHub連携
    *   ブランチ: `main`
    *   ソースディレクトリ: `packages/backend`
    *   **デプロイトリガー**: `手動` を選択
3.  **環境変数**:

| キー | 値 |
| :--- | :--- |
| `DATABASE_URL` | Supabaseの接続文字列 |
| `PORT` | `3004` |
| `NODE_ENV` | `production` |
| `ALLOWED_ORIGINS` | `https://main.xxxx.amplifyapp.com` (後で更新) |

4.  デプロイ完了後、発行されたURL (`https://xxx.awsapprunner.com`) を控える

---

### ステップ 3: フロントエンドのセットアップ (AWS Amplify)

1.  **AWS Console > Amplify > 新しいアプリ > Webアプリをホスト**
2.  **GitHub連携**: リポジトリとブランチ (`main`) を選択
3.  **モノレポ設定**: `packages/frontend` をアプリルートに指定
4.  **環境変数**:

| キー | 値 |
| :--- | :--- |
| `NEXT_PUBLIC_SOCKET_URL` | App RunnerのURL |

5.  デプロイ完了後、`ALLOWED_ORIGINS` をApp Runner側で更新

---

## 🔄 通常のデプロイ手順

### データベース変更時 (Prismaスキーマ変更)

```bash
cd packages/backend

# ローカルから本番DBにマイグレーション適用
npx dotenv -e .env.production -- npx prisma migrate deploy
```

---

### バックエンド変更時

1.  コードを `main` ブランチにマージ
2.  **AWS Console > App Runner > 対象サービス**
3.  **「デプロイ」ボタン**をクリック
4.  デプロイ完了まで待機 (数分)

> **Note**: App Runnerは手動デプロイ設定のため、コードをpushしただけでは反映されません。

---

### フロントエンド変更時

1.  コードを `main` ブランチにマージ
2.  **自動でデプロイ開始** (Amplifyが検知)
3.  Amplifyコンソールでデプロイ状況を確認可能

> **Note**: `main` へのpush/マージで自動的にビルド・デプロイが実行されます。

---

## ✅ 動作確認

1.  フロントエンドURL (`https://main.xxxx.amplifyapp.com`) にアクセス
2.  ルーム作成・ゲーム開始が正常に動作するか確認
3.  問題があればApp Runnerのログを確認

---

## ⚠️ トラブルシューティング

| 症状 | 原因・対処 |
| :--- | :--- |
| Supabase接続エラー | IP制限確認、パスワードのURLエンコード確認 |
| モバイルで接続できない (iPhone等) | `NEXT_PUBLIC_SOCKET_URL` 設定確認、`ALLOWED_ORIGINS` 確認 (SSL必須) |
| WebSocket切断 | アプリ側の再接続処理を確認 (UIにステータスが表示されます) |
| 502 Bad Gateway | App Runnerログ確認、PORT設定確認 |
| フロントエンドがデプロイされない | mainブランチへのマージを確認 |
| バックエンドが古いまま | App Runnerで手動デプロイを実行したか確認 |
