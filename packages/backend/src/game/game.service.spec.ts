import { Test, TestingModule } from '@nestjs/testing';
import { GameService } from './game.service';
import { PrismaService } from '../database/prisma.service';

const createMockPrisma = () => {
  const rooms: any[] = [];
  const players: any[] = [];
  const _id = Math.random();

  return {
    _id,
    room: {
      create: jest.fn().mockImplementation((args) => {
        const room = {
          id: 'room-id-' + Math.random(),
          ...args.data,
          players: [],
          numbersDrawn: args.data.numbersDrawn || [],
        };
        rooms.push(room);
        return Promise.resolve(room);
      }),
      findUnique: jest.fn().mockImplementation((args) => {
        if (args.where.roomId) {
          const r = rooms.find((r) => r.roomId === args.where.roomId);
          if (r) {
            const roomPlayers = players.filter((p) => p.roomId === r.id);
            return Promise.resolve({ ...r, players: roomPlayers });
          }
        }
        if (args.where.id) {
          const r = rooms.find((r) => r.id === args.where.id);
          return Promise.resolve(r || null);
        }
        return Promise.resolve(null);
      }),
      update: jest.fn().mockImplementation((args) => {
        const index = rooms.findIndex((r) => r.id === args.where.id);
        if (index > -1) {
          if (args.data.numbersDrawn && args.data.numbersDrawn.push) {
            rooms[index].numbersDrawn.push(args.data.numbersDrawn.push);
          } else if (args.data.numbersDrawn) {
             rooms[index].numbersDrawn = args.data.numbersDrawn;
          }
          
          if (args.data.status) rooms[index].status = args.data.status;
          if (args.data.hostSocketId) rooms[index].hostSocketId = args.data.hostSocketId;

          return Promise.resolve(rooms[index]);
        }
        return Promise.resolve(null);
      }),
    },
    player: {
      create: jest.fn().mockImplementation((args) => {
        const player = {
          id: 'player-id-' + Math.random(),
          ...args.data,
          isReach: false,
          isBingo: false,
        };
        players.push(player);
        return Promise.resolve(player);
      }),
      findUnique: jest.fn().mockImplementation((args) => {
        if (args.where.playerId) {
          const p = players.find((p) => p.playerId === args.where.playerId);
          return Promise.resolve(p || null);
        }
        return Promise.resolve(null);
      }),
      update: jest.fn().mockImplementation((args) => {
        const index = players.findIndex((p) => p.id === args.where.id);
        if (index > -1) {
          Object.assign(players[index], args.data);
          return Promise.resolve(players[index]);
        }
        return Promise.resolve(null);
      }),
    },
    // Helper to access store
    _rooms: rooms,
    _players: players,
  };
};

