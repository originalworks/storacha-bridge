import { Injectable } from '@nestjs/common';
import { diskStorage } from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { join } from 'path';
import { ConfigService } from '@nestjs/config';
import { IConfig } from '../config/config';
import { MulterModuleOptions } from '@nestjs/platform-express';
import { mkdirSync } from 'fs';

@Injectable()
export class MulterConfigProvider {
  constructor(private readonly configService: ConfigService<IConfig>) {}
  getMulterConfig(): MulterModuleOptions {
    const TEMP_PATH = this.configService.get('TEMP_PATH');

    return {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const dest = join(TEMP_PATH, 'uploads', uuidv4());
          mkdirSync(dest, { recursive: true });
          cb(null, dest);
        },
        filename: (req, file, cb) => {
          return cb(null, file.originalname);
        },
      }),
    };
  }
}
