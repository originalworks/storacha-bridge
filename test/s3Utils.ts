import {
  S3Client,
  CreateBucketCommand,
  ListObjectsV2Command,
  DeleteObjectsCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  DeleteBucketCommand,
} from '@aws-sdk/client-s3';

export async function recreateBucket(s3: S3Client, bucketName: string) {
  try {
    // check if bucket exists
    await s3.send(new HeadBucketCommand({ Bucket: bucketName }));

    // bucket exists → delete all objects
    let ContinuationToken: string | undefined = undefined;

    while (true) {
      const list = await s3.send(
        new ListObjectsV2Command({ Bucket: bucketName, ContinuationToken }),
      );

      const objects = list.Contents ?? [];
      if (objects.length > 0) {
        await s3.send(
          new DeleteObjectsCommand({
            Bucket: bucketName,
            Delete: { Objects: objects.map((o) => ({ Key: o.Key! })) },
          }),
        );
      }

      if (!list.IsTruncated) break;
      ContinuationToken = list.NextContinuationToken;
    }

    // optionally delete bucket itself to start completely fresh
    await s3.send(new DeleteBucketCommand({ Bucket: bucketName }));
  } catch (err: any) {
    // bucket doesn't exist → we will create it below
    if (err.name !== 'NotFound' && err.$metadata?.httpStatusCode !== 404) {
      throw err;
    }
  }

  // create bucket fresh
  await s3.send(
    new CreateBucketCommand({ Bucket: bucketName, ACL: 'private' }),
  );
}

export async function existsInBucket(
  s3: S3Client,
  bucket: string,
  key: string,
) {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return true;
  } catch (err: any) {
    if (err.name === 'NotFound') return false;
    throw err; // unexpected errors
  }
}
