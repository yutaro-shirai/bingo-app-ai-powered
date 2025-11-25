import { Injectable } from '@nestjs/common';
import { Room, Player } from './game.types';
import { v4 as uuidv4 } from 'uuid';


@Injectable()
export class GameService {
    private rooms: Map<string, Room> = new Map();

    createRoom(hostId: string, name: string): string {
        const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
        this.rooms.set(roomId, {
            roomId,
            status: 'WAITING',
            numbersDrawn: [],
            players: new Map(),
            hostId,
            name,
        });
        return roomId;
    }

    getRoom(roomId: string): Room | undefined {
        return this.rooms.get(roomId);
    }

    joinRoom(roomId: string, socketId: string, name: string, existingPlayerId?: string): Player {
        const room = this.rooms.get(roomId);
        if (!room) {
            throw new Error('Room not found');
        }

        // Check if player is reconnecting
        if (existingPlayerId) {
            const existingPlayer = room.players.get(existingPlayerId);
            if (existingPlayer) {
                // Update socket ID and return existing state
                existingPlayer.socketId = socketId;
                return existingPlayer;
            }
        }

        // New Player
        const playerId = uuidv4();
        // Generate Bingo Card
        const card = this.generateBingoCard();

        const player: Player = {
            id: playerId,
            socketId,
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

    punchNumber(roomId: string, playerId: string, number: number): Player {
        const room = this.rooms.get(roomId);
        if (!room) throw new Error('Room not found');

        const player = room.players.get(playerId);
        if (!player) throw new Error('Player not found');

        // Validation: Number must be drawn
        if (!room.numbersDrawn.includes(number)) {
            throw new Error('Number not drawn yet');
        }

        // Validation: Number must be on card
        let found = false;
        for (let i = 0; i < 5; i++) {
            for (let j = 0; j < 5; j++) {
                if (player.card[i][j] === number) {
                    found = true;
                    // We could mark it here if we had a marked matrix, 
                    // but for now we validate against numbersDrawn during bingo check
                    break;
                }
            }
        }
        if (!found) throw new Error('Number not on card');

        return player;
    }

    claimBingo(roomId: string, playerId: string): { isBingo: boolean; isReach: boolean; reachCount: number } {
        const room = this.rooms.get(roomId);
        if (!room) throw new Error('Room not found');

        const player = room.players.get(playerId);
        if (!player) throw new Error('Player not found');

        const { isBingo, isReach, reachCount } = this.checkBingo(player.card, room.numbersDrawn);

        if (isBingo) player.isBingo = true;
        if (isReach) player.isReach = true;

        return { isBingo, isReach, reachCount };
    }

    private checkBingo(card: number[][], numbersDrawn: number[]): { isBingo: boolean; isReach: boolean; reachCount: number } {
        const size = 5;
        let isBingo = false;
        let reachCount = 0;

        // Helper to check if a cell is marked (drawn or free)
        const isMarked = (row: number, col: number) => {
            const val = card[row][col];
            return val === 0 || numbersDrawn.includes(val);
        };

        // Check rows
        for (let i = 0; i < size; i++) {
            let count = 0;
            for (let j = 0; j < size; j++) {
                if (isMarked(i, j)) count++;
            }
            if (count === 5) isBingo = true;
            if (count === 4) reachCount++;
        }

        // Check cols
        for (let j = 0; j < size; j++) {
            let count = 0;
            for (let i = 0; i < size; i++) {
                if (isMarked(i, j)) count++;
            }
            if (count === 5) isBingo = true;
            if (count === 4) reachCount++;
        }

        // Check diagonals
        let diag1 = 0;
        let diag2 = 0;
        for (let i = 0; i < size; i++) {
            if (isMarked(i, i)) diag1++;
            if (isMarked(i, size - 1 - i)) diag2++;
        }
        if (diag1 === 5 || diag2 === 5) isBingo = true;
        if (diag1 === 4) reachCount++;
        if (diag2 === 4) reachCount++;

        const isReach = reachCount > 0;
        return { isBingo, isReach, reachCount };
    }
}
