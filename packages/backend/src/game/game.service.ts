import { Injectable } from '@nestjs/common';
import { Room, Player } from './game.types';
import { v4 as uuidv4 } from 'uuid';
import {
  ensureSafePlayerName,
  ensureSafeRoomName,
  normalizeRoomId,
} from './security.util';

@Injectable()
export class GameService {
  private rooms: Map<string, Room> = new Map();

  constructor() { }

  async createRoom(hostSocketId: string, name: string): Promise<string> {
    const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    const safeName = ensureSafeRoomName(name);

    const room: Room = {
      id: uuidv4(),
      roomId,
      name: safeName,
      hostSocketId,
      status: 'WAITING',
      numbersDrawn: [],
      players: [],
    };

    this.rooms.set(roomId, room);
    return roomId;
  }

  async getAllRooms(): Promise<any[]> {
    return Array.from(this.rooms.values())
      .sort((a, b) => b.id.localeCompare(a.id)) // Sort by ID (approx creation time) or add createdAt
      .map((room) => ({
        roomId: room.roomId,
        name: room.name,
        status: room.status,
        createdAt: new Date(), // Mock date as we don't store it in interface yet
        playerCount: room.players.length,
        bingoCount: room.players.filter((p) => p.isBingo).length,
        reachCount: room.players.filter((p) => p.isReach).length,
      }));
  }

  async getRoom(roomId: string): Promise<Room | null> {
    const normalizedRoomId = normalizeRoomId(roomId);
    return this.rooms.get(normalizedRoomId) || null;
  }

  async joinRoom(
    roomId: string,
    socketId: string,
    name: string,
    existingPlayerId?: string,
  ): Promise<Player> {
    const normalizedRoomId = normalizeRoomId(roomId);
    const room = this.rooms.get(normalizedRoomId);

    if (!room) {
      throw new Error('Room not found');
    }

    const safeName = ensureSafePlayerName(name);

    // Check if player is reconnecting
    if (existingPlayerId) {
      const existingPlayer = room.players.find(p => p.id === existingPlayerId);

      if (!existingPlayer) {
        throw new Error('Player not found');
      }

      // Update socket ID and name
      existingPlayer.socketId = socketId;
      existingPlayer.name = safeName;

      return existingPlayer;
    }

    // New Player
    const playerId = uuidv4();
    const card = this.generateBingoCard();

    const player: Player = {
      id: playerId,
      socketId,
      name: safeName,
      card,
      isReach: false,
      isBingo: false,
      roomId: room.id,
    };

    room.players.push(player);
    return player;
  }

  async startGame(roomId: string, hostSocketId: string) {
    const normalizedRoomId = normalizeRoomId(roomId);
    const room = this.rooms.get(normalizedRoomId);

    if (!room) throw new Error('Room not found');

    room.status = 'PLAYING';
    room.hostSocketId = hostSocketId;
  }

  async reconnectHost(roomId: string, hostSocketId: string) {
    const normalizedRoomId = normalizeRoomId(roomId);
    const room = this.rooms.get(normalizedRoomId);

    if (!room) throw new Error('Room not found');

    room.hostSocketId = hostSocketId;
    return room;
  }

  async drawNumber(roomId: string, hostSocketId: string): Promise<number> {
    const normalizedRoomId = normalizeRoomId(roomId);
    const room = this.rooms.get(normalizedRoomId);

    if (!room) throw new Error('Room not found');

    // Update host socket ID just in case
    if (room.hostSocketId !== hostSocketId) {
      room.hostSocketId = hostSocketId;
    }

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

  async punchNumber(roomId: string, playerId: string, number: number): Promise<Player> {
    const normalizedRoomId = normalizeRoomId(roomId);
    const room = this.rooms.get(normalizedRoomId);
    if (!room) throw new Error('Room not found');

    const player = room.players.find(p => p.id === playerId);
    if (!player) throw new Error('Player not found');

    // Validation: Number must be drawn
    if (!room.numbersDrawn.includes(number)) {
      throw new Error('Number not drawn yet');
    }

    // Validation: Number must be on card
    const card = player.card;
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

    return player;
  }

  async claimBingo(
    roomId: string,
    playerId: string,
  ): Promise<{ isBingo: boolean; isReach: boolean; reachCount: number }> {
    const normalizedRoomId = normalizeRoomId(roomId);
    const room = this.rooms.get(normalizedRoomId);
    if (!room) throw new Error('Room not found');

    const player = room.players.find(p => p.id === playerId);
    if (!player) throw new Error('Player not found');

    const { isBingo, isReach, reachCount } = this.checkBingo(
      player.card,
      room.numbersDrawn,
    );

    player.isBingo = isBingo;
    player.isReach = isReach;

    return { isBingo, isReach, reachCount };
  }

  private checkBingo(
    card: number[][],
    numbersDrawn: number[],
  ): { isBingo: boolean; isReach: boolean; reachCount: number; reachNumbers: number[] } {
    const size = 5;
    let bingoCount = 0;
    const reachNumbers = new Set<number>();

    // Helper to check if a cell is marked (drawn or free)
    const isMarked = (r: number, c: number) => {
      if (r === 2 && c === 2) return true; // Free space
      return numbersDrawn.includes(card[r][c]);
    };

    // Check rows
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

    // Check cols
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

    // Check diagonals
    let diag1 = 0;
    let missingDiag1 = -1;
    let diag2 = 0;
    let missingDiag2 = -1;

    for (let i = 0; i < size; i++) {
      // Diag 1 (Top-Left to Bottom-Right)
      if (isMarked(i, i)) {
        diag1++;
      } else {
        missingDiag1 = card[i][i];
      }

      // Diag 2 (Top-Right to Bottom-Left)
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
    return { isBingo, isReach, reachCount, reachNumbers: Array.from(reachNumbers) };
  }
}
