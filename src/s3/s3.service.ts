import {
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { Injectable, Logger } from '@nestjs/common';
import { PinoLoggerDecorator } from '../pinoLogger/logger';
import mime from 'mime';
import { basename, extname } from 'path';
import { createReadStream } from 'fs';
import type { IUploadFile } from './s3.types';

@Injectable()
export class S3Service {
  private static readonly logger = new Logger(S3Service.name);
  constructor(protected s3: S3Client) {}

  @PinoLoggerDecorator(S3Service.logger)
  async uploadFile({
    bucketName,
    filePath,
    key,
    overwrite = false,
  }: IUploadFile): Promise<void> {
    const contentType = mime.lookup(filePath) || 'application/octet-stream';
    const originalExt = extname(filePath);
    const originalFileName = basename(filePath);
    const destKey = `${key ?? originalFileName}${originalExt}`;

    if (!overwrite) {
      try {
        await this.s3.send(
          new HeadObjectCommand({ Bucket: bucketName, Key: destKey }),
        );
        S3Service.logger.log('File already exists, skipping upload');
        return;
      } catch (err: any) {
        S3Service.logger.log('File not found in S3. Uploading.');
      }
    }

    const fileStream = createReadStream(filePath);

    const cmd = new PutObjectCommand({
      Bucket: bucketName,
      Key: destKey,
      Body: fileStream,
      ContentType: contentType as string,
    });

    await this.s3.send(cmd);

    const s3Url = `https://${bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${destKey}`;
    S3Service.logger.log(`✅ Uploaded "${destKey}" to ${s3Url}`);
  }
}
