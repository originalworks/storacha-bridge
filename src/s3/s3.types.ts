export interface IUploadFile {
  bucketName: string;
  filePath: string;
  key?: string;
  overwrite?: boolean;
}
