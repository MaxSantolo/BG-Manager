import "dotenv/config";
import { neonConfig, Pool } from "@neondatabase/serverless";
import ws from "ws";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL non impostato nel .env");
  process.exit(1);
}

const SLEEVE_SIZES = [
  "63x88", "44x68", "70x70", "54x80", "88x125",
  "41x63", "101x127", "59x91", "65x100", "56x87",
  "46x71", "57.5x89", "70x120", "75x105", "70x110",
  "57x57", "44x63",
];

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const client = await pool.connect();

try {
  for (const size of SLEEVE_SIZES) {
    const existing = await client.query(`SELECT id FROM "Sleeve" WHERE size = $1`, [size]);
    if (existing.rowCount === 0) {
      await client.query(
        `INSERT INTO "Sleeve" (size, label, quantity, "createdAt", "updatedAt")
         VALUES ($1, NULL, 0, NOW(), NOW())`,
        [size]
      );
    }
  }
  console.log(`Seed completato: ${SLEEVE_SIZES.length} bustine inserite.`);
} finally {
  client.release();
  await pool.end();
}
