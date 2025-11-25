import { Test, TestingModule } from '@nestjs/testing';
import { GameService } from './game.service';

describe('GameService', () => {
  let service: GameService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GameService],
    }).compile();

    service = module.get<GameService>(GameService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('punchNumber', () => {
    it('should throw error if room not found', () => {
      expect(() => service.punchNumber('invalid', 'player1', 1)).toThrow(
        'Room not found',
      );
    });

    it('should throw error if player not found', () => {
      const roomId = service.createRoom('host1', 'Test Room');
      expect(() => service.punchNumber(roomId, 'player1', 1)).toThrow(
        'Player not found',
      );
    });

    it('should throw error if number not drawn', () => {
      const roomId = service.createRoom('host1', 'Test Room');
      const player = service.joinRoom(roomId, 'player1', 'test');
      service.startGame(roomId, 'host1');

      const numberOnCard = player.card[0][0];

      expect(() =>
        service.punchNumber(roomId, player.id, numberOnCard),
      ).toThrow('Number not drawn yet');
    });

    it('should throw error if number not on card', () => {
      const roomId = service.createRoom('host1', 'Test Room');
      const player = service.joinRoom(roomId, 'player1', 'test');
      service.startGame(roomId, 'host1');

      const flatCard = player.card.flat();
      let numberNotOnCard = 1;
      while (flatCard.includes(numberNotOnCard)) {
        numberNotOnCard++;
      }

      const room = service.getRoom(roomId);
      room!.numbersDrawn.push(numberNotOnCard);

      expect(() =>
        service.punchNumber(roomId, player.id, numberNotOnCard),
      ).toThrow('Number not on card');
    });

    it('should return player if valid punch', () => {
      const roomId = service.createRoom('host1', 'Test Room');
      const player = service.joinRoom(roomId, 'player1', 'test');
      service.startGame(roomId, 'host1');

      const numberOnCard = player.card[0][0];
      const room = service.getRoom(roomId);
      room!.numbersDrawn.push(numberOnCard);

      const result = service.punchNumber(roomId, player.id, numberOnCard);
      expect(result).toBeDefined();
      expect(result.id).toBe(player.id);
    });
  });

  describe('claimBingo', () => {
    it('should detect bingo correctly', () => {
      const roomId = service.createRoom('host1', 'Test Room');
      const player = service.joinRoom(roomId, 'player1', 'test');
      service.startGame(roomId, 'host1');
      const room = service.getRoom(roomId);

      const firstRow = player.card[0];
      room!.numbersDrawn.push(...firstRow);

      const result = service.claimBingo(roomId, player.id);
      expect(result.isBingo).toBe(true);
    });

    it('should detect reach correctly', () => {
      const roomId = service.createRoom('host1', 'Test Room');
      const player = service.joinRoom(roomId, 'player1', 'test');
      service.startGame(roomId, 'host1');
      const room = service.getRoom(roomId);

      const firstRow = player.card[0];
      room!.numbersDrawn.push(...firstRow.slice(0, 4));

      const result = service.claimBingo(roomId, player.id);
      expect(result.isBingo).toBe(false);
      expect(result.isReach).toBe(true);
    });

    it('should count single reach correctly', () => {
      const roomId = service.createRoom('host1', 'Test Room');
      const player = service.joinRoom(roomId, 'player1', 'test');
      service.startGame(roomId, 'host1');
      const room = service.getRoom(roomId);

      const firstRow = player.card[0];
      room!.numbersDrawn.push(...firstRow.slice(0, 4));

      const result = service.claimBingo(roomId, player.id);
      expect(result.reachCount).toBe(1);
    });

    it('should count double reach correctly', () => {
      const roomId = service.createRoom('host1', 'Test Room');
      const player = service.joinRoom(roomId, 'player1', 'test');
      service.startGame(roomId, 'host1');
      const room = service.getRoom(roomId);

      const firstRow = player.card[0];
      room!.numbersDrawn.push(...firstRow.slice(0, 4));

      for (let i = 0; i < 4; i++) {
        const num = player.card[i][0];
        if (!room!.numbersDrawn.includes(num)) {
          room!.numbersDrawn.push(num);
        }
      }

      const result = service.claimBingo(roomId, player.id);
      expect(result.reachCount).toBeGreaterThanOrEqual(2);
    });
  });

  describe('security guards', () => {
    it('should normalize room ID lookups and sanitize names', () => {
      const roomId = service.createRoom('host1', '  Fancy    Room  ');
      const lowerRoomId = roomId.toLowerCase();

      const player = service.joinRoom(
        lowerRoomId,
        'player1',
        '  Alice   Wonderland  ',
      );

      expect(player.name).toBe('Alice Wonderland');

      const room = service.getRoom(lowerRoomId);
      expect(room?.roomId).toBe(roomId);
      expect(room?.name).toBe('Fancy Room');
    });

    it('should reject player names containing HTML characters', () => {
      const roomId = service.createRoom('host1', 'Test Room');

      expect(() =>
        service.joinRoom(roomId, 'player1', '<script>alert(1)</script>'),
      ).toThrow('Player name contains invalid characters');
    });
  });
});
