import { Module } from '@nestjs/common';
import { MulterConfigModule } from '../multerConfig/multerConfig.module';
import { UploadService } from './upload.service';
import { UploadController } from './upload.controller';
import { StorachaModule } from '../storacha/storacha.module';
import { AuthModule } from '../auth/auth.module';
import { S3Module } from '../s3/s3.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot(),
    MulterConfigModule,
    StorachaModule,
    AuthModule,
    S3Module,
  ],
  providers: [UploadService],
  controllers: [UploadController],
  exports: [UploadService],
})
export class UploadModule {}
