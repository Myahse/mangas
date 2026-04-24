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
  // This script lives in: <repo>/.tmp-neon-check/tmp-neon-check/
  // so we go up 2 levels to reach <repo>/.
  const repoRoot = path.resolve(__dirname, "..", "..");
  const envPath = path.join(repoRoot, "backend", ".env");
  const databaseUrl = process.env.DATABASE_URL || readDatabaseUrlFromEnvFile(envPath);
 
  if (!databaseUrl) {
    throw new Error(`DATABASE_URL not set and not found in ${envPath}`);
  }
 
  const client = new Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
  });
 
  await client.connect();
  try {
    const sql = `
      select table_schema, table_name
      from information_schema.tables
      where table_type = 'BASE TABLE'
        and table_schema not in ('pg_catalog', 'information_schema')
      order by table_schema, table_name
    `;
    const r = await client.query(sql);
    process.stdout.write(JSON.stringify(r.rows, null, 2) + "\n");
  } finally {
    await client.end();
  }
}
 
main().catch((e) => {
  console.error(e);
  process.exit(1);
});

