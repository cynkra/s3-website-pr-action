import S3 from '../s3Client';

export default async (bucketName: string, region: region) => {
  try {
    await S3.headBucket({ Bucket: bucketName, Region: region }).promise();
    return true;
  } catch (e) {
    return false;
  }
};
