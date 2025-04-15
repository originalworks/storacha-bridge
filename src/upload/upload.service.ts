import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { createReadStream } from 'fs';
import { mkdir, rm } from 'fs/promises';
import { parse, join } from 'path';
import { Extract } from 'unzipper';
import { StorachaService } from '../storacha/storacha.service';
import { PinoLoggerDecorator } from '../pinoLogger/logger';

@Injectable()
export class UploadService {
  private static readonly logger = new Logger(UploadService.name);

  constructor(private readonly storachaService: StorachaService) {}

  @PinoLoggerDecorator(UploadService.logger)
  async uploadZip(filepath: string) {
    try {
      const extractPath = await this.unzip(filepath);
      const res = await this.storachaService.uploadZip(extractPath);

      UploadService.logger.log({ textMsg: 'Response', res });

      return res;
    } finally {
      await this.cleanup(filepath);
    }
  }

  private async unzip(filepath: string): Promise<string> {
    const extractPath = join(parse(filepath).dir, 'content');
    await mkdir(extractPath, { recursive: true });

    try {
      await createReadStream(filepath)
        .pipe(Extract({ path: extractPath }))
        .promise();
    } catch (e) {
      const errorMsg = 'Failed to extract ZIP file';

      UploadService.logger.error({
        errorMsg,
        originError: e,
      });
      throw new BadRequestException(errorMsg);
    }

    return extractPath;
  }

  @PinoLoggerDecorator(UploadService.logger)
  async uploadFile(filepath: string) {
    try {
      const res = await this.storachaService.uploadFile(filepath);

      UploadService.logger.log({ textMsg: 'Response', res });

      return res;
    } finally {
      await this.cleanup(filepath);
    }
  }

  private async cleanup(path: string) {
    await rm(join(path, '..'), { force: true, recursive: true });
  }
}
