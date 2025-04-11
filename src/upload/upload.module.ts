import { Module } from '@nestjs/common';
import { MulterConfigModule } from '../multerConfig/multerConfig.module';
import { UploadService } from './upload.service';
import { UploadController } from './upload.controller';
import { StorachaModule } from '../storacha/storacha.module';

@Module({
  imports: [MulterConfigModule, StorachaModule],
  providers: [UploadService],
  controllers: [UploadController],
  exports: [UploadService],
})
export class UploadModule {}
