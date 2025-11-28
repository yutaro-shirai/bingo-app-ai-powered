# 本番Supabase接続確認ガイド

このガイドでは、本番環境（Supabase）への接続確認を行う手順を説明します。

## 1. 接続情報の準備

Supabaseのダッシュボードから以下の情報を取得してください。

1. [Supabase Dashboard](https://supabase.com/dashboard) にログイン
2. 対象のプロジェクトを選択
3. **Project Settings** (左下の歯車アイコン) > **Database** > **Connection string** > **URI** タブを選択
4. 表示された接続文字列をコピー（`YOUR-PASSWORD` は設定したパスワードに置き換えてください）

## 2. 環境変数の設定

`packages/backend` ディレクトリに `.env.production` ファイルを作成し、以下の内容を設定します。

```bash
cd packages/backend
cp .env.production.example .env.production
```

`.env.production` をエディタで開き、`DATABASE_URL` を手順1で取得した値に更新します。

```env
# 例:
DATABASE_URL="postgresql://postgres:mysecretpassword@db.abcdefghijklm.supabase.co:5432/postgres?pgbouncer=true&connection_limit=20"
```

> **注意**: パスワードに記号が含まれる場合は、URLエンコードが必要な場合があります。

## 3. 接続確認の実行

以下のコマンドを実行して、Supabaseへの接続とマイグレーションの適用を確認します。

```bash
# 本番環境の設定を使ってマイグレーションステータスを確認
npx dotenv -e .env.production -- npx prisma migrate status
```

**成功した場合**:
`Database schema is up to date` または `Following migration have not yet been applied` などのメッセージが表示されます。

**失敗した場合**:
`P1001: Can't reach database server` などのエラーが表示されます。パスワードやホスト名を確認してください。

## 4. マイグレーションの適用（初回のみ）

接続が確認できたら、本番データベースにテーブルを作成します。

```bash
npx dotenv -e .env.production -- npx prisma migrate deploy
```

## 5. アプリケーションでの確認（オプション）

ローカルのバックエンドを本番DBに接続して起動し、動作確認を行います。

```bash
# 本番DB接続でバックエンド起動
npx dotenv -e .env.production -- npm run start:dev
```

起動後、フロントエンドからゲームを作成し、Supabaseのダッシュボード（Table Editor）でデータが作成されるか確認します。
