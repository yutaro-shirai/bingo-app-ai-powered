# Supabase移行計画書

**対象システム**: ビンゴアプリ (Bingo App)  
**作成日**: 2025-11-28  
**ステータス**: 計画  
**関連Issue**: [#24 - Supabaseのデータ管理検討](https://github.com/yutaro-shirai/bingo-app-by-gemini/issues/24)

---

## 1. 背景と目的

### 1.1 現在の課題

> **Issue #24より引用**:  
> "セッションでの管理だと限界あり。想定外のエラー時の復旧ができない可能性もあるため、DBで管理する方が良いと思われる。"

#### 現状の問題点

| 問題 | 詳細 | 影響 |
|-----|------|------|
| **データ揮発性** | In-memory `Map<roomId, Room>` - サーバー再起動で全データ消失 | 🔴 ゲーム中の停電・デプロイ時にゲーム状態ロスト |
| **スケーラビリティ制限** | 単一インスタンスのメモリに依存 | 🔴 水平スケーリング不可、最大同時接続数の制限 |
| **復旧困難** | エラー発生時に状態復元不可 | 🟡 ホストがゲームを最初からやり直す必要 |
| **監査ログ不在** | ゲーム履歴の記録なし | 🟡 不正検知・デバッグ困難 |
| **セッション管理の複雑性** | Admin認証にexpress-sessionを使用 | 🟡 Redis等の追加インフラが必要（スケール時） |

### 1.2 移行の目的

✅ **データ永続化**: ゲーム状態をデータベースに保存し、サーバー再起動に耐える  
✅ **スケーラビリティ**: 複数バックエンドインスタンスでの負荷分散を可能に  
✅ **エラーリカバリー**: 異常終了時のゲーム状態復元  
✅ **監査証跡**: ゲーム履歴の記録と分析  
✅ **運用性向上**: Supabase DashboardでのGUI管理  

---

## 2. 現在の実装分析

### 2.1 In-Memoryストレージの実装

**`packages/backend/src/game/game.service.ts`**:
```typescript
@Injectable()
export class GameService {
  private rooms: Map<string, Room> = new Map();  // ← これを削除

  async createRoom(hostSocketId: string, name: string): Promise<string> {
    const room: Room = {
      id: uuidv4(),
      roomId,
      name: safeName,
      hostSocketId,
      status: 'WAITING',
      numbersDrawn: [],
      players: [],
    };
    
    this.rooms.set(roomId, room);  // ← In-memory保存
    return roomId;
  }

  async getRoom(roomId: string): Promise<Room | null> {
    return this.rooms.get(normalizedRoomId) || null;  // ← In-memory読取
  }
}
```

### 2.2 既存のPrismaスキーマ

✅ **既に実装済み**: `packages/backend/prisma/schema.prisma`

```prisma
model Room {
  id           String   @id @default(uuid())
  roomId       String   @unique
  name         String
  status       String   @default("WAITING")
  numbersDrawn Int[]    @default([])
  hostSocketId String?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  
  players      Player[]
  
  @@index([roomId])
  @@index([status])
}

model Player {
  id        String   @id @default(uuid())
  playerId  String   @unique
  roomId    String
  name      String
  card      Json
  isReach   Boolean  @default(false)
  isBingo   Boolean  @default(false)
  socketId  String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  room      Room     @relation(fields: [roomId], references: [id], onDelete: Cascade)
  
  @@index([playerId])
  @@index([roomId])
}
```

> ✅ **朗報**: Prismaスキーマは既に定義されている！  
> マイグレーションファイルも存在: `prisma/migrations/20251126091023_init_db_migration/migration.sql`

### 2.3 現在のセッション管理

**Admin認証** (`packages/backend/src/main.ts`):
```typescript
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'default-secret-do-not-use-in-prod',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24, // 1 day
    },
  }),
);
```

**問題点**:
- In-memoryセッションストレージ（デフォルト）
- 複数インスタンス時にセッション共有不可
- サーバー再起動でAdmin認証状態消失

---

## 3. 移行戦略

### 3.1 フェーズ別移行アプローチ

```mermaid
gantt
    title Supabase移行ロードマップ
    dateFormat  YYYY-MM-DD
    section フェーズ1
    Prisma統合         :active, p1-1, 2025-11-28, 3d
    Room/Player DB化   :p1-2, after p1-1, 2d
    
    section フェーズ2
    テスト・検証       :p2-1, after p1-2, 2d
    バグ修正           :p2-2, after p2-1, 1d
    
    section フェーズ3
    セッション永続化   :p3-1, after p2-2, 2d
    監査ログ追加       :p3-2, after p3-1, 1d
    
    section フェーズ4
    本番デプロイ       :milestone, p4-1, after p3-2, 1d
```

### 3.2 段階的移行（推奨）

#### ✅ フェーズ1: コアデータの移行（必須）

**目標**: RoomとPlayerをSupabase（PostgreSQL）に保存

**実装箇所**:
- `GameService`: `Map<roomId, Room>` → Prisma Client
- 既存のPrismaスキーマを活用

**期間**: 3-5日

#### ✅ フェーズ2: テスト・検証（必須）

**目標**: 既存機能が正常動作することを確認

**テスト項目**:
- ゲーム作成・参加・プレイ
- 再接続機能
- 負荷テスト（Issue #23と連携）

**期間**: 2-3日

#### 🔵 フェーズ3: セッション管理の改善（オプション）

**目標**: Admin認証セッションをSupabaseに保存

**実装内容**:
- `connect-pg-simple` でセッションストアをPostgreSQLに変更
- または Supabase Auth統合

**期間**: 2日

#### 🔵 フェーズ4: 監査ログ・分析機能（オプション）

**目標**: ゲーム履歴の記録と分析

**実装内容**:
- `GameHistory` モデル追加
- イベントログテーブル
- Supabase Dashboardでの分析

**期間**: 1-2日

---

## 4. 実装計画

### 4.1 Prisma Clientセットアップ

#### Step 1: 依存関係確認

```bash
cd packages/backend
npm list @prisma/client prisma
```

✅ 既にインストール済み:
- `@prisma/client`: ^6.19.0
- `prisma`: (devDependency)

#### Step 2: Supabase接続設定

**`.env` ファイル**:
```env
# Supabase PostgreSQL接続文字列
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@db.YOUR_PROJECT_REF.supabase.co:5432/postgres"

# Admin認証
ADMIN_PASSWORD="your-admin-password"

# セッション秘密鍵
SESSION_SECRET="your-session-secret-key"
```

#### Step 3: マイグレーション実行

```bash
# Supabaseにテーブル作成
npx prisma migrate deploy

# Prisma Clientコード生成
npx prisma generate
```

### 4.2 GameServiceの書き換え

#### Before: In-Memory実装

```typescript
// ❌ 削除
private rooms: Map<string, Room> = new Map();
```

#### After: Prisma実装

```typescript
// ✅ 追加
import { PrismaClient } from '@prisma/client';

@Injectable()
export class GameService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  async createRoom(hostSocketId: string, name: string): Promise<string> {
    const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    const safeName = ensureSafeRoomName(name);

    await this.prisma.room.create({
      data: {
        roomId,
        name: safeName,
        hostSocketId,
        status: 'WAITING',
        numbersDrawn: [],
      },
    });

    return roomId;
  }

  async getRoom(roomId: string): Promise<Room | null> {
    const normalizedRoomId = normalizeRoomId(roomId);
    
    return await this.prisma.room.findUnique({
      where: { roomId: normalizedRoomId },
      include: { players: true },  // リレーション読込
    });
  }

  async joinRoom(
    roomId: string,
    socketId: string,
    name: string,
    existingPlayerId?: string,
  ): Promise<Player> {
    const normalizedRoomId = normalizeRoomId(roomId);
    const safeName = ensureSafePlayerName(name);

    // 既存プレイヤーの再接続
    if (existingPlayerId) {
      const player = await this.prisma.player.findUnique({
        where: { playerId: existingPlayerId },
      });

      if (player && player.roomId === normalizedRoomId) {
        // Socket IDを更新
        return await this.prisma.player.update({
          where: { playerId: existingPlayerId },
          data: { socketId },
        });
      }
    }

    // 新規プレイヤー作成
    const room = await this.prisma.room.findUnique({
      where: { roomId: normalizedRoomId },
    });

    if (!room) throw new Error('Room not found');

    const card = this.generateBingoCard();

    return await this.prisma.player.create({
      data: {
        playerId: uuidv4(),
        roomId: room.id,  // ← 注意: room.id (UUID)を使用
        name: safeName,
        card,
        socketId,
      },
    });
  }

  async drawNumber(roomId: string, hostSocketId: string): Promise<number> {
    const normalizedRoomId = normalizeRoomId(roomId);
    
    const room = await this.prisma.room.findUnique({
      where: { roomId: normalizedRoomId },
    });

    if (!room) throw new Error('Room not found');
    if (room.hostSocketId !== hostSocketId) {
      throw new Error('Only host can draw numbers');
    }

    const drawnNumbers = room.numbersDrawn;
    const availableNumbers = Array.from({ length: 75 }, (_, i) => i + 1).filter(
      (n) => !drawnNumbers.includes(n),
    );

    if (availableNumbers.length === 0) {
      throw new Error('All numbers have been drawn');
    }

    const number = availableNumbers[Math.floor(Math.random() * availableNumbers.length)];

    // 配列に追加して保存
    await this.prisma.room.update({
      where: { roomId: normalizedRoomId },
      data: {
        numbersDrawn: [...drawnNumbers, number],
      },
    });

    return number;
  }

  async punchNumber(roomId: string, playerId: string, number: number): Promise<Player> {
    const normalizedRoomId = normalizeRoomId(roomId);

    const room = await this.prisma.room.findUnique({
      where: { roomId: normalizedRoomId },
    });

    if (!room) throw new Error('Room not found');
    if (!room.numbersDrawn.includes(number)) {
      throw new Error('Number has not been drawn yet');
    }

    const player = await this.prisma.player.findUnique({
      where: { playerId },
    });

    if (!player) throw new Error('Player not found');

    // ビンゴ判定
    const result = this.checkBingo(player.card as number[][], room.numbersDrawn);

    // 結果を保存
    return await this.prisma.player.update({
      where: { playerId },
      data: {
        isReach: result.isReach,
        isBingo: result.isBingo,
      },
    });
  }
}
```

### 4.3 スキーマ拡張（オプション）

#### 監査ログテーブル

```prisma
// schema.prismaに追加

model GameEvent {
  id        String   @id @default(uuid())
  roomId    String
  eventType String   // "number_drawn", "player_joined", "bingo_claimed"
  data      Json
  createdAt DateTime @default(now())
  
  room      Room     @relation(fields: [roomId], references: [id], onDelete: Cascade)
  
  @@index([roomId])
  @@index([createdAt])
}
```

**イベント記録例**:
```typescript
await this.prisma.gameEvent.create({
  data: {
    roomId: room.id,
    eventType: 'number_drawn',
    data: { number, drawnBy: hostSocketId },
  },
});
```

---

## 5. リスクと対策

### 5.1 データ整合性リスク

| リスク | 影響 | 対策 |
|-------|------|------|
| **トランザクション不足** | 同時更新時のデータ競合 | Prismaトランザクション使用 |
| **Playerの外部キー不整合** | roomIdがroom.idを参照 | マイグレーション時に注意 |
| **JSONカラムの型安全性** | card列のJSON解析エラー | Zodでバリデーション |

**対策コード例**:
```typescript
// トランザクション使用
await this.prisma.$transaction(async (tx) => {
  const room = await tx.room.update({
    where: { roomId },
    data: { numbersDrawn: [...numbersDrawn, number] },
  });

  const players = await tx.player.findMany({
    where: { roomId: room.id },
  });

  // 一括更新
  for (const player of players) {
    const result = this.checkBingo(player.card, room.numbersDrawn);
    await tx.player.update({
      where: { id: player.id },
      data: { isReach: result.isReach, isBingo: result.isBingo },
    });
  }
});
```

### 5.2 パフォーマンスリスク

| リスク | 影響 | 対策 |
|-------|------|------|
| **DB読み取り遅延** | In-memoryより遅い（~10-50ms） | インデックス最適化、接続プーリング |
| **N+1クエリ問題** | players取得で複数クエリ | `include` で一括読込 |
| **接続数上限** | Supabase Free Tier: 最大60接続 | 接続プール設定、有料プラン検討 |

**Prisma接続プール設定**:
```typescript
// schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  
  // 接続プール設定
  directUrl = env("DATABASE_URL")
  relationMode = "prisma"  // Supabase推奨
}
```

**`.env` の接続文字列**:
```env
# 接続プール有効化
DATABASE_URL="postgresql://postgres:pw@db.xxx.supabase.co:5432/postgres?pgbouncer=true&connection_limit=10"
```

### 5.3 移行時の後方互換性

**問題**: 既存のローカル環境がIn-memory実装

**対策**: Feature Flagで段階的移行

```typescript
// config/database.config.ts
export const USE_DATABASE = process.env.USE_DATABASE === 'true';

// game.service.ts
async getRoom(roomId: string): Promise<Room | null> {
  if (USE_DATABASE) {
    return await this.prisma.room.findUnique({
      where: { roomId: normalizedRoomId },
      include: { players: true },
    });
  } else {
    // Fallback to in-memory
    return this.rooms.get(normalizedRoomId) || null;
  }
}
```

---

## 6. テスト計画

### 6.1 ユニットテスト

```typescript
// game.service.spec.ts

describe('GameService with Prisma', () => {
  let service: GameService;
  let prisma: PrismaClient;

  beforeEach(async () => {
    prisma = new PrismaClient();
    service = new GameService(prisma);
    
    // テスト用DBクリーンアップ
    await prisma.player.deleteMany();
    await prisma.room.deleteMany();
  });

  afterEach(async () => {
    await prisma.$disconnect();
  });

  it('should create room in database', async () => {
    const roomId = await service.createRoom('host-socket-id', 'Test Room');
    
    const room = await prisma.room.findUnique({
      where: { roomId },
    });

    expect(room).not.toBeNull();
    expect(room.name).toBe('Test Room');
  });

  it('should persist player reconnection', async () => {
    const roomId = await service.createRoom('host-id', 'Room');
    const player1 = await service.joinRoom(roomId, 'socket-1', 'Player 1');
    
    // Disconnect
    await prisma.player.update({
      where: { playerId: player1.playerId },
      data: { socketId: null },
    });

    // Reconnect
    const player2 = await service.joinRoom(roomId, 'socket-2', 'Player 1', player1.playerId);
    
    expect(player2.playerId).toBe(player1.playerId);
    expect(player2.socketId).toBe('socket-2');
  });
});
```

### 6.2 統合テスト

**テストシナリオ**:
1. ゲーム作成 → 参加者join → 数字抽選 → ビンゴ達成
2. サーバー再起動後のゲーム復元
3. 100人同時参加での負荷テスト（Issue #23連携）

**実行**:
```bash
# テスト用Supabaseプロジェクトを使用
DATABASE_URL="postgresql://..." npm run test:e2e
```

---

## 7. デプロイメント戦略

### 7.1 環境別設定

#### 開発環境
```env
DATABASE_URL="postgresql://postgres:dev_password@db.dev-project.supabase.co:5432/postgres"
USE_DATABASE=true
```

#### テスト環境
```env
DATABASE_URL="postgresql://postgres:test_password@db.test-project.supabase.co:5432/postgres"
USE_DATABASE=true
```

#### 本番環境
```env
DATABASE_URL="postgresql://postgres:prod_password@db.prod-project.supabase.co:5432/postgres?pgbouncer=true&connection_limit=20"
USE_DATABASE=true
SESSION_SECRET="production-secret-key"
```

### 7.2 マイグレーション戦略

**Blue-Green Deployment**:
```mermaid
graph LR
    A[Current: In-Memory] --> B{Deploy New Version}
    B --> C[Blue: In-Memory継続]
    B --> D[Green: Supabase有効]
    D --> E{検証OK?}
    E -->|Yes| F[Traffic Switch to Green]
    E -->|No| G[Rollback to Blue]
```

**手順**:
1. 新バージョンをGreenインスタンスにデプロイ（`USE_DATABASE=true`）
2. 少数のトラフィックをGreenに流す（10%）
3. エラー率をモニタリング
4. 問題なければ100%移行
5. 問題あればBlueにロールバック

---

## 8. Supabase固有の考慮事項

### 8.1 Row Level Security (RLS)

**設定不要**: バックエンドから直接アクセスするため

> Supabase RLSはクライアント直接接続時のみ有効。  
> NestJSバックエンド経由の場合、認証はバックエンドで実施。

### 8.2 Realtime機能との統合（オプション）

**可能性**: Supabase Realtimeで `rooms` テーブル変更を購読

```typescript
// フロントエンドから直接購読（Socket.io代替案）
const subscription = supabase
  .channel('rooms')
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'rooms',
    filter: `roomId=eq.${roomId}`,
  }, (payload) => {
    console.log('Number drawn:', payload.new.numbersDrawn);
  })
  .subscribe();
```

**判断**: Socket.ioを維持する方が柔軟性高い（推奨）

### 8.3 Supabase Storage（画像保存）

**将来の拡張**: カスタムビンゴカード画像

```typescript
// 例: 企業ロゴ入りカード
const { data, error } = await supabase.storage
  .from('bingo-cards')
  .upload(`${roomId}/card-background.png`, file);
```

---

## 9. コスト試算

### Supabase料金プラン

| プラン | 価格 | DB容量 | 転送量 | 接続数 | 推奨用途 |
|--------|------|--------|--------|--------|----------|
| **Free** | $0 | 500MB | 5GB/月 | 60接続 | 開発・テスト |
| **Pro** | $25/月 | 8GB | 250GB/月 | 200接続 | 小〜中規模 |
| **Team** | $599/月 | カスタム | カスタム | カスタム | 大規模 |

**推奨**: 本番は **Pro プラン** ($25/月)
- 理由: 接続数200、十分な転送量、SLA保証

**月間コスト例**:
- 想定: 週2回イベント、各100人参加
- DB容量: ~500MB（十分）
- 転送量: ~10GB/月（十分）
- **結論**: Pro プランで対応可能

---

## 10. 実装チェックリスト

### フェーズ1: Prisma統合（必須）

- [ ] Supabaseプロジェクト作成
- [ ] DATABASE_URLを`.env`に設定
- [ ] `npx prisma migrate deploy` 実行
- [ ] `GameService`にPrismaClient注入
- [ ] `createRoom()`をPrisma実装に書き換え
- [ ] `getRoom()`をPrisma実装に書き換え
- [ ] `joinRoom()`をPrisma実装に書き換え
- [ ] `drawNumber()`をPrisma実装に書き換え
- [ ] `punchNumber()`をPrisma実装に書き換え
- [ ] `claimBingo()`をPrisma実装に書き換え
- [ ] In-memory Map削除
- [ ] ユニットテスト更新
- [ ] 統合テスト実行

### フェーズ2: テスト・検証（必須）

- [ ] ローカル環境でゲーム動作確認
- [ ] 再接続機能テスト
- [ ] 負荷テスト（Issue #23）
- [ ] バグ修正

### フェーズ3: セッション永続化（オプション）

- [ ] `connect-pg-simple`インストール
- [ ] セッションストア設定
- [ ] Admin認証テスト

### フェーズ4: 監査ログ（オプション）

- [ ] `GameEvent`モデル追加
- [ ] マイグレーション実行
- [ ] イベントロギング実装
- [ ] Supabase Dashboardで確認

### デプロイ

- [ ] 本番Supabaseプロジェクト作成
- [ ] 本番DATABASE_URL設定
- [ ] Blue-Green Deployment実施
- [ ] モニタリング設定
- [ ] Issue #24クローズ

---

## 11. まとめ

### 推奨アプローチ

✅ **段階的移行（Phased Migration）**:
1. フェーズ1（必須）: RoomとPlayerをSupabase化 → 3-5日
2. フェーズ2（必須）: テスト・検証 → 2-3日
3. フェーズ3（オプション）: セッション永続化 → 2日
4. フェーズ4（オプション）: 監査ログ → 1-2日

### 意思決定が必要な項目

1. **移行タイミング**:
   - 今すぐ開始？
   - 負荷テスト（Issue #23）完了後？

2. **オプション機能の実装**:
   - セッション永続化は必要？
   - 監査ログは必要？

3. **Supabaseプラン**:
   - Free（開発のみ）
   - Pro $25/月（本番推奨）

4. **移行戦略**:
   - ビッグバン移行（一気に切替）
   - Feature Flag経由の段階移行

---

**次のアクション**:
- [ ] ユーザーレビュー
- [ ] 移行可否の判断
- [ ] 承認後、実装開始

**関連ドキュメント**:
- [Supabaseセットアップガイド](./supabase-setup.md)
- [負荷テスト計画](./load-testing-plan.md)
- [アーキテクチャ](./architecture.md)
