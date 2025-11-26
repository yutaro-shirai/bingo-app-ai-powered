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

    it('should count single reach correctly (Row)', () => {
      const roomId = service.createRoom('host1', 'Test Room');
      const player = service.joinRoom(roomId, 'player1', 'test');
      service.startGame(roomId, 'host1');
      const room = service.getRoom(roomId);

      // Mark 4 items in first row
      const firstRow = player.card[0];
      room!.numbersDrawn.push(...firstRow.slice(0, 4));

      const result = service.claimBingo(roomId, player.id);
      expect(result.reachCount).toBe(1);
    });

    it('should count single reach correctly (Col)', () => {
      const roomId = service.createRoom('host1', 'Test Room');
      const player = service.joinRoom(roomId, 'player1', 'test');
      service.startGame(roomId, 'host1');
      const room = service.getRoom(roomId);

      // Mark 4 items in first col
      const firstCol = [player.card[0][0], player.card[1][0], player.card[2][0], player.card[3][0]];
      room!.numbersDrawn.push(...firstCol);

      const result = service.claimBingo(roomId, player.id);
      expect(result.reachCount).toBe(1);
    });

    it('should count single reach correctly (Diag)', () => {
      const roomId = service.createRoom('host1', 'Test Room');
      const player = service.joinRoom(roomId, 'player1', 'test');
      service.startGame(roomId, 'host1');
      const room = service.getRoom(roomId);

      // Mark 4 items in diagonal (0,0), (1,1), (3,3), (4,4) - skipping center (2,2) which is free
      const diag = [player.card[0][0], player.card[1][1], player.card[3][3], player.card[4][4]];
      room!.numbersDrawn.push(...diag);

      const result = service.claimBingo(roomId, player.id);
      expect(result.reachCount).toBe(1);
    });

    it('should count double reach correctly (Row + Col intersection)', () => {
      const roomId = service.createRoom('host1', 'Test Room');
      const player = service.joinRoom(roomId, 'player1', 'test');
      service.startGame(roomId, 'host1');
      const room = service.getRoom(roomId);

      // Row 0: [X, X, X, X, O] (O at 0,4)
      // Col 4: [O, X, X, X, X] (O at 0,4)
      // We mark Row 0 (0-3) and Col 4 (1-4)
      // Intersection is (0,4) which is NOT marked.

      const row0 = player.card[0].slice(0, 4); // (0,0) to (0,3)
      const col4 = [player.card[1][4], player.card[2][4], player.card[3][4], player.card[4][4]];

      room!.numbersDrawn.push(...row0);
      room!.numbersDrawn.push(...col4);

      const result = service.claimBingo(roomId, player.id);
      expect(result.reachCount).toBe(2);
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
