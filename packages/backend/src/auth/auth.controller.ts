import { Body, Controller, Post, UnauthorizedException, Session, HttpCode, HttpStatus } from '@nestjs/common';
import { IsString, IsNotEmpty } from 'class-validator';

class LoginDto {
    @IsString()
    @IsNotEmpty()
    password: string;
}

@Controller('auth')
export class AuthController {
    @Post('login')
    @HttpCode(HttpStatus.OK)
    login(@Body() body: LoginDto, @Session() session: Record<string, any>) {
        const adminPassword = process.env.ADMIN_PASSWORD;

        if (!adminPassword) {
            throw new UnauthorizedException('Admin password not configured');
        }

        if (body.password !== adminPassword) {
            throw new UnauthorizedException('Invalid password');
        }

        session.isAdmin = true;
        return { message: 'Login successful' };
    }

    @Post('logout')
    @HttpCode(HttpStatus.OK)
    logout(@Session() session: Record<string, any>) {
        session.isAdmin = false;
        return { message: 'Logout successful' };
    }
}
