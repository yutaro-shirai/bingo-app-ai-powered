import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { Room, Player } from './game.types';
import { v4 as uuidv4 } from 'uuid';
import {
  ensureSafePlayerName,
  ensureSafeRoomName,
  normalizeRoomId,
} from './security.util';

@Injectable()
export class GameService implements OnModuleInit, OnModuleDestroy {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  async onModuleInit() {
    await this.prisma.$connect();
  }

  async onModuleDestroy() {
    await this.prisma.$disconnect();
  }

  private parseNumbersDrawn(raw: string | number[]): number[] {
    if (Array.isArray(raw)) return raw;
    try {
      return JSON.parse(raw as string);
    } catch {
      return [];
    }
  }

  private parseCard(raw: string | number[][]): number[][] {
    if (Array.isArray(raw)) return raw;
    try {
      return JSON.parse(raw as string);
    } catch {
      return [];
    }
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
        numbersDrawn: '[]',
      },
    });

    return roomId;
  }

  async getAllRooms(): Promise<any[]> {
    const rooms = await this.prisma.room.findMany({
      include: {
        players: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return rooms.map((room) => ({
      roomId: room.roomId,
      name: room.name,
      status: room.status,
      createdAt: room.createdAt,
      playerCount: room.players.length,
      bingoCount: room.players.filter((p) => p.isBingo).length,
      reachCount: room.players.filter((p) => p.isReach).length,
    }));
  }

  async getRoom(roomId: string): Promise<Room | null> {
    const normalizedRoomId = normalizeRoomId(roomId);

    const room = await this.prisma.room.findUnique({
      where: { roomId: normalizedRoomId },
      include: { players: true },
    });

    if (!room) return null;

    return {
      id: room.id,
      roomId: room.roomId,
      name: room.name,
      hostSocketId: room.hostSocketId,
      status: room.status,
      numbersDrawn: this.parseNumbersDrawn(room.numbersDrawn),
      players: room.players.map((p) => ({
        id: p.playerId,
        socketId: p.socketId,
        name: p.name,
        card: this.parseCard(p.card),
        isReach: p.isReach,
        isBingo: p.isBingo,
        bingoOrder: p.bingoOrder,
        roomId: room.id,
      })),
    };
  }

  async joinRoom(
    roomId: string,
    socketId: string,
    name: string,
    existingPlayerId?: string,
  ): Promise<Player> {
    const normalizedRoomId = normalizeRoomId(roomId);
    const safeName = ensureSafePlayerName(name);

    const room = await this.prisma.room.findUnique({
      where: { roomId: normalizedRoomId },
    });

    if (!room) {
      throw new Error('Room not found');
    }

    if (existingPlayerId) {
      const existingPlayer = await this.prisma.player.findUnique({
        where: { playerId: existingPlayerId },
      });

      if (!existingPlayer) {
        throw new Error('Player not found');
      }

      if (existingPlayer.roomId !== room.id) {
        throw new Error('Player does not belong to this room');
      }

      const updatedPlayer = await this.prisma.player.update({
        where: { playerId: existingPlayerId },
        data: {
          socketId,
          name: safeName,
        },
      });

      return {
        id: updatedPlayer.playerId,
        socketId: updatedPlayer.socketId,
        name: updatedPlayer.name,
        card: this.parseCard(updatedPlayer.card),
        isReach: updatedPlayer.isReach,
        isBingo: updatedPlayer.isBingo,
        bingoOrder: updatedPlayer.bingoOrder,
        roomId: room.id,
      };
    }

    const playerId = uuidv4();
    const card = this.generateBingoCard();

    const newPlayer = await this.prisma.player.create({
      data: {
        playerId,
        roomId: room.id,
        name: safeName,
        card: JSON.stringify(card),
        socketId,
      },
    });

    return {
      id: newPlayer.playerId,
      socketId: newPlayer.socketId,
      name: newPlayer.name,
      card: this.parseCard(newPlayer.card),
      isReach: newPlayer.isReach,
      isBingo: newPlayer.isBingo,
      bingoOrder: newPlayer.bingoOrder,
      roomId: room.id,
    };
  }

  async startGame(roomId: string, hostSocketId: string) {
    const normalizedRoomId = normalizeRoomId(roomId);

    const room = await this.prisma.room.findUnique({
      where: { roomId: normalizedRoomId },
    });

    if (!room) throw new Error('Room not found');

    await this.prisma.room.update({
      where: { roomId: normalizedRoomId },
      data: {
        status: 'PLAYING',
        hostSocketId,
      },
    });
  }

  async reconnectHost(roomId: string, hostSocketId: string) {
    const normalizedRoomId = normalizeRoomId(roomId);

    const room = await this.prisma.room.findUnique({
      where: { roomId: normalizedRoomId },
    });

    if (!room) throw new Error('Room not found');

    await this.prisma.room.update({
      where: { roomId: normalizedRoomId },
      data: { hostSocketId },
    });

    return await this.getRoom(roomId);
  }

  async drawNumber(roomId: string, hostSocketId: string): Promise<number> {
    const normalizedRoomId = normalizeRoomId(roomId);

    const room = await this.prisma.room.findUnique({
      where: { roomId: normalizedRoomId },
    });

    if (!room) throw new Error('Room not found');

    if (room.hostSocketId !== hostSocketId) {
      await this.prisma.room.update({
        where: { roomId: normalizedRoomId },
        data: { hostSocketId },
      });
    }

    const numbersDrawn = this.parseNumbersDrawn(room.numbersDrawn);

    let number;
    do {
      number = Math.floor(Math.random() * 75) + 1;
    } while (numbersDrawn.includes(number));

    const updatedNumbers = [...numbersDrawn, number];

    await this.prisma.room.update({
      where: { roomId: normalizedRoomId },
      data: {
        numbersDrawn: JSON.stringify(updatedNumbers),
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

    const numbersDrawn = this.parseNumbersDrawn(room.numbersDrawn);
    if (!numbersDrawn.includes(number)) {
      throw new Error('Number not drawn yet');
    }

    const card = this.parseCard(player.card);
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

    return {
      id: player.playerId,
      socketId: player.socketId,
      name: player.name,
      card,
      isReach: player.isReach,
      isBingo: player.isBingo,
      bingoOrder: player.bingoOrder,
      roomId: room.id,
    };
  }

  async claimBingo(
    roomId: string,
    playerId: string,
  ): Promise<{ isBingo: boolean; isReach: boolean; reachCount: number; bingoCount: number }> {
    const normalizedRoomId = normalizeRoomId(roomId);

    const room = await this.prisma.room.findUnique({
      where: { roomId: normalizedRoomId },
      include: { players: true },
    });
    if (!room) throw new Error('Room not found');

    const player = await this.prisma.player.findUnique({
      where: { playerId },
    });
    if (!player) throw new Error('Player not found');

    const numbersDrawn = this.parseNumbersDrawn(room.numbersDrawn);
    const { isBingo, isReach, reachCount, bingoCount } = this.checkBingo(
      this.parseCard(player.card),
      numbersDrawn,
    );

    let newBingoOrder = player.bingoOrder;
    if (isBingo && player.bingoOrder === null) {
      const existingBingoCount = room.players.filter(
        (p) => p.isBingo && p.bingoOrder !== null,
      ).length;
      newBingoOrder = existingBingoCount + 1;
    }

    await this.prisma.player.update({
      where: { playerId },
      data: {
        isBingo,
        isReach,
        bingoOrder: newBingoOrder,
      },
    });

    return { isBingo, isReach, reachCount, bingoCount };
  }

  private checkBingo(
    card: number[][],
    numbersDrawn: number[],
  ): { isBingo: boolean; isReach: boolean; reachCount: number; bingoCount: number; reachNumbers: number[] } {
    const size = 5;
    let bingoCount = 0;
    const reachNumbers = new Set<number>();

    const isMarked = (r: number, c: number) => {
      if (r === 2 && c === 2) return true;
      return numbersDrawn.includes(card[r][c]);
    };

    for (let i = 0; i < size; i++) {
      let count = 0;
      let missingNum = -1;
      for (let j = 0; j < size; j++) {
        if (isMarked(i, j)) {
          count++;
        } else {
          missingNum = card[i][j];
        }
      }
      if (count === 5) {
        bingoCount++;
      } else if (count === 4) {
        if (missingNum !== -1) reachNumbers.add(missingNum);
      }
    }

    for (let j = 0; j < size; j++) {
      let count = 0;
      let missingNum = -1;
      for (let i = 0; i < size; i++) {
        if (isMarked(i, j)) {
          count++;
        } else {
          missingNum = card[i][j];
        }
      }
      if (count === 5) {
        bingoCount++;
      } else if (count === 4) {
        if (missingNum !== -1) reachNumbers.add(missingNum);
      }
    }

    let diag1 = 0;
    let missingDiag1 = -1;
    let diag2 = 0;
    let missingDiag2 = -1;

    for (let i = 0; i < size; i++) {
      if (isMarked(i, i)) {
        diag1++;
      } else {
        missingDiag1 = card[i][i];
      }

      if (isMarked(i, size - 1 - i)) {
        diag2++;
      } else {
        missingDiag2 = card[i][size - 1 - i];
      }
    }

    if (diag1 === 5) {
      bingoCount++;
    } else if (diag1 === 4) {
      if (missingDiag1 !== -1) reachNumbers.add(missingDiag1);
    }

    if (diag2 === 5) {
      bingoCount++;
    } else if (diag2 === 4) {
      if (missingDiag2 !== -1) reachNumbers.add(missingDiag2);
    }

    const isBingo = bingoCount > 0;
    const reachCount = reachNumbers.size;
    const isReach = reachCount > 0;
    return { isBingo, isReach, reachCount, bingoCount, reachNumbers: Array.from(reachNumbers) };
  }
}
