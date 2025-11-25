import {
    WebSocketGateway,
    SubscribeMessage,
    MessageBody,
    ConnectedSocket,
    WebSocketServer,
    OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { GameService } from './game.service';

@WebSocketGateway({
    cors: {
        origin: '*',
    },
})
export class GameGateway implements OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    constructor(private readonly gameService: GameService) { }

    handleDisconnect(client: Socket) {
        console.log(`Client disconnected: ${client.id}`);
    }

    @SubscribeMessage('create_room')
    createRoom(
        @MessageBody() data: { name: string },
        @ConnectedSocket() client: Socket
    ) {
        const roomId = this.gameService.createRoom(client.id, data.name);
        client.join(roomId);
        return { roomId };
    }

    @SubscribeMessage('join_room')
    joinRoom(
        @MessageBody() data: { roomId: string; name: string; playerId?: string },
        @ConnectedSocket() client: Socket,
    ) {
        try {
            const player = this.gameService.joinRoom(data.roomId, client.id, data.name, data.playerId);
            client.join(data.roomId);

            const room = this.gameService.getRoom(data.roomId);
            if (room) {
                this.server.to(data.roomId).emit('player_joined', {
                    totalPlayers: room.players.size,
                    players: Array.from(room.players.values()),
                });
                return { player, status: room.status, roomName: room.name };
            }
        } catch (e) {
            return { error: e.message };
        }
    }

    @SubscribeMessage('start_game')
    startGame(
        @MessageBody() data: { roomId: string },
        @ConnectedSocket() client: Socket,
    ) {
        try {
            this.gameService.startGame(data.roomId, client.id);
            this.server.to(data.roomId).emit('game_started', { status: 'PLAYING' });
        } catch (e) {
            return { error: e.message };
        }
    }

    @SubscribeMessage('draw_number')
    drawNumber(
        @MessageBody() data: { roomId: string },
        @ConnectedSocket() client: Socket,
    ) {
        try {
            const number = this.gameService.drawNumber(data.roomId, client.id);
            const room = this.gameService.getRoom(data.roomId);
            if (room) {
                this.server.to(data.roomId).emit('number_drawn', {
                    number,
                    history: room.numbersDrawn,
                });
            }
        } catch (e) {
            return { error: e.message };
        }
    }
    @SubscribeMessage('punch_number')
    punchNumber(
        @MessageBody() data: { roomId: string; number: number; playerId: string },
        @ConnectedSocket() client: Socket,
    ) {
        try {
            // Use playerId from data if available (for persistent session), otherwise fallback to client.id (though service now expects persistent ID if we changed it? No, service joinRoom returns persistent ID, but punchNumber takes playerId. We should probably use the persistent ID.)
            // The frontend should send the persistent playerId.
            const player = this.gameService.punchNumber(data.roomId, data.playerId, data.number);

            // Emit update to room so Host can see changes
            const room = this.gameService.getRoom(data.roomId);
            if (room) {
                this.server.to(data.roomId).emit('player_updated', {
                    players: Array.from(room.players.values()),
                });
            }
            return { success: true, player };
        } catch (e) {
            return { error: e.message };
        }
    }

    @SubscribeMessage('claim_bingo')
    claimBingo(
        @MessageBody() data: { roomId: string; playerId: string },
        @ConnectedSocket() client: Socket,
    ) {
        try {
            const result = this.gameService.claimBingo(data.roomId, data.playerId);

            // Emit update to room
            const room = this.gameService.getRoom(data.roomId);
            if (room) {
                this.server.to(data.roomId).emit('player_updated', {
                    players: Array.from(room.players.values()),
                });

                // Count how many players just reached bingo/reach
                const reachPlayers = Array.from(room.players.values()).filter(p => p.isReach && !p.isBingo);
                const bingoPlayers = Array.from(room.players.values()).filter(p => p.isBingo);

                // Announce single reach
                if (result.isReach && !result.isBingo && reachPlayers.length === 1) {
                    this.server.to(data.roomId).emit('reach_announced', {
                        playerId: data.playerId,
                        playerName: room.players.get(data.playerId)?.name,
                    });
                }

                // Announce single bingo
                if (result.isBingo && bingoPlayers.length === 1) {
                    this.server.to(data.roomId).emit('bingo_announced', {
                        playerId: data.playerId,
                        playerName: room.players.get(data.playerId)?.name,
                    });
                }
            }
            return { success: true, result };
        } catch (e) {
            return { error: e.message };
        }
    }
}
