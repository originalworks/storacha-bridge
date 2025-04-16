import { Module, Provider } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { config } from './config/config';
import { UploadModule } from './upload/upload.module';
import { PinoLoggerModule } from './pinoLogger/pinoLogger.module';
import { SentryGlobalFilter, SentryModule } from '@sentry/nestjs/setup';
import { APP_FILTER } from '@nestjs/core';

const providers: Provider[] = [
  {
    provide: APP_FILTER,
    useClass: SentryGlobalFilter,
  },
];

@Module({
  imports: [
    SentryModule.forRoot(),
    ConfigModule.forRoot({
      load: [config],
      isGlobal: true,
    }),
    PinoLoggerModule,
    UploadModule,
  ],
  providers,
})
export class AppModule {}
