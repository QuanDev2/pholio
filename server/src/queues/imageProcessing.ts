import { Queue } from "bullmq";
import { redis } from "../lib/redis";

// The queue name is shared between the producer (this file) and the worker
// (built later). Export it as a constant so the two can't drift via a typo.
export const IMAGE_PROCESSING_QUEUE = "image-processing";

// The producer handle. The queue itself lives in Redis; this object is how the
// server talks to it. Jobs get added starting Day 2 (imageProcessingQueue.add).
export const imageProcessingQueue = new Queue(IMAGE_PROCESSING_QUEUE, {
  connection: redis,
});
