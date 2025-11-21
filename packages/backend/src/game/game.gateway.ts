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
    createRoom(@ConnectedSocket() client: Socket) {
        const roomId = this.gameService.createRoom(client.id);
        client.join(roomId);
        return { roomId };
    }

    @SubscribeMessage('join_room')
    joinRoom(
        @MessageBody() data: { roomId: string; name: string },
        @ConnectedSocket() client: Socket,
    ) {
        try {
            const player = this.gameService.joinRoom(data.roomId, client.id, data.name);
            client.join(data.roomId);

            const room = this.gameService.getRoom(data.roomId);
            if (room) {
                this.server.to(data.roomId).emit('player_joined', {
                    totalPlayers: room.players.size,
                    players: Array.from(room.players.values()),
                });
                return { player, status: room.status };
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
}
