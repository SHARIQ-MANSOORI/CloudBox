import { S3Client } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';

dotenv.config();

const region = process.env.AWS_REGION || 'us-east-1';
const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

export const isAwsConfigured = Boolean(
  accessKeyId &&
  accessKeyId !== 'your_aws_access_key_id' &&
  secretAccessKey &&
  secretAccessKey !== 'your_aws_secret_access_key'
);

export const s3Client = new S3Client({
  region,
  credentials: isAwsConfigured ? {
    accessKeyId,
    secretAccessKey
  } : {
    accessKeyId: 'mock_key',
    secretAccessKey: 'mock_secret'
  }
});

export const BUCKET_NAME = process.env.S3_BUCKET_NAME || 'cloudbox-user-files';
