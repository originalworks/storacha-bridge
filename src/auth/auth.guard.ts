import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { ReqWithWallet } from './auth.interface';
import { AuthService } from './auth.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    const token = request.headers['authorization'] as string;

    if (!token) {
      throw new UnauthorizedException('Missing authorization header');
    }

    const { client, walletAddress } = await this.authService.parseToken(token);

    (request as ReqWithWallet).walletAddress = walletAddress;
    (request as ReqWithWallet).client = client;

    const isWhitelisted = await this.authService.isWhitelisted(
      walletAddress,
      client,
    );

    if (!isWhitelisted) {
      throw new UnauthorizedException('Wallet address is not whitelisted');
    }

    return true;
  }
}
