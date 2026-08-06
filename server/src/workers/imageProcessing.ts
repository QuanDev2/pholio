import "dotenv/config";
import { Worker } from "bullmq";
import { Redis } from "ioredis";
import { IMAGE_PROCESSING_QUEUE } from "../queues/names";

// Workers need their own connection with maxRetriesPerRequest: null.
const connection = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
  maxRetriesPerRequest: null,
});

const worker = new Worker(
  IMAGE_PROCESSING_QUEUE,
  async (job) => {
    console.log("[image-processing]", job.id, job.data);
  },
  { connection },
);

worker.on("ready", () => console.log("Image worker ready"));
worker.on("failed", (job, err) => console.error("Job failed:", job?.id, err.message));
