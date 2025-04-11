import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';
import { MulterConfigProvider } from './multerConfig.provider';
import { IStorachaBridgeConfig } from '../config/config';

@Module({
  providers: [MulterConfigProvider],
  imports: [
    ConfigModule.forRoot(),
    MulterModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (
        configService: ConfigService<IStorachaBridgeConfig>,
      ) => {
        const provider = new MulterConfigProvider(configService);

        return provider.getMulterConfig();
      },
    }),
  ],
  exports: [MulterModule],
})
export class MulterConfigModule {}
