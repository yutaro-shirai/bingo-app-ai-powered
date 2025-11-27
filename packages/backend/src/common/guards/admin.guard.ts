import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';

@Injectable()
export class AdminGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest();
        const session = request.session;

        if (!session || !session.isAdmin) {
            throw new UnauthorizedException('Admin access required');
        }

        return true;
    }
}
