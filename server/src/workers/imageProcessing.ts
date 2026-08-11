import "dotenv/config";
import { Worker } from "bullmq";
import { Redis } from "ioredis";
import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import sharp from "sharp";
import { s3 } from "../lib/s3";
import { VARIANTS, variantKey } from "../lib/photoKeys";
import { IMAGE_PROCESSING_QUEUE } from "../queues/names";

// Payload the producer enqueues on POST /posts/:id/photos.
type ImageJobData = { photoId: string; postId: string; key: string };

// Workers need their own connection with maxRetriesPerRequest: null.
const connection = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
  maxRetriesPerRequest: null,
});

const worker = new Worker(
  IMAGE_PROCESSING_QUEUE,
  async (job) => {
    const { photoId, postId, key } = job.data as ImageJobData;

    // 1. Fetch the original from S3 and drain the stream into a Buffer.
    const object = await s3.send(
      new GetObjectCommand({ Bucket: process.env.AWS_S3_BUCKET_NAME, Key: key }),
    );
    if (!object.Body) throw new Error(`No S3 body for key ${key}`);
    const originalBuffer = Buffer.from(await object.Body.transformToByteArray());

    // 2. Generate the 3 WebP sizes off the same source buffer.
    const variantBuffers = await Promise.all(
      VARIANTS.map(({ width }) => {
        const pipeline = sharp(originalBuffer);
        if (width !== null) pipeline.resize(width, null, { withoutEnlargement: true });
        return pipeline.webp({ quality: 80 }).toBuffer();
      }),
    );

    // 3. Upload each variant back to S3 under its deterministic key.
    await Promise.all(
      VARIANTS.map(({ name }, i) =>
        s3.send(
          new PutObjectCommand({
            Bucket: process.env.AWS_S3_BUCKET_NAME,
            Key: variantKey(postId, photoId, name),
            Body: variantBuffers[i],
            ContentType: "image/webp",
          }),
        ),
      ),
    );

    console.log("[image-processing] done", job.id, `photos/${postId}/${photoId}/`);
  },
  { connection },
);

worker.on("ready", () => console.log("Image worker ready"));
worker.on("failed", (job, err) => console.error("Job failed:", job?.id, err.message));
