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
    const { clientType, walletAddress } =
      await this.authService.parseToken(token);

    (request as ReqWithWallet).walletAddress = walletAddress;
    (request as ReqWithWallet).clientType = clientType;

    const isWhitelisted = await this.authService.isWhitelisted(
      walletAddress,
      clientType,
    );

    if (!isWhitelisted) {
      throw new UnauthorizedException(
        `Address ${walletAddress} is not whitelisted on ${clientType} whitelist`,
      );
    }
    return true;
  }
}
@Injectable()
export class OnlyValidatorGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest() as ReqWithWallet;

    if (request.clientType !== 'VALIDATOR') {
      throw new UnauthorizedException('Only Validators can use this endpoint');
    }

    return true;
  }
}
