const fs = require("node:fs");
const path = require("node:path");
const { Client } = require("pg");

function readDatabaseUrlFromEnvFile(envPath) {
  const content = fs.readFileSync(envPath, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    if (line.startsWith("DATABASE_URL=")) return line.slice("DATABASE_URL=".length).trim();
  }
  return null;
}

async function main() {
  const repoRoot = path.resolve(__dirname, "..", "..");
  const envPath = path.join(repoRoot, "backend", ".env");
  const sqlPath = path.join(
    repoRoot,
    "backend",
    "mangafrik",
    "src",
    "main",
    "resources",
    "db",
    "migration",
    process.env.MIGRATION_FILE || "V1__init_core_tables.sql",
  );

  const databaseUrl = process.env.DATABASE_URL || readDatabaseUrlFromEnvFile(envPath);
  if (!databaseUrl) throw new Error(`DATABASE_URL not set and not found in ${envPath}`);

  const migrationSql = fs.readFileSync(sqlPath, "utf8");

  const client = new Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  try {
    await client.query("begin");
    await client.query(migrationSql);
    await client.query("commit");
    process.stdout.write("Migration applied.\n");
  } catch (e) {
    try {
      await client.query("rollback");
    } catch {}
    throw e;
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

