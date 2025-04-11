import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IStorachaBridgeConfig } from '../config/config';
import { filesFromPaths } from './filesFromPath';
import type { Client } from '@web3-storage/w3up-client' with { 'resolution-mode': 'import' };
import { UploadResponse } from './storacha.types';
import { PinoLoggerDecorator } from '../pinoLogger/logger';

@Injectable()
export class StorachaService {
  private static readonly logger = new Logger(StorachaService.name);
  private _client: Client;

  constructor(
    private readonly configService: ConfigService<IStorachaBridgeConfig>,
  ) {}

  @PinoLoggerDecorator(StorachaService.logger)
  private async init() {
    if (this._client) {
      return;
    }
    const { StoreMemory } = await import(
      '@web3-storage/w3up-client/stores/memory'
    );
    const { create } = await import('@web3-storage/w3up-client');
    const { parse } = await import('@web3-storage/w3up-client/proof');
    const { Signer } = await import(
      '@web3-storage/w3up-client/principal/ed25519'
    );
    const principal = Signer.parse(this.configService.get('STORACHA_KEY'));
    const store = new StoreMemory();
    this._client = await create({ principal, store });
    const proof = await parse(this.configService.get('STORACHA_PROOF'));
    const space = await this._client.addSpace(proof);
    await this._client.setCurrentSpace(space.did());
  }

  @PinoLoggerDecorator(StorachaService.logger)
  public async uploadZip(folderPath: string): Promise<UploadResponse> {
    await this.init();

    const files = await filesFromPaths(folderPath);
    let cid: string = '';

    try {
      const cidObj = await this._client.uploadDirectory(files);
      cid = cidObj.toString();
    } catch (e) {
      throw new InternalServerErrorException(
        'Failed to upload files to Storacha',
      );
    }
    const res = {
      cid,
      url: `https://${cid}.ipfs.w3s.link`,
    };

    return res;
  }

  @PinoLoggerDecorator(StorachaService.logger)
  public async uploadFile(filePath: string): Promise<UploadResponse> {
    await this.init();

    const file = await filesFromPaths(filePath);

    if (file.length !== 1) {
      throw new BadRequestException('Expected single file');
    }

    let cid: string = '';

    try {
      const cidObj = await this._client.uploadFile(file[0]);
      cid = cidObj.toString();
    } catch (e) {
      throw new InternalServerErrorException(
        'Failed to upload files to Storacha',
      );
    }

    return {
      cid,
      url: `https://${cid}.ipfs.w3s.link`,
    };
  }
}
