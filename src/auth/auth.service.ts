import {
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IConfig } from '../config/config';
import { PinoLoggerDecorator } from '../pinoLogger/logger';
import { ethers, JsonRpcProvider } from 'ethers';
import type { AuthInfo, ClientType } from './auth.interface';
import { Whitelist } from '../contracts/whitelist/Whitelist';
import { Whitelist__factory } from '../contracts/whitelist/Whitelist__factory';
import { DdexSequencer__factory } from '../contracts/ddexSequencer/DdexSequencer__factory';
import { Secrets } from '../awsSecrets/awsSecrets.module';
import { type ISecrets } from '../awsSecrets/awsSecrets.interface';

@Injectable()
export class AuthService {
  private static readonly logger = new Logger(AuthService.name);
  private _provider: JsonRpcProvider;
  private _whitelists: Record<ClientType, Whitelist> = {
    OWEN: undefined,
    VALIDATOR: undefined,
  };

  constructor(
    @Inject(Secrets)
    private readonly secrets: ISecrets,
    private readonly configService: ConfigService<IConfig>,
  ) {
    this._provider = new JsonRpcProvider(this.secrets.RPC_URL);
  }

  private async getWhitelist(type: ClientType) {
    if (this._whitelists[type]) {
      return this._whitelists[type];
    }

    const sequencer = DdexSequencer__factory.connect(
      this.configService.get('DDEX_SEQUENCER_ADDRESS'),
      this._provider,
    );
    const whitelistId =
      type === 'OWEN'
        ? await sequencer.DATA_PROVIDERS_WHITELIST()
        : await sequencer.VALIDATORS_WHITELIST();

    const whitelistAddress = await sequencer.whitelists(whitelistId);

    this._whitelists[type] = Whitelist__factory.connect(
      whitelistAddress,
      this._provider,
    );

    return this._whitelists[type];
  }

  @PinoLoggerDecorator(AuthService.logger)
  async isWhitelisted(address: string, client: ClientType) {
    try {
      const whitelist = await this.getWhitelist(client);
      const res = await whitelist.isWhitelisted(address);
      AuthService.logger.log({
        textMsg: 'Whitelisted Status',
        status: { whitelist: whitelist.target, isWhitelisted: res },
      });
      return res;
    } catch (e) {
      AuthService.logger.error({
        errorMsg: 'RPC Failure',
        originError: JSON.stringify(e),
      });
      throw new InternalServerErrorException(
        'RPC Error. Please try again later',
      );
    }
  }

  @PinoLoggerDecorator(AuthService.logger)
  async parseToken(token: string): Promise<AuthInfo> {
    const [client, signature] = token.split('::') ?? [];

    const typedClient = client as ClientType;

    if (typedClient !== 'OWEN' && typedClient !== 'VALIDATOR') {
      throw new UnauthorizedException('Invalid client type in signed message');
    }

    try {
      const walletAddress = ethers.verifyMessage(client, signature);

      AuthService.logger.log({
        textMsg: 'Resolved wallet',
        wallet: { walletAddress, typedClient },
      });

      return {
        client: typedClient,
        walletAddress,
      };
    } catch (e) {
      AuthService.logger.error({
        errorMsg: 'Failed to verify message',
        originError: JSON.stringify(e),
      });
      throw new UnauthorizedException(
        'Malformed signature in authorization header',
      );
    }
  }
}
