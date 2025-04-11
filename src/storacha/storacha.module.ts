import { Module } from '@nestjs/common';
import { StorachaService } from './storacha.service';

@Module({
  providers: [StorachaService],
  exports: [StorachaService],
})
export class StorachaModule {}
