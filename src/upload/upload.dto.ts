import { IsEthereumAddress } from 'class-validator';

export class UploadZipParamsDto {
  @IsEthereumAddress()
  spaceOwnerAddress: string;
}
