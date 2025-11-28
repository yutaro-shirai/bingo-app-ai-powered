# ローカル開発環境セットアップガイド

このガイドでは、ローカルのRancher Desktop（またはDocker Desktop）でPostgreSQLを起動し、ビンゴ​アプリを開発する手順を説明します。

---

## 📋 前提条件

- ✅ **Rancher Desktop** または **Docker Desktop** がインストール済み
- ✅ **Node.js 18+** がインストール済み
- ✅ **npm** または **pnpm** がインストール済み

---

## 🚀 クイックスタート（1コマンドで起動）

### ステップ1: 初回セットアップ

```bash
# 依存関係インストール
npm install

# 環境変数設定
cd packages/backend
cp .env.local.example .env
```

### ステップ2: 一括起動

プロジェクトルートで以下を実行するだけで、DB・バックエンド・フロントエンドが全て起動します：

```bash
npm run dev:all
```

**このコマンドが実行すること**:
1. `docker-compose up -d postgres` (DB起動)
2. `npx prisma migrate deploy` (マイグレーション)
3. `npm run start:dev` (バックエンド起動)
4. `npm run dev` (フロントエンド起動)

**期待される出力**:
```
[0] Container bingo-postgres  Started
[1] ... Applied migration ...
[2] [Nest] ... Nest application successfully started
[3] - Local: http://localhost:3000
```

### ステップ3: 動作確認

ブラウザで以下にアクセス：

1. **ホーム画面**: http://localhost:3000
2. **ゲーム作成**: 「新しいゲームを作成」をクリック
3. **Prisma Studioでデータ確認**:
   ```bash
   cd packages/backend
   npx prisma studio
   ```

---

## 🔧 トラブルシューティング

### 問題1: PostgreSQLが起動しない

**症状**:
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**原因**: PostgreSQLコンテナが起動していない

**対策**:
```bash
# コンテナ状態確認
docker ps -a | grep bingo-postgres

# 停止している場合は起動
docker-compose up -d postgres

# ログ確認
docker-compose logs postgres
```

### 問題2: ポート5432が使用中

**症状**:
```
Error starting userland proxy: listen tcp4 0.0.0.0:5432: bind: address already in use
```

**原因**: 別のPostgreSQLが5432ポートを使用中

**対策A: 既存のPostgreSQLを停止**:
```bash
# Windowsの場合
net stop postgresql

# Linux/Macの場合
sudo systemctl stop postgresql
```

**対策B: ポート番号を変更**:

`docker-compose.yml` を編集：
```yaml
ports:
  - "5433:5432"  # ← 5433に変更
```

`.env` も変更：
```env
DATABASE_URL="postgresql://bingo_user:bingo_pass@localhost:5433/bingo_db"
```

### 問題3: Prismaマイグレーションエラー

**症状**:
```
Error: P1001: Can't reach database server
```

**原因**: DATABASE_URLが間違っているか、PostgreSQLが起動していない

**対策**:
```bash
# 1. PostgreSQL起動確認
docker-compose ps postgres

# 2. 接続テスト
docker exec -it bingo-postgres psql -U bingo_user -d bingo_db

# 接続できたら以下を実行
\dt  # テーブル一覧表示
\q   # 終了

# 3. Prismaキャッシュクリア
rm -rf node_modules/.prisma
npx prisma generate
```

### 問題4: 既存のデータを削除したい

```bash
# 方法1: コンテナ再作成（全データ削除）
docker-compose down -v
docker-compose up -d postgres
cd packages/backend
npx prisma migrate deploy

# 方法2: テーブルデータのみ削除
npx prisma studio
# GUIで各テーブルのレコードを削除

# 方法3: SQLで削除
docker exec -it bingo-postgres psql -U bingo_user -d bingo_db
# SQLプロンプトで:
TRUNCATE TABLE "Player" CASCADE;
TRUNCATE TABLE "Room" CASCADE;
\q
```

---

## 🛠️ 開発ワークフロー

### データベースを確認する

**Prisma Studio（GUI）を使用**:
```bash
cd packages/backend
npx prisma studio
```

ブラウザで http://localhost:5555 が開きます：
- テーブルの閲覧
- データの編集・削除
- クエリの実行

**psqlコマンドライン**:
```bash
docker exec -it bingo-postgres psql -U bingo_user -d bingo_db
```

便利なSQLコマンド：
```sql
-- テーブル一覧
\dt

-- Roomテーブルのデータ表示
SELECT * FROM "Room";

-- Playerテーブルのデータ表示（JSONカラム含む）
SELECT id, "playerId", name, "roomId", "isReach", "isBingo" FROM "Player";

-- 特定のルームの参加者数
SELECT r."roomId", r.name, COUNT(p.id) as player_count
FROM "Room" r
LEFT JOIN "Player" p ON r.id = p."roomId"
GROUP BY r.id;

-- 終了
\q
```

