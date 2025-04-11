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
      return await this.storachaService.uploadZip(extractPath);
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
      throw new BadRequestException('Failed to extract ZIP file');
    }

    return extractPath;
  }

  @PinoLoggerDecorator(UploadService.logger)
  async uploadFile(filepath: string) {
    try {
      return await this.storachaService.uploadFile(filepath);
    } finally {
      await this.cleanup(filepath);
    }
  }

  private async cleanup(path: string) {
    await rm(join(path, '..'), { force: true, recursive: true });
  }
}
