import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { config } from './config/config';
import { UploadModule } from './upload/upload.module';
import { PinoLoggerModule } from './pinoLogger/pinoLogger.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [config],
      isGlobal: true,
    }),
    PinoLoggerModule,
    UploadModule,
  ],
})
export class AppModule {}
