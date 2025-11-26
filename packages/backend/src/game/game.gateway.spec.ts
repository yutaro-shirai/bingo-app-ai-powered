import { Test, TestingModule } from '@nestjs/testing';
import { GameGateway } from './game.gateway';
import { GameService } from './game.service';
import { Server, Socket } from 'socket.io';

describe('GameGateway', () => {
  let gateway: GameGateway;
  let service: GameService;
  let mockServer: Partial<Server>;
  let mockClient: Partial<Socket>;

  const mockGameService = {
    createRoom: jest.fn(),
    joinRoom: jest.fn(),
    getRoom: jest.fn(),
    startGame: jest.fn(),
    drawNumber: jest.fn(),
    punchNumber: jest.fn(),
    claimBingo: jest.fn(),
  };

  beforeEach(async () => {
    mockServer = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
    };

    mockClient = {
      id: 'test-socket-id',
      join: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GameGateway,
        { provide: GameService, useValue: mockGameService },
      ],
    }).compile();

    gateway = module.get<GameGateway>(GameGateway);
    service = module.get<GameService>(GameService);
    gateway.server = mockServer as Server;

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });

  describe('handleDisconnect', () => {
    it('should log when client disconnects', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      gateway.handleDisconnect(mockClient as Socket);
      expect(consoleSpy).toHaveBeenCalledWith(
        'Client disconnected: test-socket-id',
      );
      consoleSpy.mockRestore();
    });
  });

  describe('createRoom', () => {
    it('should create room and return roomId', async () => {
      mockGameService.createRoom.mockResolvedValue('ROOM_ID');
      
      const result = await gateway.createRoom(
        { name: 'Test Room' },
        mockClient as Socket,
      );
      expect(result.roomId).toBe('ROOM_ID');
      expect(mockClient.join).toHaveBeenCalledWith('ROOM_ID');
    });

    it('should return error for invalid room names', async () => {
      mockGameService.createRoom.mockRejectedValue(new Error('Room name contains invalid characters'));

      const result = await gateway.createRoom(
        { name: '<script>' },
        mockClient as Socket,
      );

      expect(result.error).toBe('Room name contains invalid characters');
      expect(mockClient.join).not.toHaveBeenCalled();
    });
  });

  describe('joinRoom', () => {
    it('should rejoin with existing playerId', async () => {
      const roomId = 'ROOM_ID';
      const player = { id: 'PLAYER_ID', name: 'Player 1', socketId: 'SOCKET_ID' };
      const room = { roomId, status: 'WAITING', name: 'Test Room', players: [player] };

      mockGameService.joinRoom.mockResolvedValue(player);
      mockGameService.getRoom.mockResolvedValue(room);

      const firstJoin = await gateway.joinRoom(
        { roomId, name: 'Player 1' },
        mockClient as Socket,
      ) as any;

      const playerId = firstJoin.player.id;

      // Rejoin with same playerId
      const rejoin = await gateway.joinRoom({ roomId, name: 'Player 1', playerId }, {
        ...mockClient,
        id: 'new-socket-id',
      } as Socket) as any;

      expect(rejoin.player.id).toBe(playerId);
    });

    it('should normalize room IDs before joining socket rooms', async () => {
      const roomId = 'ROOM_ID';
      const lowercaseRoomId = roomId.toLowerCase();
      const player = { id: 'PLAYER_ID', name: 'Player 1' };
      const room = { roomId, status: 'WAITING', name: 'Test Room', players: [player] };

      mockGameService.joinRoom.mockResolvedValue(player);
      mockGameService.getRoom.mockResolvedValue(room);

      await gateway.joinRoom(
        { roomId: lowercaseRoomId, name: 'Player 1' },
        mockClient as Socket,
      );

      expect(mockClient.join).toHaveBeenCalledWith(roomId);
    });

    it('should join room and emit player_joined event', async () => {
      const roomId = 'ROOM_ID';
      const player = { id: 'PLAYER_ID', name: 'Player 1' };
      const room = { roomId, status: 'WAITING', name: 'Test Room', players: [player] };

      mockGameService.joinRoom.mockResolvedValue(player);
      mockGameService.getRoom.mockResolvedValue(room);

      const result = await gateway.joinRoom(
        { roomId, name: 'Player 1' },
        mockClient as Socket,
      ) as any;

      expect(result.player).toEqual(player);
      expect(result.status).toBe('WAITING');
      expect(result.roomName).toBe('Test Room');
      expect(mockClient.join).toHaveBeenCalledWith(roomId);
      expect(mockServer.to).toHaveBeenCalledWith(roomId);
      expect(mockServer.emit).toHaveBeenCalledWith(
        'player_joined',
        expect.objectContaining({
          totalPlayers: 1,
          players: [player],
        }),
      );
    });

    it('should return error if room not found', async () => {
      mockGameService.joinRoom.mockRejectedValue(new Error('Room not found'));

      const result = await gateway.joinRoom(
        { roomId: 'INVALID', name: 'Player 1' },
        mockClient as Socket,
      ) as any;

      expect(result.error).toBe('Room not found');
    });
  });

  describe('startGame', () => {
    it('should start game and emit game_started event', async () => {
      const roomId = 'ROOM_ID';
      mockGameService.startGame.mockResolvedValue(undefined);

      await gateway.startGame({ roomId }, mockClient as Socket);

      expect(mockServer.to).toHaveBeenCalledWith(roomId);
      expect(mockServer.emit).toHaveBeenCalledWith('game_started', {
        status: 'PLAYING',
      });
    });

    it('should return error if room not found', async () => {
      mockGameService.startGame.mockRejectedValue(new Error('Room not found'));

      const result = await gateway.startGame(
        { roomId: 'INVALID' },
        mockClient as Socket,
      ) as any;

      expect(result.error).toBe('Room not found');
    });
  });

  describe('drawNumber', () => {
    it('should draw number and return it to host only', async () => {
      const roomId = 'ROOM_ID';
      const number = 42;
      const room = { numbersDrawn: [42] };

      mockGameService.drawNumber.mockResolvedValue(number);
      mockGameService.getRoom.mockResolvedValue(room);

      const result = await gateway.drawNumber({ roomId }, mockClient as Socket) as any;

      expect(result.success).toBe(true);
      expect(result.number).toBe(number);
      expect(result.history).toEqual([42]);
      expect(mockServer.to).not.toHaveBeenCalled();
      expect(mockServer.emit).not.toHaveBeenCalled();
    });

    it('should return error if room not found', async () => {
      mockGameService.drawNumber.mockRejectedValue(new Error('Room not found'));

      const result = await gateway.drawNumber(
        { roomId: 'INVALID' },
        mockClient as Socket,
      ) as any;

      expect(result.error).toBe('Room not found');
    });
  });

  describe('punchNumber', () => {
    it('should punch number and emit player_updated event', async () => {
      const roomId = 'ROOM_ID';
      const player = { id: 'PLAYER_ID' };
      const room = { players: [player] };

      mockGameService.punchNumber.mockResolvedValue(player);
      mockGameService.getRoom.mockResolvedValue(room);

      const result = await gateway.punchNumber(
        { roomId, number: 42, playerId: 'PLAYER_ID' },
        mockClient as Socket,
      ) as any;

      expect(result.success).toBe(true);
      expect(mockServer.to).toHaveBeenCalledWith(roomId);
      expect(mockServer.emit).toHaveBeenCalledWith(
        'player_updated',
        expect.objectContaining({
          players: [player],
        }),
      );
    });

    it('should return error if number punch fails', async () => {
      mockGameService.punchNumber.mockRejectedValue(new Error('Room not found'));

      const result = await gateway.punchNumber(
        { roomId: 'INVALID', number: 1, playerId: 'player1' },
        mockClient as Socket,
      ) as any;

      expect(result.error).toBe('Room not found');
    });
  });

  describe('claimBingo', () => {
    it('should claim bingo and emit player_updated event', async () => {
      const roomId = 'ROOM_ID';
      const player = { id: 'PLAYER_ID', name: 'Player 1', isBingo: true };
      const room = { players: [player] };
      const bingoResult = { isBingo: true, isReach: false, reachCount: 0 };

      mockGameService.claimBingo.mockResolvedValue(bingoResult);
      mockGameService.getRoom.mockResolvedValue(room);

      const result = await gateway.claimBingo(
        { roomId, playerId: 'PLAYER_ID' },
        mockClient as Socket,
      ) as any;

      expect(result.success).toBe(true);
      expect(result.result.isBingo).toBe(true);
      expect(mockServer.emit).toHaveBeenCalledWith(
        'player_updated',
        expect.any(Object),
      );
    });

    it('should emit bingo_announced for single bingo', async () => {
      const roomId = 'ROOM_ID';
      const player = { id: 'PLAYER_ID', name: 'Player 1', isBingo: true };
      const room = { players: [player] }; // Only one bingo player
      const bingoResult = { isBingo: true, isReach: false, reachCount: 0 };

      mockGameService.claimBingo.mockResolvedValue(bingoResult);
      mockGameService.getRoom.mockResolvedValue(room);

      await gateway.claimBingo({ roomId, playerId: 'PLAYER_ID' }, mockClient as Socket);

      expect(mockServer.emit).toHaveBeenCalledWith(
        'bingo_announced',
        expect.objectContaining({
          playerId: 'PLAYER_ID',
          playerName: 'Player 1',
        }),
      );
    });

    it('should emit reach_announced for single reach', async () => {
      const roomId = 'ROOM_ID';
      const player = { id: 'PLAYER_ID', name: 'Player 1', isReach: true, isBingo: false };
      const room = { players: [player] };
      const bingoResult = { isBingo: false, isReach: true, reachCount: 1 };

      mockGameService.claimBingo.mockResolvedValue(bingoResult);
      mockGameService.getRoom.mockResolvedValue(room);

      await gateway.claimBingo({ roomId, playerId: 'PLAYER_ID' }, mockClient as Socket);

      expect(mockServer.emit).toHaveBeenCalledWith(
        'reach_announced',
        expect.objectContaining({
          playerId: 'PLAYER_ID',
          playerName: 'Player 1',
        }),
      );
    });

    it('should not emit announcements for multiple players', async () => {
      const roomId = 'ROOM_ID';
      const player1 = { id: 'P1', name: 'Player 1', isReach: true, isBingo: false };
      const player2 = { id: 'P2', name: 'Player 2', isReach: true, isBingo: false };
      const room = { players: [player1, player2] };
      const bingoResult = { isBingo: false, isReach: true, reachCount: 1 };

      mockGameService.claimBingo.mockResolvedValue(bingoResult);
      mockGameService.getRoom.mockResolvedValue(room);

      // Player 2 claims, but Player 1 is already reach.
      // Wait, the logic in gateway filters players who ARE reach.
      // If both are reach, reachPlayers.length === 2.
      
      await gateway.claimBingo(
        { roomId, playerId: 'P2' },
        mockClient as Socket,
      );

      const emitCalls = (mockServer.emit as jest.Mock).mock.calls;
      const reachAnnouncedCalls = emitCalls.filter(
        (call) => call[0] === 'reach_announced',
      );

      // Should not announce because 2 players have reach
      expect(reachAnnouncedCalls.length).toBe(0);
    });

    it('should return error if claim fails', async () => {
      mockGameService.claimBingo.mockRejectedValue(new Error('Room not found'));

      const result = await gateway.claimBingo(
        { roomId: 'INVALID', playerId: 'player1' },
        mockClient as Socket,
      );

      expect(result.error).toBe('Room not found');
    });
  });
});
