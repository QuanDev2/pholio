import "dotenv/config";
import { readFileSync } from "node:fs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

// RDS presents a server cert signed by an Amazon RDS CA that isn't in Node's
// default trust store, so the runtime pg adapter rejects it with
// "self-signed certificate in certificate chain". When DATABASE_CA_PATH points
// at the AWS RDS CA bundle (global-bundle.pem), verify the cert against it with
// rejectUnauthorized: true — real verification, not the sslmode=no-verify
// band-aid. Local dev (docker Postgres, no TLS) leaves the var unset, so no ssl
// block is passed and the connection stays plain.
const caPath = process.env.DATABASE_CA_PATH;
const ssl = caPath ? { ca: readFileSync(caPath, "utf8"), rejectUnauthorized: true } : undefined;

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL!, ssl });
const prisma = new PrismaClient({ adapter });

export { prisma };
