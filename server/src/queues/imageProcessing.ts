import { Queue } from "bullmq";
import { redis } from "../lib/redis";
import { IMAGE_PROCESSING_QUEUE } from "./names";

export const imageProcessingQueue = new Queue(IMAGE_PROCESSING_QUEUE, {
  connection: redis,
});
