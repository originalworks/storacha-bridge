import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { pinoConfig } from './logger';

@Module({
  imports: [LoggerModule.forRoot(pinoConfig)],
  exports: [LoggerModule],
})
export class PinoLoggerModule {}
