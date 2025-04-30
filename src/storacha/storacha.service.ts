import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IConfig } from '../config/config';
import { filesFromPaths } from './filesFromPath';
import type { Client } from '@web3-storage/w3up-client' with { 'resolution-mode': 'import' };
import { UploadResponse } from './storacha.types';
import { PinoLoggerDecorator } from '../pinoLogger/logger';
import { Secrets } from '../awsSecrets/awsSecrets.module';
import { type ISecrets } from '../awsSecrets/awsSecrets.interface';

@Injectable()
export class StorachaService {
  private static readonly logger = new Logger(StorachaService.name);
  private _client: Client;

  constructor(
    @Inject(Secrets)
    private readonly secrets: ISecrets,
    private readonly configService: ConfigService<IConfig>,
  ) {}

  @PinoLoggerDecorator(StorachaService.logger)
  private async init() {
    if (this._client) {
      return;
    }
    try {
      const { StoreMemory } = await import(
        '@web3-storage/w3up-client/stores/memory'
      );
      const { create } = await import('@web3-storage/w3up-client');
      const { parse } = await import('@web3-storage/w3up-client/proof');
      const { Signer } = await import(
        '@web3-storage/w3up-client/principal/ed25519'
      );
      const principal = Signer.parse(this.secrets.STORACHA_KEY);
      const store = new StoreMemory();
      this._client = await create({ principal, store });
      const proof = await parse(this.secrets.STORACHA_PROOF);
      const space = await this._client.addSpace(proof);
      await this._client.setCurrentSpace(space.did());
    } catch (e) {
      StorachaService.logger.error({
        errorMsg: 'Failed to initialize Storacha',
        originError: JSON.stringify(e),
      });
      throw new InternalServerErrorException(
        'Storacha init error. Please try again later',
      );
    }
  }

  @PinoLoggerDecorator(StorachaService.logger)
  public async uploadZip(folderPath: string): Promise<UploadResponse> {
    await this.init();

    const files = await filesFromPaths(folderPath);

    StorachaService.logger.log({
      textMsg: 'Files to be uploaded to Storacha',
      files: files.map((item) => ({
        file: item.name,
        size: `${item.size / 1000} kB`,
      })),
    });

    let cid: string = '';

    try {
      const cidObj = await this._client.uploadDirectory(files);
      cid = cidObj.toString();
    } catch (e) {
      StorachaService.logger.error({
        errorMsg: 'Failed to upload files to Storacha',
        originError: JSON.stringify(e),
      });
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

    StorachaService.logger.log({
      textMsg: 'Files to be uploaded to Storacha',
      files: file.map((item) => ({
        file: item.name,
        size: `${item.size / 1000} kB`,
      })),
    });

    if (file.length !== 1) {
      throw new BadRequestException('Expected single file');
    }

    let cid: string = '';

    try {
      const cidObj = await this._client.uploadFile(file[0]);
      cid = cidObj.toString();
    } catch (e) {
      StorachaService.logger.error({
        errorMsg: 'Failed to upload files to Storacha',
        originError: JSON.stringify(e),
      });
      throw new InternalServerErrorException(
        'Failed to upload file to Storacha',
      );
    }

    return {
      cid,
      url: `https://${cid}.ipfs.w3s.link`,
    };
  }
}
