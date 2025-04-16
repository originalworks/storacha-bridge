import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AwsSecretsModule } from '../awsSecrets/awsSecrets.module';

@Module({
  imports: [AwsSecretsModule],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
