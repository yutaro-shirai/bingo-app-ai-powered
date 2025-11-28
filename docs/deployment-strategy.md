# アプリケーションデプロイメント戦略

## 開発環境 vs 本番環境

### 現在の構成（開発環境）
- **データベース**: ローカルPostgreSQL（Docker）
- **接続文字列**: `postgresql://bingo_user:bingo_pass@localhost:5432/bingo_db`
- **利点**: ネットワーク制限なし、高速、オフライン開発可能

### App Runnerデプロイ時の動作

#### ⚠️ 重要な注意点
現在の構成（ローカルPostgreSQL）では、**App Runnerにデプロイできません**。

理由：
1. App RunnerコンテナからローカルホストのPostgreSQLにはアクセスできない
2. Docker Composeは本番環境では使用しない
3. 永続化されたデータストレージが必要

## App Runner本番デプロイの選択肢

### オプション1: Supabase（推奨）
**メリット**:
- マネージド PostgreSQL
- 自動バックアップ
- スケーラビリティ
- 無料プランあり

**必要な変更**:
```bash
# App Runner環境変数に設定
DATABASE_URL="postgresql://prisma.[PROJECT-REF]:[PASSWORD]@[REGION].pooler.supabase.com:5432/postgres?pgbouncer=true"
```

**課題**: 
- ネットワーク制限により接続できない場合がある（今回発生）
- VPNや企業プロキシが必要な場合あり

### オプション2: AWS RDS for PostgreSQL
**メリット**:
- AWSエコシステム内で完結
- App RunnerとVPC統合可能
- 高い可用性とパフォーマンス

**必要な変更**:
```bash
# RDSインスタンス作成後
DATABASE_URL="postgresql://admin:[PASSWORD]@[RDS-ENDPOINT]:5432/bingo_db"
```

**コスト**: 月額 $15-50程度（最小構成）

### オプション3: インメモリ（旧方式）に戻す
**メリット**:
- データベース不要
- 構成がシンプル
- コスト0

**デメリット**:
- サーバー再起動でデータ消失
- スケーリング不可
- プレイヤー再接続不可

## 推奨デプロイフロー

### 段階1: ローカル開発（現在）
```bash
# docker-compose.ymlを使用
docker-compose up -d
npm run start:dev
```

### 段階2: ステージング/本番デプロイ
```bash
# .env.production を作成
DATABASE_URL="[Supabase or RDS connection string]"

# App Runner環境変数に設定
# - DATABASE_URL
# - ADMIN_PASSWORD
# - ALLOWED_ORIGINS
```

### 段階3: マイグレーション実行
```bash
# デプロイ前にマイグレーションを本番DBに適用
npx prisma migrate deploy
```

## 現時点での推奨事項

1. **開発**: ローカルPostgreSQLを継続使用 ✅
2. **本番準備**: Supabaseのネットワーク問題が解決するまで待機
3. **代替案**: 必要に応じてAWS RDSを検討

## 環境変数の管理

### .env（ローカル開発）
```
DATABASE_URL="postgresql://bingo_user:bingo_pass@localhost:5432/bingo_db"
```

### App Runner環境変数（本番）
```
DATABASE_URL="postgresql://[production-connection-string]"
ADMIN_PASSWORD="[secure-password]"
ALLOWED_ORIGINS="https://[your-amplify-domain].amplifyapp.com"
```

## 次のステップ

1. ローカルで Phase 2 の実装を完了
2. Supabase接続問題を解決（VPN、ネットワーク変更）
3. または AWS RDS のセットアップを検討
4. 本番環境へのデプロイ
