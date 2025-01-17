import * as github from "@actions/github";
import S3 from "../s3Client";
import s3UploadDirectory from "../utils/s3UploadDirectory";
import validateEnvVars from "../utils/validateEnvVars";
import checkBucketExists from "../utils/checkBucketExists";
import octokit from "../octokit";
import deactivateDeployments from "../utils/deactivateDeployments";

export const requiredEnvVars = [
  "AWS_ACCESS_KEY_ID",
  "AWS_SECRET_ACCESS_KEY",
  "GITHUB_TOKEN",
];

export default async (bucketName: string, uploadDirectory: string, environmentPrefix: string) => {
  const awsRegion = process.env['AWS_REGION'] ? process.env['AWS_REGION'] : 'us-east-1';
  const websiteUrl = `http://${bucketName}.s3-website.${awsRegion}.amazonaws.com`;
  const { repo } = github.context;
  const branchName = github.context.payload.pull_request!.head.ref;

  console.log("PR Updated");

  validateEnvVars(requiredEnvVars);

  const bucketExists = await checkBucketExists(bucketName);

  if (!bucketExists) {
    console.log("S3 bucket does not exist. Creating...");

    await S3.createBucket({ Bucket: bucketName }).promise();
    await S3.deletePublicAccessBlock({ Bucket: bucketName }).promise();
    const readOnlyPolicy = {
      "Statement": [{
        Sid: 'PublicReadGetObject',
        Effect: 'Allow',
        Action: ['s3:GetObject'],
        Principal: "*",
        Resource: [`arn:aws:s3:::${bucketName}/*`],  
      }]
    };
    await S3.putBucketPolicy({ Bucket: bucketName, Policy: JSON.stringify(readOnlyPolicy) }).promise();

    console.log("Configuring bucket website...");
    await S3.putBucketWebsite({
      Bucket: bucketName,
      WebsiteConfiguration: {
        IndexDocument: { Suffix: "index.html" },
        ErrorDocument: { Key: "index.html" },
      },
    }).promise();
  } else {
    console.log("S3 Bucket already exists. Skipping creation...");
  }

  await deactivateDeployments(repo, environmentPrefix);

  const deployment = await octokit.repos.createDeployment({
    ...repo,
    ref: `refs/heads/${branchName}`,
    environment: `${environmentPrefix || 'PR-'}${github.context.payload.pull_request!.number}`,
    auto_merge: false,
    transient_environment: true,
    required_contexts: [],
  });

  if ("id" in deployment.data) {
    await octokit.repos.createDeploymentStatus({
      ...repo,
      deployment_id: deployment.data.id,
      state: "in_progress",
    });

    console.log("Uploading files...");
    await s3UploadDirectory(bucketName, uploadDirectory);

    await octokit.repos.createDeploymentStatus({
      ...repo,
      deployment_id: deployment.data.id,
      state: "success",
      environment_url: websiteUrl,
    });

    console.log(`Website URL: ${websiteUrl}`);
  }
};
