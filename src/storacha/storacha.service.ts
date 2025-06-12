import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { filesFromPaths } from './filesFromPath';
import type { Client } from '@web3-storage/w3up-client' with { 'resolution-mode': 'import' };
import { UploadResponse } from './storacha.types';
import { PinoLoggerDecorator } from '../pinoLogger/logger';
import { Secrets } from '../awsSecrets/awsSecrets.module';
import { type ISecrets } from '../awsSecrets/awsSecrets.interface';
import { InjectRepository } from '@nestjs/typeorm';
import { Space } from './storacha.entity';
import { Repository } from 'typeorm';
import { DID } from '@web3-storage/w3up-client/types';
import type { AuthInfo } from '../auth/auth.interface';
import { ethers } from 'ethers';
import { serializeError } from '../utils/serializeError';

@Injectable()
export class StorachaService {
  private static readonly logger = new Logger(StorachaService.name);
  private _client: Client;

  constructor(
    @Inject(Secrets)
    private readonly secrets: ISecrets,
    @InjectRepository(Space)
    private spacesRepo: Repository<Space>,
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
      const { Signer } = await import(
        '@web3-storage/w3up-client/principal/ed25519'
      );
      const principal = Signer.parse(this.secrets.STORACHA_KEY);
      const store = new StoreMemory();
      this._client = await create({ principal, store });
      StorachaService.logger.log({
        textMsg: 'Storacha client has been set',
        did: this._client.did(),
      });
    } catch (e) {
      StorachaService.logger.error({
        errorMsg: 'Failed to initialize Storacha',
        originError: serializeError(e),
      });
      throw new InternalServerErrorException(
        'Storacha init error. Please try again later',
      );
    }
  }

  private async loadProofParser() {
    return await import('@web3-storage/w3up-client/proof');
  }

  @PinoLoggerDecorator(StorachaService.logger)
  private async setUserSpace(authInfo: AuthInfo): Promise<void> {
    const { clientType, walletAddress } = authInfo;

    let space: Space;

    if (clientType === 'OWEN') {
      space = await this.spacesRepo.findOneBy({ clientType });
    } else {
      space = await this.spacesRepo.findOneBy({ walletAddress });
    }

    if (!space) {
      const errorMsg = `Storacha space not found for address ${walletAddress}. If you should have one please contact admin@original.works`;

      StorachaService.logger.error({
        errorMsg,
      });

      throw new NotFoundException(errorMsg);
    }

    try {
      await this._client.setCurrentSpace((space.did ?? '') as DID);

      StorachaService.logger.log({
        textMsg: `Space setted up`,
        status: {
          walletAddress,
          clientType,
          spaceDID: space.did,
          parsedDID: space.did,
          alreadyAdded: true,
        },
      });
    } catch {
      const { parse } = await this.loadProofParser();

      const parsedProof = await parse(space.proofBase64);
      const parsedSpace = await this._client.addSpace(parsedProof);

      await this._client.setCurrentSpace(parsedSpace.did());

      await this.spacesRepo.update(
        {
          walletAddress:
            clientType === 'OWEN' ? ethers.ZeroAddress : walletAddress,
        },
        { did: parsedSpace.did() },
      );

      StorachaService.logger.log({
        textMsg: `Space setted up`,
        status: {
          walletAddress,
          clientType,
          spaceDID: space.did,
          parsedDID: parsedSpace.did(),
          alreadyAdded: false,
        },
      });
    }
  }

  @PinoLoggerDecorator(StorachaService.logger)
  public async uploadZip(
    folderPath: string,
    authInfo: AuthInfo,
  ): Promise<UploadResponse> {
    await this.init();
    await this.setUserSpace(authInfo);

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
        originError: serializeError(e),
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
  public async uploadFile(
    filePath: string,
    authInfo: AuthInfo,
  ): Promise<UploadResponse> {
    await this.init();
    await this.setUserSpace(authInfo);

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
        originError: serializeError(e),
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
