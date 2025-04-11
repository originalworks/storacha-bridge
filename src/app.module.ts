import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { config } from './config/config';
import { UploadModule } from './upload/upload.module';
import { PinoLoggerModule } from './pinoLogger/pinoLogger.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    PinoLoggerModule,
    UploadModule,
    AuthModule,
    ConfigModule.forRoot({
      load: [config],
      isGlobal: true,
    }),
  ],
})
export class AppModule {}
