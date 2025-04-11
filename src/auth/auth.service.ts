import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IStorachaBridgeConfig } from '../config/config';
import { PinoLoggerDecorator } from '../pinoLogger/logger';
import { ethers, JsonRpcProvider } from 'ethers';
import type { AuthInfo, ClientType } from './auth.interface';
import { Whitelist } from '../../contracts/whitelist/Whitelist';
import { Whitelist__factory } from '../../contracts/whitelist/Whitelist__factory';
import { DdexSequencer__factory } from '../../contracts/ddexSequencer/DdexSequencer__factory';

@Injectable()
export class AuthService {
  private static readonly logger = new Logger(AuthService.name);
  private _whitelists: Record<ClientType, Whitelist>;
  private _provider: JsonRpcProvider;

  constructor(
    private readonly configService: ConfigService<IStorachaBridgeConfig>,
  ) {
    this._provider = new JsonRpcProvider(this.configService.get('RPC_URL'));
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
  public async isWhitelisted(address: string, client: ClientType) {
    return this.getWhitelist[client].isWhitelisted(address);
  }

  @PinoLoggerDecorator(AuthService.logger)
  public async parseToken(token: string): Promise<AuthInfo> {
    const [client, signature] = token.split('::') ?? [];

    const typedClient = client as ClientType;

    if (typedClient !== 'OWEN' && typedClient !== 'VALIDATOR') {
      throw new BadRequestException('Invalid client type in signed message');
    }

    const walletAddress = ethers.verifyMessage(client, signature);

    return {
      client: typedClient,
      walletAddress,
    };
  }
}
