import { Module } from '@nestjs/common';
import { MulterConfigModule } from '../multerConfig/multerConfig.module';
import { UploadService } from './upload.service';
import { UploadController } from './upload.controller';
import { StorachaModule } from '../storacha/storacha.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [MulterConfigModule, StorachaModule, AuthModule],
  providers: [UploadService],
  controllers: [UploadController],
  exports: [UploadService],
})
export class UploadModule {}
