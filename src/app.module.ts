import { DynamicModule, Module, Provider } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { config } from './config/config';
import { UploadModule } from './upload/upload.module';
import { PinoLoggerModule } from './pinoLogger/pinoLogger.module';
import { SentryGlobalFilter, SentryModule } from '@sentry/nestjs/setup';
import { APP_FILTER } from '@nestjs/core';
import { DataSourceOptions } from 'typeorm';
import { TypeOrmModule } from '@nestjs/typeorm';

const providers: Provider[] = [
  {
    provide: APP_FILTER,
    useClass: SentryGlobalFilter,
  },
];

@Module({})
export class AppModule {
  static forDbConnection(dbConfig: DataSourceOptions): DynamicModule {
    const imports = [
      SentryModule.forRoot(),
      ConfigModule.forRoot({
        load: [config],
        isGlobal: true,
      }),
      TypeOrmModule.forRoot({ ...dbConfig }),
      PinoLoggerModule,
      UploadModule,
    ];

    return {
      module: AppModule,
      imports,
      providers,
    };
  }
}