### スキーマを変更する

`packages/backend/prisma/schema.prisma` を編集した後：

```bash
# マイグレーションファイル生成
npx prisma migrate dev --name your_migration_name

# Prisma Client再生成
npx prisma generate

# バックエンド再起動
npm run start:dev
```

### テストを実行する

```bash
cd packages/backend

# ユニットテスト
npm run test

# 統合テスト
npm run test:e2e

# カバレッジ付き
npm run test:cov
```

---

## 🌐 クラウドSupabaseへの切り替え

本番環境やリモートテストでクラウドSupabaseを使用する場合：

### ステップ1: Supabaseプロジェクト作成

1. https://supabase.com/ にアクセス
2. 「New Project」をクリック
3. 設定:
   - **Name**: `bingo-app-prod`
   - **Database Password**: 強力なパスワード（保存しておく）
   - **Region**: `Northeast Asia (Tokyo)`

### ステップ2: 接続文字列取得

1. Supabaseダッシュボード → **Settings** → **Database**
2. **Connection String** セクション → **URI** タブ
3. 接続文字列をコピー:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres
   ```

### ステップ3: 環境変数を切り替え

`.env` を編集：
```env
# ローカルPostgreSQLをコメントアウト
# DATABASE_URL="postgresql://bingo_user:bingo_pass@localhost:5432/bingo_db"

# クラウドSupabaseに切り替え
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@db.xxxxx.supabase.co:5432/postgres"
```

### ステップ4: マイグレーション実行

```bash
npx prisma migrate deploy
npx prisma generate
```

### ステップ5: 確認

Prisma Studioで接続確認：
```bash
npx prisma studio
```

または、Supabaseダッシュボードの **Table Editor** で `Room` と `Player` テーブルが作成されていることを確認。

---

## 📊 データベース接続の切り替え早見表

| 環境 | DATABASE_URL | 用途 |
|------|-------------|------|
| **ローカル開発** | `postgresql://bingo_user:bingo_pass@localhost:5432/bingo_db` | 通常の開発作業 |
| **クラウドテスト** | `postgresql://postgres:PASSWORD@db.xxx.supabase.co:5432/postgres` | リモートテスト、共同開発 |
| **本番環境** | 同上（別プロジェクト） | 本番デプロイ |

**切り替え方法**:
1. `.env` ファイルの `DATABASE_URL` を編集
2. `npx prisma generate` を実行
3. バックエンドを再起動

---

## 🎯 よくある質問

### Q: ローカルとクラウドを同時に使える？

A: いいえ、`.env` の `DATABASE_URL` は1つだけ有効です。切り替えたい場合は `.env` を編集してバックエンドを再起動してください。

**推奨ワークフロー**:
- 普段はローカルPostgreSQLで開発
- リモートテストや共同開発時のみクラウドSupabaseに切り替え

### Q: データベースをリセットするには？

```bash
# ローカルの場合
docker-compose down -v
docker-compose up -d postgres
cd packages/backend
npx prisma migrate deploy

# クラウドの場合（注意: 全データ削除）
npx prisma migrate reset  # 確認プロンプトが出ます
```

### Q: Freeプランの制限は？

Supabase Free プランの制限:
- **最大接続数**: 60接続
- **データ容量**: 500MB
- **転送量**: 5GB/月

**対策**:
- 接続プーリング設定: `?pgbouncer=true&connection_limit=10`
- 開発はローカルPostgreSQLを使用（制限なし）

### Q: 300名同時参加の要件は？

Free プラン（60接続）では不足します。負荷テスト時は以下を検討：
1. **Pro プラン** ($25/月、200接続) にアップグレード
2. **一時的に複数Freeプロジェクト** を並行使用（非推奨）
3. **AWS RDS** 等の別のPostgreSQL

---

## 📝 チェックリスト

開発環境が正しくセットアップされたか確認：

- [ ] `docker-compose ps` でPostgreSQLが `Up (healthy)`
- [ ] `npx prisma studio` でRoomとPlayerテーブルが表示される
- [ ] バックエンドが http://localhost:3004 で起動
- [ ] フロントエンドが http://localhost:3000 で起動
- [ ] ブラウザでゲーム作成→参加→プレイができる
- [ ] Prisma Studioでデータが保存されているのを確認

すべてチェックが入ればセットアップ完了です！🎉

---

**関連ドキュメント**:
- [Supabase移行計画](./supabase-migration-plan.md)
- [アーキテクチャ](./architecture.md)
- [開発者ガイド](./development.md)
