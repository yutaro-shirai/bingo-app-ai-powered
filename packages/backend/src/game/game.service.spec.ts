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
            expect(() => service.punchNumber('invalid', 'player1', 1)).toThrow('Room not found');
        });

        it('should throw error if player not found', () => {
            const roomId = service.createRoom('host1');
            expect(() => service.punchNumber(roomId, 'player1', 1)).toThrow('Player not found');
        });

        it('should throw error if number not drawn', () => {
            const roomId = service.createRoom('host1');
            const player = service.joinRoom(roomId, 'player1', 'test');
            service.startGame(roomId, 'host1');

            // Find a number on the card
            const numberOnCard = player.card[0][0];

            expect(() => service.punchNumber(roomId, 'player1', numberOnCard)).toThrow('Number not drawn yet');
        });

        it('should throw error if number not on card', () => {
            const roomId = service.createRoom('host1');
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
            room.numbersDrawn.push(numberNotOnCard);

            expect(() => service.punchNumber(roomId, 'player1', numberNotOnCard)).toThrow('Number not on card');
        });

        it('should return player if valid punch', () => {
            const roomId = service.createRoom('host1');
            const player = service.joinRoom(roomId, 'player1', 'test');
            service.startGame(roomId, 'host1');

            const numberOnCard = player.card[0][0];
            const room = service.getRoom(roomId);
            room.numbersDrawn.push(numberOnCard);

            const result = service.punchNumber(roomId, 'player1', numberOnCard);
            expect(result).toBeDefined();
            expect(result.id).toBe('player1');
        });
    });

    describe('claimBingo', () => {
        it('should detect bingo correctly', () => {
            const roomId = service.createRoom('host1');
            const player = service.joinRoom(roomId, 'player1', 'test');
            service.startGame(roomId, 'host1');
            const room = service.getRoom(roomId);

            // Simulate a row bingo (first row)
            const firstRow = player.card[0];
            room.numbersDrawn.push(...firstRow);

            const result = service.claimBingo(roomId, 'player1');
            expect(result.isBingo).toBe(true);
        });

        it('should detect reach correctly', () => {
            const roomId = service.createRoom('host1');
            const player = service.joinRoom(roomId, 'player1', 'test');
            service.startGame(roomId, 'host1');
            const room = service.getRoom(roomId);

            // Simulate a reach (first 4 of first row)
            const firstRow = player.card[0];
            room.numbersDrawn.push(...firstRow.slice(0, 4));

            const result = service.claimBingo(roomId, 'player1');
            expect(result.isBingo).toBe(false);
            expect(result.isReach).toBe(true);
        });
    });
});
