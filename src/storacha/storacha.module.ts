import { Module } from '@nestjs/common';
import { StorachaService } from './storacha.service';
import { AwsSecretsModule } from '../awsSecrets/awsSecrets.module';
import { Space } from './storacha.entity';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [AwsSecretsModule, TypeOrmModule.forFeature([Space])],
  providers: [StorachaService],
  exports: [StorachaService],
})
export class StorachaModule {}
