import { Injectable, Logger } from '@nestjs/common';
import { diskStorage } from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { extname, join } from 'path';
import { ConfigService } from '@nestjs/config';
import { IConfig } from '../config/config';
import { MulterModuleOptions } from '@nestjs/platform-express';
import { mkdirSync } from 'fs';
import mime from 'mime-types';

@Injectable()
export class MulterConfigProvider {
  private static readonly logger = new Logger(MulterConfigProvider.name);

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
          const extName = extname(file.originalname);

          if (!extName) {
            const extFromMime = mime.extension(file.mimetype);
            const { originalname, mimetype } = file;

            if (extFromMime) {
              const assumedName = `${file.originalname}.${extFromMime}`;

              MulterConfigProvider.logger.log({
                textMsg:
                  'Uploaded file has no extension but it was assumed from mime-type',
                content: {
                  extName,
                  originalname,
                  mimetype,
                  assumedName,
                },
              });

              return cb(null, assumedName);
            } else {
              MulterConfigProvider.logger.warn({
                textMsg:
                  'Uploaded file has no extension and mime-type lookup failed. Leaving it as it is',
                content: {
                  extName,
                  originalname,
                  mimetype,
                },
              });
            }
          }

          return cb(null, file.originalname);
        },
      }),
    };
  }
}
