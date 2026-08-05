import "dotenv/config";
import { Redis } from "ioredis";

// Producer-side Redis connection, shared across all queues (BullMQ allows one
// ioredis instance to back multiple Queue producers). Workers do NOT share this
// — they need their own connection with maxRetriesPerRequest: null, set up when
// the worker process is built.
const redis = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379");

// An ioredis "error" event with no listener is an unhandled error that crashes
// the process. Listening here keeps a transient Redis blip from taking down the
// API.
redis.on("connect", () => console.log("Redis connected"));
redis.on("error", (err) => console.error("Redis error:", err.message));

export { redis };
