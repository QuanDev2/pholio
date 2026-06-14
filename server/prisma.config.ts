import { defineConfig, env } from 'prisma/config'
import 'dotenv/config'

const databaseUrl = env('DATABASE_URL')
export default defineConfig({
  schema: './prisma/schema.prisma',
  datasource: {
    url: databaseUrl,
  },
  migrations: {
    path: "prisma/migrations",
  },
})
