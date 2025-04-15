import {
  Controller,
  FileTypeValidator,
  MaxFileSizeValidator,
  ParseFilePipe,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '../auth/auth.guard';
import { UploadService } from './upload.service';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5mb

@Controller('w3up')
export class UploadController {
  constructor(private uploadService: UploadService) {}

  @Post('dir')
  @UseGuards(AuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  async handleUploadZip(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({
            maxSize: MAX_FILE_SIZE,
            message(maxSize) {
              return `File is too big, max ${maxSize} is accepted`;
            },
          }),
          new FileTypeValidator({ fileType: 'application/zip' }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    return await this.uploadService.uploadZip(file.path);
  }

  @Post('file')
  @UseGuards(AuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  async handleUploadFile(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({
            maxSize: MAX_FILE_SIZE,
            message(maxSize) {
              return `File is too big, max ${maxSize} is accepted`;
            },
          }),
          new FileTypeValidator({ fileType: 'image/*' }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    return await this.uploadService.uploadFile(file.path);
  }
}
