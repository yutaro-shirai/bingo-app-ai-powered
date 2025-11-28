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
    it('should throw error if room not found', async () => {
      await expect(
        service.punchNumber('invalid', 'player1', 1),
      ).rejects.toThrow('Room not found');
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

<<<<<<< HEAD
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

      // Manually add number to drawn numbers
      const room = await service.getRoom(roomId);
      if (room) {
        room.numbersDrawn.push(numberNotOnCard);
      }

      await expect(
        service.punchNumber(roomId, player.id, numberNotOnCard),
      ).rejects.toThrow('Number not on card');
=======
        it('should throw error if player not found', () => {
            const roomId = service.createRoom('host1', 'Test Room');
            expect(() => service.punchNumber(roomId, 'player1', 1)).toThrow('Player not found');
        });

        it('should throw error if number not drawn', () => {
            const roomId = service.createRoom('host1', 'Test Room');
            const player = service.joinRoom(roomId, 'player1', 'test');
            service.startGame(roomId, 'host1');

            // Find a number on the card
            const numberOnCard = player.card[0][0];

            expect(() => service.punchNumber(roomId, player.id, numberOnCard)).toThrow('Number not drawn yet');
        });

        it('should throw error if number not on card', () => {
            const roomId = service.createRoom('host1', 'Test Room');
            const player = service.joinRoom(roomId, 'player1', 'test');
            service.startGame(roomId, 'host1');

            // Mock drawNumber to return a specific number that is NOT on the card (unlikely but possible to force for test)
            // Or easier: just pick a number we know is not on the card if possible, or just mock the card.
            // Since we can't easily mock private methods or internal state without more complex setup, 
            // let's try to find a number not on the card.
            const flatCard = player.card.flat();
            let numberNotOnCard = 1;
            while (flatCard.includes(numberNotOnCard)) {
                numberNotOnCard++;
            }

            // Force add this number to drawn numbers to pass the first check
            const room = service.getRoom(roomId);
            room!.numbersDrawn.push(numberNotOnCard);

            expect(() => service.punchNumber(roomId, player.id, numberNotOnCard)).toThrow('Number not on card');
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

            // Simulate a row bingo (first row)
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

            // Simulate a reach (first 4 of first row)
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

            // Simulate a single reach (first 4 of first row)
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

            // Simulate double reach (first 4 of row and first 4 of column)
            const firstRow = player.card[0];
            room!.numbersDrawn.push(...firstRow.slice(0, 4));
            
            // Add first 4 of first column
            for (let i = 0; i < 4; i++) {
                const num = player.card[i][0];
                if (!room!.numbersDrawn.includes(num)) {
                    room!.numbersDrawn.push(num);
                }
            }

            const result = service.claimBingo(roomId, player.id);
            expect(result.reachCount).toBeGreaterThanOrEqual(2);
        });
>>>>>>> origin/main
    });

    it('should return player if valid punch', async () => {
      const roomId = await service.createRoom('host1', 'Test Room');
      const player = await service.joinRoom(roomId, 'host1', 'test');
      await service.startGame(roomId, 'host1');

      const numberOnCard = player.card[0][0];

      // Manually add number to drawn numbers
      const room = await service.getRoom(roomId);
      if (room) {
        room.numbersDrawn.push(numberOnCard);
      }

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

      const room = await service.getRoom(roomId);
      const firstRow = player.card[0];
      if (room) {
        room.numbersDrawn.push(...firstRow);
      }

      const result = await service.claimBingo(roomId, player.id);
      expect(result.isBingo).toBe(true);
    });

    it('should detect reach correctly', async () => {
      const roomId = await service.createRoom('host1', 'Test Room');
      const player = await service.joinRoom(roomId, 'host1', 'test');
      await service.startGame(roomId, 'host1');

      const room = await service.getRoom(roomId);
      const firstRow = player.card[0];
      if (room) {
        room.numbersDrawn.push(...firstRow.slice(0, 4));
      }

      const result = await service.claimBingo(roomId, player.id);
      expect(result.isBingo).toBe(false);
      expect(result.isReach).toBe(true);
    });

    it('should count single reach correctly (Row)', async () => {
      const roomId = await service.createRoom('host1', 'Test Room');
      const player = await service.joinRoom(roomId, 'host1', 'test');
      await service.startGame(roomId, 'host1');

      const room = await service.getRoom(roomId);

      // Mark 4 items in first row
      const firstRow = player.card[0];
      if (room) {
        room.numbersDrawn.push(...firstRow.slice(0, 4));
      }

      const result = await service.claimBingo(roomId, player.id);
      expect(result.reachCount).toBe(1);
    });

    it('should count single reach correctly (Col)', async () => {
      const roomId = await service.createRoom('host1', 'Test Room');
      const player = await service.joinRoom(roomId, 'host1', 'test');
      await service.startGame(roomId, 'host1');

      const room = await service.getRoom(roomId);

      // Mark 4 items in first col
      const firstCol = [
        player.card[0][0],
        player.card[1][0],
        player.card[2][0],
        player.card[3][0],
      ];
      if (room) {
        room.numbersDrawn.push(...firstCol);
      }

      const result = await service.claimBingo(roomId, player.id);
      expect(result.reachCount).toBe(1);
    });

    it('should count single reach correctly (Diag)', async () => {
      const roomId = await service.createRoom('host1', 'Test Room');
      const player = await service.joinRoom(roomId, 'host1', 'test');
      await service.startGame(roomId, 'host1');

      const room = await service.getRoom(roomId);

      // Mark 3 items in diagonal (0,0), (1,1), (3,3) - skipping center (2,2) which is free, and (4,4)
      const diag = [player.card[0][0], player.card[1][1], player.card[3][3]];
      if (room) {
        room.numbersDrawn.push(...diag);
      }

      const result = await service.claimBingo(roomId, player.id);
      expect(result.reachCount).toBe(1);
    });

    it('should count intersection reach as single reach (Row + Col intersection)', async () => {
      const roomId = await service.createRoom('host1', 'Test Room');
      const player = await service.joinRoom(roomId, 'host1', 'test');
      await service.startGame(roomId, 'host1');

      const room = await service.getRoom(roomId);

      // Row 0: [X, X, X, X, O] (O at 0,4)
      // Col 4: [O, X, X, X, X] (O at 0,4)
      // We mark Row 0 (0-3) and Col 4 (1-4)
      // Intersection is (0,4) which is NOT marked.

      const row0 = player.card[0].slice(0, 4); // (0,0) to (0,3)
      const col4 = [
        player.card[1][4],
        player.card[2][4],
        player.card[3][4],
        player.card[4][4],
      ];

      if (room) {
        room.numbersDrawn.push(...row0);
        room.numbersDrawn.push(...col4);
      }

      const result = await service.claimBingo(roomId, player.id);
      expect(result.reachCount).toBe(1);
    });

    it('should not count bingo lines as reach (Issue #18)', async () => {
      const roomId = await service.createRoom('host1', 'Test Room');
      const player = await service.joinRoom(roomId, 'host1', 'test');
      await service.startGame(roomId, 'host1');

      const room = await service.getRoom(roomId);

      // Complete Row 0 (bingo) and 4 marks in Row 1 (reach)
      const row0 = player.card[0]; // All 5 marks -> Bingo
      const row1 = player.card[1].slice(0, 4); // 4 marks -> Reach

      if (room) {
        room.numbersDrawn.push(...row0);
        room.numbersDrawn.push(...row1);
      }

      const result = await service.claimBingo(roomId, player.id);
      expect(result.isBingo).toBe(true);
      expect(result.isReach).toBe(true);
      expect(result.reachCount).toBe(1); // Only Row 1, not Row 0
    });

    it('should count zero reach when player has bingo but no reach lines', async () => {
      const roomId = await service.createRoom('host1', 'Test Room');
      const player = await service.joinRoom(roomId, 'host1', 'test');
      await service.startGame(roomId, 'host1');

      const room = await service.getRoom(roomId);

      // Only complete the first row (bingo), no other lines close to completion
      const firstRow = player.card[0];
      if (room) {
        room.numbersDrawn.push(...firstRow);
      }

      const result = await service.claimBingo(roomId, player.id);
      expect(result.isBingo).toBe(true);
      expect(result.isReach).toBe(false);
      expect(result.reachCount).toBe(0);
    });

    it('should count intersection reach as single reach (Fix Issue #18)', async () => {
      const roomId = await service.createRoom('host1', 'Test Room');
      const player = await service.joinRoom(roomId, 'host1', 'test');
      await service.startGame(roomId, 'host1');

      const room = await service.getRoom(roomId);

      // Row 0: [Empty, X, X, X, X]
      // Col 0: [Empty, X, X, X, X]
      // Intersection at (0,0) is Empty.
      // We mark Row 0 (1-4) and Col 0 (1-4).

      const row0Rest = player.card[0].slice(1); // (0,1) to (0,4)
      const col0Rest = [
        player.card[1][0],
        player.card[2][0],
        player.card[3][0],
        player.card[4][0],
      ];

      if (room) {
        room.numbersDrawn.push(...row0Rest);
        room.numbersDrawn.push(...col0Rest);
      }

      const result = await service.claimBingo(roomId, player.id);
      // Now expecting 1 because only 1 unique number is missing
      expect(result.reachCount).toBe(1);
    });

    it('should count parallel reach as double reach', async () => {
      const roomId = await service.createRoom('host1', 'Test Room');
      const player = await service.joinRoom(roomId, 'host1', 'test');
      await service.startGame(roomId, 'host1');

      const room = await service.getRoom(roomId);

      // Row 0: [Empty, X, X, X, X] (Missing 0,0)
      // Row 1: [Empty, X, X, X, X] (Missing 1,0)
      // Two different missing numbers -> Double Reach

      const row0Rest = player.card[0].slice(1);
      const row1Rest = player.card[1].slice(1);

      if (room) {
        room.numbersDrawn.push(...row0Rest);
        room.numbersDrawn.push(...row1Rest);
      }

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
