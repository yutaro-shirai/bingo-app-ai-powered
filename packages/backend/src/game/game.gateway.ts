import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  WebSocketServer,
  OnGatewayDisconnect,
  OnGatewayConnection,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { GameService } from './game.service';
import { getAllowedOrigins } from '../config/origin.util';
import { normalizeRoomId } from './security.util';

const allowedOrigins = getAllowedOrigins();

@WebSocketGateway({
  cors: {
    origin: allowedOrigins,
    credentials: true,
  },
})
export class GameGateway implements OnGatewayDisconnect, OnGatewayConnection {
  @WebSocketServer()
  server: Server;

  constructor(private readonly gameService: GameService) { }

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('create_room')
  createRoom(
    @MessageBody() data: { name: string },
    @ConnectedSocket() client: Socket,
  ) {
    console.log(`create_room: ${JSON.stringify(data)} from ${client.id}`);
    try {
      const roomId = this.gameService.createRoom(client.id, data.name);
      client.join(roomId);
      return { roomId };
    } catch (e) {
      console.error('create_room error:', e);
      return { error: e.message };
    }
  }

  @SubscribeMessage('join_room')
  joinRoom(
    @MessageBody() data: { roomId: string; name: string; playerId?: string },
    @ConnectedSocket() client: Socket,
  ) {
    console.log(`join_room: ${JSON.stringify(data)} from ${client.id}`);
    try {
      const normalizedRoomId = normalizeRoomId(data.roomId);
      const player = this.gameService.joinRoom(
        normalizedRoomId,
        client.id,
        data.name,
        data.playerId,
      );
      client.join(normalizedRoomId);

      const room = this.gameService.getRoom(normalizedRoomId);
      if (room) {
        this.server.to(normalizedRoomId).emit('player_joined', {
          totalPlayers: room.players.size,
          players: Array.from(room.players.values()),
        });
        return { player, status: room.status, roomName: room.name };
      }
    } catch (e) {
      console.error('join_room error:', e);
      return { error: e.message };
    }
  }

  @SubscribeMessage('start_game')
  startGame(
    @MessageBody() data: { roomId: string },
    @ConnectedSocket() client: Socket,
  ) {
    console.log(`start_game: ${JSON.stringify(data)} from ${client.id}`);
    try {
      const normalizedRoomId = normalizeRoomId(data.roomId);
      this.gameService.startGame(normalizedRoomId, client.id);
      this.server
        .to(normalizedRoomId)
        .emit('game_started', { status: 'PLAYING' });
    } catch (e) {
      console.error('start_game error:', e);
      return { error: e.message };
    }
  }

  @SubscribeMessage('draw_number')
  drawNumber(
    @MessageBody() data: { roomId: string },
    @ConnectedSocket() client: Socket,
  ) {
    console.log(`draw_number: ${JSON.stringify(data)} from ${client.id}`);
    try {
      const normalizedRoomId = normalizeRoomId(data.roomId);
      const number = this.gameService.drawNumber(normalizedRoomId, client.id);
      const room = this.gameService.getRoom(normalizedRoomId);

      // Return number to host, but don't emit to room yet (wait for animation)
      return {
        success: true,
        number,
        history: room?.numbersDrawn || []
      };
    } catch (e) {
      console.error('draw_number error:', e);
      return { error: e.message };
    }
  }

  @SubscribeMessage('reveal_number')
  revealNumber(
    @MessageBody() data: { roomId: string; number: number },
    @ConnectedSocket() client: Socket,
  ) {
    console.log(`reveal_number: ${JSON.stringify(data)} from ${client.id}`);
    try {
      const normalizedRoomId = normalizeRoomId(data.roomId);

      const room = this.gameService.getRoom(normalizedRoomId);
      if (room) {
        if (room.hostId !== client.id) {
          throw new Error('Only host can reveal numbers');
        }

        this.server.to(normalizedRoomId).emit('number_drawn', {
          number: data.number,
          history: room.numbersDrawn,
        });
      }
      return { success: true };
    } catch (e) {
      console.error('reveal_number error:', e);
      return { error: e.message };
    }
  }

  @SubscribeMessage('punch_number')
  punchNumber(
    @MessageBody() data: { roomId: string; number: number; playerId: string },
    @ConnectedSocket() client: Socket,
  ) {
    console.log(`punch_number: ${JSON.stringify(data)} from ${client.id}`);
    try {
      const normalizedRoomId = normalizeRoomId(data.roomId);
      const player = this.gameService.punchNumber(
        normalizedRoomId,
        data.playerId,
        data.number,
      );

      // Emit update to room so Host can see changes
      const room = this.gameService.getRoom(normalizedRoomId);
      if (room) {
        this.server.to(normalizedRoomId).emit('player_updated', {
          players: Array.from(room.players.values()),
        });
      }
      return { success: true, player };
    } catch (e) {
      console.error('punch_number error:', e);
      return { error: e.message };
    }
  }

  @SubscribeMessage('claim_bingo')
  claimBingo(
    @MessageBody() data: { roomId: string; playerId: string },
    @ConnectedSocket() client: Socket,
  ) {
    console.log(`claim_bingo: ${JSON.stringify(data)} from ${client.id}`);
    try {
      const normalizedRoomId = normalizeRoomId(data.roomId);
      const result = this.gameService.claimBingo(
        normalizedRoomId,
        data.playerId,
      );

      // Emit update to room
      const room = this.gameService.getRoom(normalizedRoomId);
      if (room) {
        this.server.to(normalizedRoomId).emit('player_updated', {
          players: Array.from(room.players.values()),
        });

        // Count how many players just reached bingo/reach
        const reachPlayers = Array.from(room.players.values()).filter(
          (p) => p.isReach && !p.isBingo,
        );
        const bingoPlayers = Array.from(room.players.values()).filter(
          (p) => p.isBingo,
        );

        // Announce single reach
        if (result.isReach && !result.isBingo && reachPlayers.length === 1) {
          this.server.to(normalizedRoomId).emit('reach_announced', {
            playerId: data.playerId,
            playerName: room.players.get(data.playerId)?.name,
          });
        }

        // Announce single bingo
        if (result.isBingo && bingoPlayers.length === 1) {
          this.server.to(normalizedRoomId).emit('bingo_announced', {
            playerId: data.playerId,
            playerName: room.players.get(data.playerId)?.name,
          });
        }
      }
      return { success: true, result };
    } catch (e) {
      console.error('claim_bingo error:', e);
      return { error: e.message };
    }
  }
}
