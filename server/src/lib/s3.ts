import { S3Client } from "@aws-sdk/client-s3";
import "dotenv/config";

const s3 = new S3Client();

export { s3 };
