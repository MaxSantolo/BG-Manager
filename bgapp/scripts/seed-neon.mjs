/**
 * Seed Neon (PostgreSQL) from local SQLite dev.db.
 * Run AFTER Vercel deploy + DATABASE_URL set in .env:
 *   node scripts/seed-neon.mjs
 */
import "dotenv/config";
import Database from "better-sqlite3";
import { Pool } from "@neondatabase/serverless";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import ws from "ws";
import { neonConfig } from "@neondatabase/serverless";

neonConfig.webSocketConstructor = ws;

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

if (!process.env.DATABASE_URL) {
  console.error("❌ DATABASE_URL non impostato nel .env");
  process.exit(1);
}

const sqlite = new Database(join(ROOT, "dev.db"));
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Create tables if not exist (run prisma migrate first!)
    const games = sqlite.prepare('SELECT * FROM Game').all();
    const wishes = sqlite.prepare('SELECT * FROM WishlistGame').all();

    console.log(`📦 Seeding ${games.length} games + ${wishes.length} wishlist items…`);

    for (const g of games) {
      await client.query(`
        INSERT INTO "Game" ("bggId","name","type","cost","salePrice","status","insert","sleeves","sleeveData","purchaseDate","saleDate","thumbnail","bggRating","bggWeight","minPlayers","maxPlayers","playTime","yearPublished","notes","createdAt","updatedAt")
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,NOW(),NOW())
        ON CONFLICT DO NOTHING
      `, [
        g.bggId, g.name, g.type, g.cost, g.salePrice, g.status,
        g.insert, g.sleeves, g.sleeveData,
        g.purchaseDate || null, g.saleDate || null,
        g.thumbnail, g.bggRating, g.bggWeight,
        g.minPlayers, g.maxPlayers, g.playTime, g.yearPublished, g.notes
      ]);
    }

    for (const w of wishes) {
      await client.query(`
        INSERT INTO "WishlistGame" ("bggId","name","type","valueRange","desirability","status","insert","sleeves","sleeveData","thumbnail","bggRating","bggWeight","minPlayers","maxPlayers","playTime","yearPublished","notes","createdAt","updatedAt")
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,NOW(),NOW())
        ON CONFLICT DO NOTHING
      `, [
        w.bggId, w.name, w.type, w.valueRange, w.desirability, w.status,
        w.insert, w.sleeves, w.sleeveData,
        w.thumbnail, w.bggRating, w.bggWeight,
        w.minPlayers, w.maxPlayers, w.playTime, w.yearPublished, w.notes
      ]);
    }

    await client.query("COMMIT");
    console.log("✅ Seed completato!");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
    await pool.end();
    sqlite.close();
  }
}

run().catch(console.error);
