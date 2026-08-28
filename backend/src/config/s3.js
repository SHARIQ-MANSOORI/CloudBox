import { S3Client } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';

dotenv.config();

const region = process.env.AWS_REGION || 'us-east-1';
const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
const useMockS3 = process.env.USE_MOCK_S3 === 'true';

const hasStaticKeys = Boolean(
  accessKeyId &&
  accessKeyId !== 'your_aws_access_key_id' &&
  secretAccessKey &&
  secretAccessKey !== 'your_aws_secret_access_key'
);

// AWS S3 is considered configured if mock mode is disabled (uses static keys or EC2 IAM Role)
export const isAwsConfigured = !useMockS3;

const s3Config = { region };

if (hasStaticKeys) {
  s3Config.credentials = { accessKeyId, secretAccessKey };
} else if (useMockS3) {
  s3Config.credentials = { accessKeyId: 'mock_key', secretAccessKey: 'mock_secret' };
}
// Note: When neither static keys nor mock mode are set, credentials property is omitted,
// allowing AWS SDK v3 to automatically authenticate via EC2 IAM Role (cloudbox-ec2-role-new).

export const s3Client = new S3Client(s3Config);

export const BUCKET_NAME = process.env.S3_BUCKET_NAME || 'cloudbox-user-files';
