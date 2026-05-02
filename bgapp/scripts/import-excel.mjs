/**
 * Import TabletopGames Excel into SQLite (local dev).
 * Run once: node scripts/import-excel.mjs
 */
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import Database from "better-sqlite3";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

// Dynamic import for xlsx (install with: npm install xlsx)
let XLSX;
try {
  XLSX = (await import("xlsx")).default;
} catch {
  console.error('Run: npm install xlsx  then retry.');
  process.exit(1);
}

const xlsxPath = join(ROOT, "..", "TabletopGames (1).xlsx");
const dbPath = join(ROOT, "dev.db");

const wb = XLSX.readFile(xlsxPath);
const db = new Database(dbPath);

// ── helpers ──────────────────────────────────────────────────────────────────
const SLEEVE_SIZES = [
  "63x88","44x68","70x70","54x80","88x125","41x63",
  "101x127","59x91","65x100","56x87","46x71","57.5x89",
  "70x120","75x105","70x110","57x57","44x63",
];

function toFloat(v) {
  if (v == null || v === "") return null;
  const n = parseFloat(String(v).replace(",", "."));
  return isNaN(n) ? null : n;
}

function toInt(v) {
  if (v == null || v === "") return null;
  const n = parseInt(String(v));
  return isNaN(n) ? null : n;
}

function toISODate(v) {
  if (!v) return null;
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "number") {
    // Excel serial date
    const d = new Date(Math.round((v - 25569) * 86400 * 1000));
    return d.toISOString();
  }
  return null;
}

function buildSleeveData(row, colOffset) {
  // Columns 9-25 (index) correspond to sleeve sizes
  const entries = [];
  for (let i = 0; i < SLEEVE_SIZES.length; i++) {
    const qty = toInt(row[colOffset + i]);
    if (qty && qty > 0) {
      entries.push({ size: SLEEVE_SIZES[i], qty });
    }
  }
  return JSON.stringify(entries);
}

// ── Collezione ────────────────────────────────────────────────────────────────
console.log("📚 Importing Collezione…");
const colSheet = XLSX.utils.sheet_to_json(wb.Sheets["Collezione"], { header: 1, raw: true });
const colHeaders = colSheet[0];
const colRows = colSheet.slice(1);

const insertGame = db.prepare(`
  INSERT OR REPLACE INTO Game
  (bggId, name, type, cost, salePrice, status, "insert", sleeves, sleeveData, purchaseDate, saleDate, notes, createdAt, updatedAt)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
`);

const insertGames = db.transaction((rows) => {
  let ok = 0, skip = 0;
  for (const row of rows) {
    const name = row[1];
    if (!name || typeof name !== "string" || !name.trim()) { skip++; continue; }

    const bggId    = toInt(row[0]);
    const type     = String(row[2] || "Base").trim();
    const cost     = toFloat(row[4]);
    const sale     = toFloat(row[5]);
    const rawStatus = String(row[6] || "In Collezione").trim();
    const statusMap = {
      "In Collezione": "InCollezione",
      "In Vendita":    "InVendita",
      "Preordinato":   "Preordinato",
      "Venduto":       "Venduto",
    };
    const status   = statusMap[rawStatus] ?? "InCollezione";
    const ins      = String(row[7] || "No").trim();
    const slv      = String(row[8] || "No").trim();
    const sleeveDt = buildSleeveData(row, 9);
    const purchDt  = toISODate(row[26]);
    const saleDt   = toISODate(row[27]);

    insertGame.run(bggId, name.trim(), type, cost, sale, status, ins, slv, sleeveDt, purchDt, saleDt, null);
    ok++;
  }
  return { ok, skip };
});

const { ok: okGames, skip: skipGames } = insertGames(colRows);
console.log(`  ✅ ${okGames} giochi importati, ${skipGames} righe saltate`);

// ── Desiderabili ──────────────────────────────────────────────────────────────
console.log("💛 Importing Desiderabili…");
const wisSheet = XLSX.utils.sheet_to_json(wb.Sheets["Desiderabili"], { header: 1, raw: true });
const wisRows = wisSheet.slice(1);

const insertWish = db.prepare(`
  INSERT OR REPLACE INTO WishlistGame
  (name, type, valueRange, desirability, "insert", sleeves, sleeveData, notes, createdAt, updatedAt)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
`);

const insertWishlists = db.transaction((rows) => {
  let ok = 0, skip = 0;
  for (const row of rows) {
    const name = row[0];
    if (!name || typeof name !== "string" || !name.trim()) { skip++; continue; }

    const type      = String(row[1] || "Base").trim();
    const valRange  = row[2] ? String(row[2]).trim() : null;
    const desir     = toInt(row[3]) ?? 3;
    const ins       = String(row[5] || "No").trim();
    const slv       = String(row[6] || "No").trim();
    const sleeveDt  = buildSleeveData(row, 7);

    insertWish.run(name.trim(), type, valRange, desir, ins, slv, sleeveDt, null);
    ok++;
  }
  return { ok, skip };
});

const { ok: okWish, skip: skipWish } = insertWishlists(wisRows);
console.log(`  ✅ ${okWish} giochi importati, ${skipWish} righe saltate`);

console.log("\n🎉 Import completato!");
db.close();
