import { Injectable } from '@nestjs/common';
import { Room, Player } from './game.types';
import { v4 as uuidv4 } from 'uuid';
import {
  ensureSafePlayerName,
  ensureSafeRoomName,
  normalizeRoomId,
} from './security.util';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class GameService {
  constructor(private prisma: PrismaService) { }

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
    const room = await this.prisma.room.findUnique({
      where: { roomId: normalizedRoomId },
      include: { players: true },
    });

    if (!room) return null;

    return {
      ...room,
      players: room.players.map((p) => this.toGamePlayer(p)),
    };
  }

  async joinRoom(
    roomId: string,
    socketId: string,
    name: string,
    existingPlayerId?: string,
  ): Promise<Player> {
    const normalizedRoomId = normalizeRoomId(roomId);
    const room = await this.prisma.room.findUnique({
      where: { roomId: normalizedRoomId },
    });

    if (!room) {
      throw new Error('Room not found');
    }

    const safeName = ensureSafePlayerName(name);

    // Check if player is reconnecting
    if (existingPlayerId) {
      const existingPlayer = await this.prisma.player.findUnique({
        where: { playerId: existingPlayerId },
      });

      if (existingPlayer && existingPlayer.roomId === room.id) {
        // Update socket ID and name if changed
        const updated = await this.prisma.player.update({
          where: { id: existingPlayer.id },
          data: {
            socketId,
            name: safeName,
          },
        });
        return this.toGamePlayer(updated);
      }
    }

    // New Player
    const playerId = uuidv4(); // Client-side ID
    const card = this.generateBingoCard();

    const player = await this.prisma.player.create({
      data: {
        playerId,
        socketId,
        name: safeName,
        card: card as any,
        roomId: room.id,
      },
    });

    return this.toGamePlayer(player);
  }

  async startGame(roomId: string, hostSocketId: string) {
    const normalizedRoomId = normalizeRoomId(roomId);
    const room = await this.prisma.room.findUnique({
      where: { roomId: normalizedRoomId },
    });

    if (!room) throw new Error('Room not found');

    // RELAXED CHECK for reconnects: Update host socket ID
    await this.prisma.room.update({
      where: { id: room.id },
      data: {
        status: 'PLAYING',
        hostSocketId: hostSocketId
      },
    });
  }

  async drawNumber(roomId: string, hostSocketId: string): Promise<number> {
    const normalizedRoomId = normalizeRoomId(roomId);
    const room = await this.prisma.room.findUnique({
      where: { roomId: normalizedRoomId },
    });

    if (!room) throw new Error('Room not found');

    // Update host socket ID just in case
    if (room.hostSocketId !== hostSocketId) {
      // Log warning or allow? Let's allow and update for robustness
    }

    let number;
    do {
      number = Math.floor(Math.random() * 75) + 1;
    } while (room.numbersDrawn.includes(number));

    await this.prisma.room.update({
      where: { id: room.id },
      data: {
        numbersDrawn: {
          push: number,
        },
        hostSocketId: hostSocketId, // Keep host socket ID fresh
      },
    });

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

  async punchNumber(roomId: string, playerId: string, number: number): Promise<Player> {
    const normalizedRoomId = normalizeRoomId(roomId);
    const room = await this.prisma.room.findUnique({
      where: { roomId: normalizedRoomId },
    });
    if (!room) throw new Error('Room not found');

    const player = await this.prisma.player.findUnique({
      where: { playerId },
    });
    if (!player) throw new Error('Player not found');

    // Validation: Number must be drawn
    if (!room.numbersDrawn.includes(number)) {
      throw new Error('Number not drawn yet');
    }

    // Validation: Number must be on card
    const card = player.card as unknown as number[][];
    let found = false;
    for (let i = 0; i < 5; i++) {
      for (let j = 0; j < 5; j++) {
        if (card[i][j] === number) {
          found = true;
          break;
        }
      }
    }
    if (!found) throw new Error('Number not on card');

    // No state change needed for punch itself in this simple logic, 
    // but we might want to record punched numbers if we were tracking them explicitly.
    // For now, we just return the player.
    return this.toGamePlayer(player);
  }

  async claimBingo(
    roomId: string,
    playerId: string,
  ): Promise<{ isBingo: boolean; isReach: boolean; reachCount: number }> {
    const normalizedRoomId = normalizeRoomId(roomId);
    const room = await this.prisma.room.findUnique({
      where: { roomId: normalizedRoomId },
    });
    if (!room) throw new Error('Room not found');

    const player = await this.prisma.player.findUnique({
      where: { playerId },
    });
    if (!player) throw new Error('Player not found');

    const card = player.card as unknown as number[][];
    const { isBingo, isReach, reachCount } = this.checkBingo(
      card,
      room.numbersDrawn,
    );

    if (isBingo !== player.isBingo || isReach !== player.isReach) {
      await this.prisma.player.update({
        where: { id: player.id },
        data: {
          isBingo,
          isReach
        }
      });
    }

    return { isBingo, isReach, reachCount };
  }

  private checkBingo(
    card: number[][],
    numbersDrawn: number[],
  ): { isBingo: boolean; isReach: boolean; reachCount: number } {
    const size = 5;
    let bingoCount = 0;
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
      if (count === 5) {
        bingoCount++;
      } else if (count === 4) {
        reachCount++;
      }
    }

    // Check cols
    for (let j = 0; j < size; j++) {
      let count = 0;
      for (let i = 0; i < size; i++) {
        if (isMarked(i, j)) count++;
      }
      if (count === 5) {
        bingoCount++;
      } else if (count === 4) {
        reachCount++;
      }
    }

    // Check diagonals
    let diag1 = 0;
    let diag2 = 0;
    for (let i = 0; i < size; i++) {
      if (isMarked(i, i)) diag1++;
      if (isMarked(i, size - 1 - i)) diag2++;
    }
    if (diag1 === 5) {
      bingoCount++;
    } else if (diag1 === 4) {
      reachCount++;
    }
    if (diag2 === 5) {
      bingoCount++;
    } else if (diag2 === 4) {
      reachCount++;
    }

    const isBingo = bingoCount > 0;
    const isReach = reachCount > 0;
    return { isBingo, isReach, reachCount };
  }

  private toGamePlayer(player: any): Player {
    return {
      ...player,
      id: player.playerId,
      card: player.card as unknown as number[][],
    };
  }
}
