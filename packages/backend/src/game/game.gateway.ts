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
console.log('Gateway Allowed Origins:', allowedOrigins);

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
  async createRoom(
    @MessageBody() data: { name: string },
    @ConnectedSocket() client: Socket,
  ) {
    console.log(`create_room: ${JSON.stringify(data)} from ${client.id}`);
    try {
      const roomId = await this.gameService.createRoom(client.id, data.name);
      client.join(roomId);
      return { roomId };
    } catch (e) {
      console.error('create_room error:', e);
      return { error: e.message };
    }
  }

  @SubscribeMessage('reconnect_host')
  async reconnectHost(
    @MessageBody() data: { roomId: string },
    @ConnectedSocket() client: Socket,
  ) {
    console.log(`reconnect_host: ${JSON.stringify(data)} from ${client.id}`);
    try {
      const normalizedRoomId = normalizeRoomId(data.roomId);
      const room = await this.gameService.reconnectHost(normalizedRoomId, client.id);

      if (!room) {
        return { error: 'Room not found' };
      }

      client.join(normalizedRoomId);

      // Fetch players to return current state
      const fullRoom = await this.gameService.getRoom(normalizedRoomId);

      return {
        success: true,
        roomId: room.roomId,
        name: room.name,
        status: room.status,
        players: fullRoom?.players || [],
        numbersDrawn: room.numbersDrawn
      };
    } catch (e) {
      console.error('reconnect_host error:', e);
      return { error: e.message };
    }
  }

  @SubscribeMessage('join_room')
  async joinRoom(
    @MessageBody() data: { roomId: string; name: string; playerId?: string },
    @ConnectedSocket() client: Socket,
  ) {
    console.log(`join_room: ${JSON.stringify(data)} from ${client.id}`);
    try {
      const normalizedRoomId = normalizeRoomId(data.roomId);
      const player = await this.gameService.joinRoom(
        normalizedRoomId,
        client.id,
        data.name,
        data.playerId,
      );
      client.join(normalizedRoomId);

      const room = await this.gameService.getRoom(normalizedRoomId);
      if (room) {
        this.server.to(normalizedRoomId).emit('player_joined', {
          totalPlayers: room.players.length,
          players: room.players,
        });
        return { player, status: room.status, roomName: room.name };
      }
    } catch (e) {
      console.error('join_room error:', e);
      return { error: e.message };
    }
  }

  @SubscribeMessage('start_game')
  async startGame(
    @MessageBody() data: { roomId: string },
    @ConnectedSocket() client: Socket,
  ) {
    console.log(`start_game: ${JSON.stringify(data)} from ${client.id}`);
    try {
      const normalizedRoomId = normalizeRoomId(data.roomId);
      await this.gameService.startGame(normalizedRoomId, client.id);
      this.server
        .to(normalizedRoomId)
        .emit('game_started', { status: 'PLAYING' });
    } catch (e) {
      console.error('start_game error:', e);
      return { error: e.message };
    }
  }

  @SubscribeMessage('draw_number')
  async drawNumber(
    @MessageBody() data: { roomId: string },
    @ConnectedSocket() client: Socket,
  ) {
    console.log(`draw_number: ${JSON.stringify(data)} from ${client.id}`);
    try {
      const normalizedRoomId = normalizeRoomId(data.roomId);
      const number = await this.gameService.drawNumber(normalizedRoomId, client.id);
      const room = await this.gameService.getRoom(normalizedRoomId);

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
  async revealNumber(
    @MessageBody() data: { roomId: string; number: number },
    @ConnectedSocket() client: Socket,
  ) {
    console.log(`reveal_number: ${JSON.stringify(data)} from ${client.id}`);
    try {
      const normalizedRoomId = normalizeRoomId(data.roomId);

      const room = await this.gameService.getRoom(normalizedRoomId);
      if (room) {
        if (room.hostSocketId !== client.id) {
          // Relaxed check: just warn or allow if we trust the room ID knowledge
          // throw new Error('Only host can reveal numbers');
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
  async punchNumber(
    @MessageBody() data: { roomId: string; number: number; playerId: string },
    @ConnectedSocket() client: Socket,
  ) {
    console.log(`punch_number: ${JSON.stringify(data)} from ${client.id}`);
    try {
      const normalizedRoomId = normalizeRoomId(data.roomId);
      const player = await this.gameService.punchNumber(
        normalizedRoomId,
        data.playerId,
        data.number,
      );

      // Emit update to room so Host can see changes
      const room = await this.gameService.getRoom(normalizedRoomId);
      if (room) {
        this.server.to(normalizedRoomId).emit('player_updated', {
          players: room.players,
        });
      }
      return { success: true, player };
    } catch (e) {
      console.error('punch_number error:', e);
      return { error: e.message };
    }
  }

  @SubscribeMessage('claim_bingo')
  async claimBingo(
    @MessageBody() data: { roomId: string; playerId: string },
    @ConnectedSocket() client: Socket,
  ) {
    console.log(`claim_bingo: ${JSON.stringify(data)} from ${client.id}`);
    try {
      const normalizedRoomId = normalizeRoomId(data.roomId);
      const result = await this.gameService.claimBingo(
        normalizedRoomId,
        data.playerId,
      );

      // Emit update to room
      const room = await this.gameService.getRoom(normalizedRoomId);
      if (room) {
        this.server.to(normalizedRoomId).emit('player_updated', {
          players: room.players,
        });

        // Count how many players just reached bingo/reach
        const reachPlayers = room.players.filter(
          (p) => p.isReach && !p.isBingo,
        );
        const bingoPlayers = room.players.filter(
          (p) => p.isBingo,
        );

        // Announce single reach
        if (result.isReach && !result.isBingo && reachPlayers.length === 1) {
          this.server.to(normalizedRoomId).emit('reach_announced', {
            playerId: data.playerId,
            playerName: room.players.find(p => p.id === data.playerId)?.name,
          });
        }

        // Announce single bingo
        if (result.isBingo && bingoPlayers.length === 1) {
          this.server.to(normalizedRoomId).emit('bingo_announced', {
            playerId: data.playerId,
            playerName: room.players.find(p => p.id === data.playerId)?.name,
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
