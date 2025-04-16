import { Module } from '@nestjs/common';
import { StorachaService } from './storacha.service';
import { AwsSecretsModule } from '../awsSecrets/awsSecrets.module';

@Module({
  imports: [AwsSecretsModule],
  providers: [StorachaService],
  exports: [StorachaService],
})
export class StorachaModule {}
