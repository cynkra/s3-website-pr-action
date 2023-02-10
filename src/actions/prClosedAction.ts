import * as github from "@actions/github";
import S3 from '../s3Client';
import { DeleteObjectsRequest, ListObjectsV2Output } from 'aws-sdk/clients/s3';
import validateEnvVars from '../utils/validateEnvVars';
import deactivateDeployments from '../utils/deactivateDeployments';
import deleteDeployments from "../utils/deleteDeployments";

export const requiredEnvVars = ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY'];

export default async (bucketName: string, environmentPrefix: string, region: string) => {
  const { repo } = github.context;

  validateEnvVars(requiredEnvVars);

  console.log('Emptying S3 bucket...');

  console.log('Fetching objects...');
  let isTruncated: boolean | undefined = true;
  let nextContinuationToken: string | undefined = undefined;
  let objects: ListObjectsV2Output;
  while(isTruncated){
    objects = await S3.listObjectsV2({ Bucket: bucketName, region: region, ContinuationToken: nextContinuationToken }).promise();
    if (objects.Contents && objects.Contents.length >= 1) {
      const deleteParams: DeleteObjectsRequest = {
        Bucket: bucketName,
        Region: region,
        Delete: {
          Objects: []
        }
      };

      for (const object of objects.Contents) {
        deleteParams.Delete.Objects.push({ Key: object.Key });
      }
      console.log('Deleting objects...');
      await S3.deleteObjects(deleteParams).promise();
    }
    isTruncated = objects.IsTruncated;
    nextContinuationToken = objects.NextContinuationToken;
  }

  await S3.deleteBucket({ Bucket: bucketName }).promise();


  await deactivateDeployments(repo, environmentPrefix);
  await deleteDeployments(repo, environmentPrefix)

  console.log('S3 bucket removed');
};
