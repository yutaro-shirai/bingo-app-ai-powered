# Bingo App - Supabaseセットアップガイド

## Supabaseプロジェクト作成

1. [Supabase](https://supabase.com/)にアクセスしてログイン
2. 「New Project」をクリック
3. 以下を設定：
   - **Name**: `bingo-app-test`（テスト環境）または `bingo-app-prod`（本番環境）
   - **Database Password**: 強力なパスワードを設定（メモしておく）
   - **Region**: `Northeast Asia (Tokyo)`を推奨
4. 「Create new project」をクリック

## DATABASE_URL取得

1. プロジェクトダッシュボードで **Settings** > **Database** を開く
2. **Connection String** セクションで **URI** タブを選択
3. `postgresql://postgres:[YOUR-PASSWORD]@...` の形式の文字列をコピー
4. `[YOUR-PASSWORD]`を実際のパスワードに置き換える

例:
```
postgresql://postgres:your_strong_password@db.abcdefghijklm.supabase.co:5432/postgres
```

## 環境変数設定

### テスト環境
`packages/backend/.env`ファイルを作成：

```env
DATABASE_URL="postgresql://postgres:your_password@db.test-project.supabase.co:5432/postgres"
ADMIN_PASSWORD="test_admin_password"
```

### 本番環境（デプロイ時）
デプロイ先（Amplify/Vercel等）の環境変数に設定：

```env
DATABASE_URL="postgresql://postgres:your_password@db.prod-project.supabase.co:5432/postgres"
ADMIN_PASSWORD="production_admin_password"
```

## マイグレーション実行

```bash
cd packages/backend
npx prisma migrate dev --name init
npx prisma generate
```

## 確認

```bash
npx prisma studio
```

ブラウザでPrisma Studioが開き、データベースを確認できます。

## トラブルシューティング

### 接続エラーが出る場合
- DATABASE_URLのパスワードが正しいか確認
- Supabaseプロジェクトが起動中であることを確認（Settings > General）
- ファイアウォール設定を確認

### マイグレーションエラーが出る場合
- Prisma Clientを再生成: `npx prisma generate`
- キャッシュをクリア: `rm -rf node_modules/.prisma`
