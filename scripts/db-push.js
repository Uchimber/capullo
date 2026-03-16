#!/usr/bin/env node
require("dotenv").config({ path: ".env" });
require("dotenv").config({ path: ".env.local" });

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL .env файлд тохируулна уу.");
  process.exit(1);
}

const { execSync } = require("child_process");
const prismaPath = require.resolve("prisma/build/index.js", {
  paths: [process.cwd()],
});
execSync(`node "${prismaPath}" db push`, {
  stdio: "inherit",
});
