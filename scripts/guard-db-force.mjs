const allowed = process.env.ALLOW_DB_FORCE === "true";
const isProduction = process.env.NODE_ENV === "production";

if (isProduction) {
  console.error("\nBlocked: setup:db:force cannot run when NODE_ENV=production.");
  console.error("Use the safe command instead: npm run setup:db\n");
  process.exit(1);
}

if (!allowed) {
  console.error("\nBlocked: setup:db:force is disabled by default.");
  console.error("Set ALLOW_DB_FORCE=true only for disposable local/dev databases.");
  console.error("Example:");
  console.error("  macOS/Linux: ALLOW_DB_FORCE=true npm run setup:db:force");
  console.error("  Windows (PowerShell): $env:ALLOW_DB_FORCE='true'; npm run setup:db:force\n");
  process.exit(1);
}

console.log("ALLOW_DB_FORCE=true detected. Proceeding with forced DB sync...");
