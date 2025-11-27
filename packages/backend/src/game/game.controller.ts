import { Controller, Get, UseGuards } from '@nestjs/common';
import { GameService } from './game.service';
import { AdminGuard } from '../common/guards/admin.guard';

@Controller('game')
@UseGuards(AdminGuard)
export class GameController {
    constructor(private readonly gameService: GameService) { }

    @Get('rooms')
    async getAllRooms() {
        return this.gameService.getAllRooms();
    }
}
