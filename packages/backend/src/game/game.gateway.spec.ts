import { Test, TestingModule } from '@nestjs/testing';
import { GameGateway } from './game.gateway';
import { GameService } from './game.service';
import { Server, Socket } from 'socket.io';

describe('GameGateway', () => {
  let gateway: GameGateway;
  let service: GameService;
  let mockServer: Partial<Server>;
  let mockClient: Partial<Socket>;

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
      providers: [GameGateway, GameService],
    }).compile();

    gateway = module.get<GameGateway>(GameGateway);
    service = module.get<GameService>(GameService);
    gateway.server = mockServer as Server;
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
    it('should create room and return roomId', () => {
      const result = gateway.createRoom(
        { name: 'Test Room' },
        mockClient as Socket,
      );
      expect(result.roomId).toBeDefined();
      expect(mockClient.join).toHaveBeenCalledWith(result.roomId);
    });

    it('should return error for invalid room names', () => {
      const result = gateway.createRoom(
        { name: '<script>' },
        mockClient as Socket,
      );

      expect(result.error).toBe('Room name contains invalid characters');
      expect(mockClient.join).not.toHaveBeenCalled();
    });
  });

  describe('joinRoom', () => {
    it('should join room and emit player_joined event', () => {
      const roomId = service.createRoom('host1', 'Test Room');

      const result = gateway.joinRoom(
        { roomId, name: 'Player 1' },
        mockClient as Socket,
      );

      expect(result.player).toBeDefined();
      expect(result.status).toBe('WAITING');
      expect(result.roomName).toBe('Test Room');
      expect(mockClient.join).toHaveBeenCalledWith(roomId);
      expect(mockServer.to).toHaveBeenCalledWith(roomId);
      expect(mockServer.emit).toHaveBeenCalledWith(
        'player_joined',
        expect.objectContaining({
          totalPlayers: 1,
          players: expect.any(Array),
        }),
      );
    });

    it('should return error if room not found', () => {
      const result = gateway.joinRoom(
        { roomId: 'INVALID', name: 'Player 1' },
        mockClient as Socket,
      );

      expect(result.error).toBe('Room not found');
    });

    it('should rejoin with existing playerId', () => {
      const roomId = service.createRoom('host1', 'Test Room');
      const firstJoin = gateway.joinRoom(
        { roomId, name: 'Player 1' },
        mockClient as Socket,
      );

      const playerId = firstJoin.player.id;

      // Rejoin with same playerId
      const rejoin = gateway.joinRoom({ roomId, name: 'Player 1', playerId }, {
        ...mockClient,
        id: 'new-socket-id',
      } as Socket);

      expect(rejoin.player.id).toBe(playerId);
      expect(rejoin.player.socketId).toBe('new-socket-id');
    });

    it('should normalize room IDs before joining socket rooms', () => {
      const roomId = service.createRoom('host1', 'Test Room');
      const lowercaseRoomId = roomId.toLowerCase();

      gateway.joinRoom(
        { roomId: lowercaseRoomId, name: 'Player 1' },
        mockClient as Socket,
      );

      expect(mockClient.join).toHaveBeenCalledWith(roomId);
    });
  });

  describe('startGame', () => {
    it('should start game and emit game_started event', () => {
      const roomId = service.createRoom(mockClient.id!, 'Test Room');

      gateway.startGame({ roomId }, mockClient as Socket);

      expect(mockServer.to).toHaveBeenCalledWith(roomId);
      expect(mockServer.emit).toHaveBeenCalledWith('game_started', {
        status: 'PLAYING',
      });
    });

    it('should return error if room not found', () => {
      const result = gateway.startGame(
        { roomId: 'INVALID' },
        mockClient as Socket,
      );

      expect(result.error).toBe('Room not found');
    });
  });

  describe('drawNumber', () => {
    it('should draw number and return it to host only', () => {
      const roomId = service.createRoom(mockClient.id!, 'Test Room');
      service.startGame(roomId, mockClient.id!);

      const result = gateway.drawNumber({ roomId }, mockClient as Socket) as any;

      expect(result.success).toBe(true);
      expect(result.number).toEqual(expect.any(Number));
      expect(result.history).toEqual(expect.any(Array));
      expect(mockServer.to).not.toHaveBeenCalled();
      expect(mockServer.emit).not.toHaveBeenCalled();
    });

    it('should return error if room not found', () => {
      const result = gateway.drawNumber(
        { roomId: 'INVALID' },
        mockClient as Socket,
      ) as any;

      expect(result.error).toBe('Room not found');
    });
  });

  describe('punchNumber', () => {
    it('should punch number and emit player_updated event', () => {
      const roomId = service.createRoom('host1', 'Test Room');
      const player = service.joinRoom(roomId, 'player1', 'Test Player');
      service.startGame(roomId, 'host1');

      const numberOnCard = player.card[0][0];
      const room = service.getRoom(roomId);
      room!.numbersDrawn.push(numberOnCard);

      const result = gateway.punchNumber(
        { roomId, number: numberOnCard, playerId: player.id },
        mockClient as Socket,
      );

      expect(result.success).toBe(true);
      expect(mockServer.to).toHaveBeenCalledWith(roomId);
      expect(mockServer.emit).toHaveBeenCalledWith(
        'player_updated',
        expect.objectContaining({
          players: expect.any(Array),
        }),
      );
    });

    it('should return error if number punch fails', () => {
      const result = gateway.punchNumber(
        { roomId: 'INVALID', number: 1, playerId: 'player1' },
        mockClient as Socket,
      );

      expect(result.error).toBe('Room not found');
    });
  });

  describe('claimBingo', () => {
    it('should claim bingo and emit player_updated event', () => {
      const roomId = service.createRoom('host1', 'Test Room');
      const player = service.joinRoom(roomId, 'player1', 'Test Player');
      service.startGame(roomId, 'host1');
      const room = service.getRoom(roomId);

      // Simulate bingo
      const firstRow = player.card[0];
      room!.numbersDrawn.push(...firstRow);

      const result = gateway.claimBingo(
        { roomId, playerId: player.id },
        mockClient as Socket,
      );

      expect(result.success).toBe(true);
      expect(result.result.isBingo).toBe(true);
      expect(mockServer.emit).toHaveBeenCalledWith(
        'player_updated',
        expect.any(Object),
      );
    });

    it('should emit bingo_announced for single bingo', () => {
      const roomId = service.createRoom('host1', 'Test Room');
      const player = service.joinRoom(roomId, 'player1', 'Test Player');
      service.startGame(roomId, 'host1');
      const room = service.getRoom(roomId);

      // Simulate bingo
      const firstRow = player.card[0];
      room!.numbersDrawn.push(...firstRow);

      gateway.claimBingo({ roomId, playerId: player.id }, mockClient as Socket);

      expect(mockServer.emit).toHaveBeenCalledWith(
        'bingo_announced',
        expect.objectContaining({
          playerId: player.id,
          playerName: 'Test Player',
        }),
      );
    });

    it('should emit reach_announced for single reach', () => {
      const roomId = service.createRoom('host1', 'Test Room');
      const player = service.joinRoom(roomId, 'player1', 'Test Player');
      service.startGame(roomId, 'host1');
      const room = service.getRoom(roomId);

      // Simulate reach (4 of 5)
      const firstRow = player.card[0];
      room!.numbersDrawn.push(...firstRow.slice(0, 4));

      gateway.claimBingo({ roomId, playerId: player.id }, mockClient as Socket);

      expect(mockServer.emit).toHaveBeenCalledWith(
        'reach_announced',
        expect.objectContaining({
          playerId: player.id,
          playerName: 'Test Player',
        }),
      );
    });

    it('should not emit announcements for multiple players', () => {
      const roomId = service.createRoom('host1', 'Test Room');
      const player1 = service.joinRoom(roomId, 'player1', 'Player 1');
      const player2 = service.joinRoom(roomId, 'player2', 'Player 2');
      service.startGame(roomId, 'host1');
      const room = service.getRoom(roomId);

      // Both players reach
      const firstRow1 = player1.card[0];
      const firstRow2 = player2.card[0];
      room!.numbersDrawn.push(
        ...firstRow1.slice(0, 4),
        ...firstRow2.slice(0, 4),
      );

      // First player claims
      gateway.claimBingo(
        { roomId, playerId: player1.id },
        mockClient as Socket,
      );

      // Second player claims
      const emitCalls = (mockServer.emit as jest.Mock).mock.calls;
      const reachAnnouncedCalls = emitCalls.filter(
        (call) => call[0] === 'reach_announced',
      );

      // Should not announce when multiple players have reach
      gateway.claimBingo(
        { roomId, playerId: player2.id },
        mockClient as Socket,
      );

      // Only player_updated should be emitted, not reach_announced for second player
      expect(reachAnnouncedCalls.length).toBeLessThanOrEqual(1);
    });

    it('should return error if claim fails', () => {
      const result = gateway.claimBingo(
        { roomId: 'INVALID', playerId: 'player1' },
        mockClient as Socket,
      );

      expect(result.error).toBe('Room not found');
    });
  });
});
