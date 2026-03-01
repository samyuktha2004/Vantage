import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");

const envExamplePath = path.join(root, ".env.example");
const envPath = path.join(root, ".env");

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: process.platform === "win32",
    cwd: root,
    ...options,
  });

  if (result.status !== 0) {
    throw new Error(`Command failed: ${command} ${args.join(" ")}`);
  }
}

function checkNodeVersion() {
  const major = Number(process.versions.node.split(".")[0]);
  if (Number.isNaN(major) || major < 18) {
    throw new Error(`Node.js 18+ is required. Current version: ${process.version}`);
  }
}

function ensureEnvFile() {
  if (!fs.existsSync(envPath)) {
    if (!fs.existsSync(envExamplePath)) {
      throw new Error(".env.example not found in project root");
    }
    fs.copyFileSync(envExamplePath, envPath);
    console.log("Created .env from .env.example");
  }
}

function upsertSessionSecret(content) {
  const generated = randomBytes(48).toString("hex");
  const hasSessionSecret = /^SESSION_SECRET=.*$/m.test(content);

  if (!hasSessionSecret) {
    return `${content.trimEnd()}\nSESSION_SECRET=${generated}\n`;
  }

  return content.replace(
    /^SESSION_SECRET=(.*)$/m,
    (_line, value) => {
      const current = String(value ?? "").trim();
      const isPlaceholder =
        !current ||
        current.includes("replace-this") ||
        current.includes("RANDOM_HEX") ||
        current.includes("random") ||
        current.includes("<") ||
        current.includes("YOUR");

      if (isPlaceholder) {
        return `SESSION_SECRET=${generated}`;
      }

      return `SESSION_SECRET=${current}`;
    },
  );
}

function validateDatabaseUrl(content) {
  const match = content.match(/^DATABASE_URL=(.*)$/m);
  if (!match) {
    return false;
  }

  const value = String(match[1] ?? "").trim();
  if (!value) {
    return false;
  }

  const looksPlaceholder =
    value.includes("YOUR") ||
    value.includes("[") ||
    value.includes("<") ||
    value.includes("replace") ||
    value.includes("example");

  return !looksPlaceholder;
}

function main() {
  console.log("\nVantage setup: starting...\n");
  checkNodeVersion();

  ensureEnvFile();
  let envContent = fs.readFileSync(envPath, "utf8");
  envContent = upsertSessionSecret(envContent);
  fs.writeFileSync(envPath, envContent, "utf8");

  console.log("Installing dependencies...");
  run("npm", ["install"]);

  const hasDatabaseUrl = validateDatabaseUrl(envContent);
  if (!hasDatabaseUrl) {
    console.log("\nDATABASE_URL is missing or still a placeholder in .env.");
    console.log("Please update DATABASE_URL, then run: npm run setup:db\n");
    console.log("Setup completed partially (dependencies + env scaffold).");
    return;
  }

  console.log("\nDATABASE_URL detected.");
  console.log("For safety, schema sync is not run automatically.");
  console.log("Review your target DB first, then run: npm run setup:db\n");

  console.log("\nSetup completed successfully.");
  console.log("Next: npm run dev\n");
}

try {
  main();
} catch (error) {
  console.error("\nSetup failed:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
