import { Module } from '@nestjs/common';
import { S3Service } from './s3.service';
import { S3Factory } from './s3Factory';

@Module({
  providers: [S3Service, S3Factory],
  exports: [S3Service],
})
export class S3Module {}
