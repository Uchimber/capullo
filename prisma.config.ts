import { config } from "dotenv";
import { defineConfig } from "@prisma/config";

// Load .env.local first (Next.js), then .env
config({ path: ".env.local" });
config({ path: ".env" });

// Use DATABASE_URL from .env
let url = process.env.DATABASE_URL;
if (!url) {
  throw new Error("DATABASE_URL .env файлд тохируулна уу.");
}
// MongoDB: database нэр заавал хэрэгтэй (mongodb.net/ without db name)
if (url.startsWith("mongodb") && !url.includes(".net/")) {
  url = url.replace(/(\.mongodb\.net)(\?|$)/, "$1/capullo$2");
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url,
  },
});