describe('GameService', () => {
  let service: GameService;
  let prisma: ReturnType<typeof createMockPrisma>;

  beforeEach(async () => {
    prisma = createMockPrisma();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GameService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<GameService>(GameService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('punchNumber', () => {
    it('should throw error if room not found', async () => {
      await expect(service.punchNumber('invalid', 'player1', 1)).rejects.toThrow(
        'Room not found',
      );
    });

    it('should throw error if player not found', async () => {
      const roomId = await service.createRoom('host1', 'Test Room');
      await expect(service.punchNumber(roomId, 'player1', 1)).rejects.toThrow(
        'Player not found',
      );
    });

    it('should throw error if number not drawn', async () => {
      const roomId = await service.createRoom('host1', 'Test Room');
      const player = await service.joinRoom(roomId, 'host1', 'test'); // Using host1 as socketId for simplicity
      await service.startGame(roomId, 'host1');

      const numberOnCard = player.card[0][0];

      await expect(
        service.punchNumber(roomId, player.id, numberOnCard),
      ).rejects.toThrow('Number not drawn yet');
    });

    it('should throw error if number not on card', async () => {
      const roomId = await service.createRoom('host1', 'Test Room');
      const player = await service.joinRoom(roomId, 'host1', 'test');
      await service.startGame(roomId, 'host1');

      const flatCard = player.card.flat();
      let numberNotOnCard = 1;
      while (flatCard.includes(numberNotOnCard)) {
        numberNotOnCard++;
      }

      // Manually add number to drawn numbers in mock DB
      const room = prisma._rooms.find(r => r.roomId === roomId);
      room.numbersDrawn.push(numberNotOnCard);

      await expect(
        service.punchNumber(roomId, player.id, numberNotOnCard),
      ).rejects.toThrow('Number not on card');
    });

    it('should return player if valid punch', async () => {
      const roomId = await service.createRoom('host1', 'Test Room');
      const player = await service.joinRoom(roomId, 'host1', 'test');
      await service.startGame(roomId, 'host1');

      const numberOnCard = player.card[0][0];
      
      // Manually add number to drawn numbers in mock DB
      const room = prisma._rooms.find(r => r.roomId === roomId);
      room.numbersDrawn.push(numberOnCard);

      const result = await service.punchNumber(roomId, player.id, numberOnCard);
      expect(result).toBeDefined();
      expect(result.id).toBe(player.id);
    });
  });

  describe('claimBingo', () => {
    it('should detect bingo correctly', async () => {
      const roomId = await service.createRoom('host1', 'Test Room');
      const player = await service.joinRoom(roomId, 'host1', 'test');
      await service.startGame(roomId, 'host1');
      
      const room = prisma._rooms.find(r => r.roomId === roomId);
      const firstRow = player.card[0];
      room.numbersDrawn.push(...firstRow);

      const result = await service.claimBingo(roomId, player.id);
      expect(result.isBingo).toBe(true);
    });

    it('should detect reach correctly', async () => {
      const roomId = await service.createRoom('host1', 'Test Room');
      const player = await service.joinRoom(roomId, 'host1', 'test');
      await service.startGame(roomId, 'host1');
      
      const room = prisma._rooms.find(r => r.roomId === roomId);
      const firstRow = player.card[0];
      room.numbersDrawn.push(...firstRow.slice(0, 4));

      const result = await service.claimBingo(roomId, player.id);
      expect(result.isBingo).toBe(false);
      expect(result.isReach).toBe(true);
    });

    it('should count single reach correctly (Row)', async () => {
      const roomId = await service.createRoom('host1', 'Test Room');
      const player = await service.joinRoom(roomId, 'host1', 'test');
      await service.startGame(roomId, 'host1');
      
      const room = prisma._rooms.find(r => r.roomId === roomId);

      // Mark 4 items in first row
      const firstRow = player.card[0];
      room.numbersDrawn.push(...firstRow.slice(0, 4));

      const result = await service.claimBingo(roomId, player.id);
      expect(result.reachCount).toBe(1);
    });

    it('should count single reach correctly (Col)', async () => {
      const roomId = await service.createRoom('host1', 'Test Room');
      const player = await service.joinRoom(roomId, 'host1', 'test');
      await service.startGame(roomId, 'host1');
      
      const room = prisma._rooms.find(r => r.roomId === roomId);

      // Mark 4 items in first col
      const firstCol = [player.card[0][0], player.card[1][0], player.card[2][0], player.card[3][0]];
      room.numbersDrawn.push(...firstCol);

      const result = await service.claimBingo(roomId, player.id);
      expect(result.reachCount).toBe(1);
    });

    it('should count single reach correctly (Diag)', async () => {
      const roomId = await service.createRoom('host1', 'Test Room');
      const player = await service.joinRoom(roomId, 'host1', 'test');
      await service.startGame(roomId, 'host1');
      
      const room = prisma._rooms.find(r => r.roomId === roomId);

      // Mark 3 items in diagonal (0,0), (1,1), (3,3) - skipping center (2,2) which is free, and (4,4)
      const diag = [player.card[0][0], player.card[1][1], player.card[3][3]];
      room.numbersDrawn.push(...diag);

      const result = await service.claimBingo(roomId, player.id);
      expect(result.reachCount).toBe(1);
    });

    it('should count double reach correctly (Row + Col intersection)', async () => {
      const roomId = await service.createRoom('host1', 'Test Room');
      const player = await service.joinRoom(roomId, 'host1', 'test');
      await service.startGame(roomId, 'host1');
      
      const room = prisma._rooms.find(r => r.roomId === roomId);

      // Row 0: [X, X, X, X, O] (O at 0,4)
      // Col 4: [O, X, X, X, X] (O at 0,4)
      // We mark Row 0 (0-3) and Col 4 (1-4)
      // Intersection is (0,4) which is NOT marked.

      const row0 = player.card[0].slice(0, 4); // (0,0) to (0,3)
      const col4 = [player.card[1][4], player.card[2][4], player.card[3][4], player.card[4][4]];

      room.numbersDrawn.push(...row0);
      room.numbersDrawn.push(...col4);

      const result = await service.claimBingo(roomId, player.id);
      expect(result.reachCount).toBe(2);
    });
  });

  describe('security guards', () => {
    it('should normalize room ID lookups and sanitize names', async () => {
      const roomId = await service.createRoom('host1', '  Fancy    Room  ');
      const lowerRoomId = roomId.toLowerCase();

      const player = await service.joinRoom(
        lowerRoomId,
        'host1',
        '  Alice   Wonderland  ',
      );

      expect(player.name).toBe('Alice Wonderland');

      const room = await service.getRoom(lowerRoomId);
      expect(room?.roomId).toBe(roomId);
      expect(room?.name).toBe('Fancy Room');
    });

    it('should reject player names containing HTML characters', async () => {
      const roomId = await service.createRoom('host1', 'Test Room');

      await expect(
        service.joinRoom(roomId, 'host1', '<script>alert(1)</script>'),
      ).rejects.toThrow('Player name contains invalid characters');
    });
  });
});
