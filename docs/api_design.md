# API & WebSocket Design

## WebSocket Events (Socket.io)

### Namespace: `/` (Default)

#### Client -> Server (Events emitted by Client)
| Event Name | Payload | Description |
| :--- | :--- | :--- |
| `join_room` | `{ roomId: string, name: string, identity: 'host' \| 'participant' }` | Join a game room. |
| `start_game` | `{ roomId: string }` | (Host only) Start the game. |
| `draw_number` | `{ roomId: string }` | (Host only) Draw a new number. |
| `punch_card` | `{ roomId: string, number: number }` | (Participant only) Punch a number on the card. |
| `claim_bingo` | `{ roomId: string }` | (Participant only) Claim Bingo. |

#### Server -> Client (Events received by Client)
| Event Name | Payload | Description |
| :--- | :--- | :--- |
| `player_joined` | `{ totalPlayers: number, players: Player[] }` | Broadcast when a player joins. |
| `game_started` | `{ status: 'PLAYING' }` | Broadcast when game starts. |
| `number_drawn` | `{ number: number, history: number[] }` | Broadcast when a number is drawn. |
| `card_punched` | `{ playerId: string }` | (Optional) Notify host of progress. |
| `reach_update` | `{ totalReach: number }` | Broadcast count of players in Reach. |
| `bingo_update` | `{ totalBingo: number, winners: Player[] }` | Broadcast Bingo winners. |
| `error` | `{ message: string }` | Error notification. |

## Data Structures

### Player
```typescript
interface Player {
  id: string; // Socket ID or UUID
  name: string;
  card: number[][]; // 5x5 matrix
  isReach: boolean;
  isBingo: boolean;
}
```

### Room
```typescript
interface Room {
  roomId: string;
  status: 'WAITING' | 'PLAYING' | 'ENDED';
  numbersDrawn: number[];
  players: Player[];
}
```
