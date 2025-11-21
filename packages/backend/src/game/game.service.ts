import { Injectable } from '@nestjs/common';
import { Room, Player } from './game.types';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class GameService {
    private rooms: Map<string, Room> = new Map();

    createRoom(hostId: string): string {
        const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
        this.rooms.set(roomId, {
            roomId,
            status: 'WAITING',
            numbersDrawn: [],
            players: new Map(),
            hostId,
        });
        return roomId;
    }

    getRoom(roomId: string): Room | undefined {
        return this.rooms.get(roomId);
    }

    joinRoom(roomId: string, playerId: string, name: string): Player {
        const room = this.rooms.get(roomId);
        if (!room) {
            throw new Error('Room not found');
        }

        // Generate Bingo Card
        const card = this.generateBingoCard();

        const player: Player = {
            id: playerId,
            name,
            card,
            isReach: false,
            isBingo: false,
        };

        room.players.set(playerId, player);
        return player;
    }

    startGame(roomId: string, hostId: string) {
        const room = this.rooms.get(roomId);
        if (!room) throw new Error('Room not found');
        if (room.hostId !== hostId) throw new Error('Only host can start game');
        room.status = 'PLAYING';
    }

    drawNumber(roomId: string, hostId: string): number {
        const room = this.rooms.get(roomId);
        if (!room) throw new Error('Room not found');
        if (room.hostId !== hostId) throw new Error('Only host can draw numbers');

        let number;
        do {
            number = Math.floor(Math.random() * 75) + 1;
        } while (room.numbersDrawn.includes(number));

        room.numbersDrawn.push(number);
        return number;
    }

    private generateBingoCard(): number[][] {
        const card: number[][] = [];
        const cols = [
            this.shuffle(Array.from({ length: 15 }, (_, i) => i + 1)),
            this.shuffle(Array.from({ length: 15 }, (_, i) => i + 16)),
            this.shuffle(Array.from({ length: 15 }, (_, i) => i + 31)),
            this.shuffle(Array.from({ length: 15 }, (_, i) => i + 46)),
            this.shuffle(Array.from({ length: 15 }, (_, i) => i + 61)),
        ];

        for (let i = 0; i < 5; i++) {
            card[i] = [];
            for (let j = 0; j < 5; j++) {
                if (i === 2 && j === 2) {
                    card[i][j] = 0; // FREE
                } else {
                    card[i][j] = cols[j].pop()!;
                }
            }
        }
        return card;
    }

    private shuffle(array: number[]): number[] {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    // TODO: Add validation for punch and bingo claim
}
