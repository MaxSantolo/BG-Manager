/**
 * Drives a real Chrome to obtain a BGG session cookie.
 * Rationale: BGG's login endpoints are behind a Cloudflare challenge that curl
 * cannot pass, but a real browser clears it. We log in from the page context
 * (same /login/api/v1 the server used to call) and then read the cookies.
 * Prints only cookie NAMES and statuses — never values or the password.
 */
const { spawn } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");
const WebSocket = require("ws");
require("dotenv").config();
const { neon } = require("@neondatabase/serverless");

const PORT = Number(process.env.BGG_CDP_PORT || 9333);
const HEADLESS = process.argv.includes("--headless") || process.env.BGG_HEADLESS === "1";

/** Chrome binary: explicit override, else the usual macOS/Linux locations. */
function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
  ].filter(Boolean);
  for (const c of candidates) { try { if (fs.existsSync(c)) return c; } catch {} }
  throw new Error("Chrome non trovato: imposta CHROME_PATH");
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getJson(url) {
  const res = await fetch(url);
  return res.json();
}

function rpc(ws) {
  let id = 0;
  const pending = new Map();
  ws.on("message", (raw) => {
    let msg;
    try { msg = JSON.parse(raw.toString()); } catch { return; }
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result);
    }
  });
  return (method, params = {}, sessionId) =>
    new Promise((resolve, reject) => {
      const msgId = ++id;
      pending.set(msgId, { resolve, reject });
      ws.send(JSON.stringify({ id: msgId, method, params, ...(sessionId ? { sessionId } : {}) }));
      setTimeout(() => {
        if (pending.has(msgId)) { pending.delete(msgId); reject(new Error(`timeout ${method}`)); }
      }, 60000);
    });
}

/**
 * Two ways to run:
 *  - locally (launchd): DATABASE_URL set → credentials read from Settings, the
 *    refreshed cookie written straight back to the DB;
 *  - from CI: BGG_USERNAME/BGG_PASSWORD + BGG_COOKIE_ENDPOINT/BGG_COOKIE_TOKEN →
 *    no database credential involved, the cookie is POSTed to the app instead.
 */
(async () => {
  const endpoint = (process.env.BGG_COOKIE_ENDPOINT || "").trim();
  const endpointToken = (process.env.BGG_COOKIE_TOKEN || "").trim();
  const useEndpoint = !!(endpoint && endpointToken);

  let username = (process.env.BGG_USERNAME || "").trim();
  let password = (process.env.BGG_PASSWORD || "").trim();
  let sql = null;

  if (!username || !password) {
    if (!process.env.DATABASE_URL) { console.log("NO_CREDENTIALS"); process.exit(1); }
    sql = neon(process.env.DATABASE_URL);
    const row = (await sql`SELECT "bggUsername", "bggPassword" FROM "Settings" WHERE id=1`)[0] || {};
    username = (row.bggUsername || "").trim();
    password = (row.bggPassword || "").trim();
    console.log("credenziali dal DB: utente", username, "| password presente:", !!password);
  } else {
    console.log("credenziali da env: utente", username);
  }
  if (!username || !password) { console.log("NO_CREDENTIALS"); process.exit(1); }
  console.log("destinazione cookie:", useEndpoint ? "endpoint app" : "database");

  const CHROME = findChrome();
  console.log("chrome:", CHROME, "| headless:", HEADLESS);
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), "bggchrome-"));
  const chrome = spawn(CHROME, [
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${profile}`,
    "--no-first-run", "--no-default-browser-check",
    "--disable-features=Translate",
    "--window-size=1100,800",
    "--disable-blink-features=AutomationControlled",
    ...(HEADLESS ? ["--headless=new", "--disable-gpu", "--no-sandbox", "--disable-dev-shm-usage"] : []),
    "about:blank",
  ], { stdio: "ignore", detached: false });

  let version = null;
  for (let i = 0; i < 40; i++) {
    try { version = await getJson(`http://127.0.0.1:${PORT}/json/version`); break; } catch { await sleep(500); }
  }
  if (!version) { console.log("CHROME_NOT_READY"); chrome.kill(); process.exit(1); }

  const ws = new WebSocket(version.webSocketDebuggerUrl, { perMessageDeflate: false });
  await new Promise((res, rej) => { ws.once("open", res); ws.once("error", rej); });
  const send = rpc(ws);

  const { targetId } = await send("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
  await send("Page.enable", {}, sessionId);
  await send("Network.enable", {}, sessionId);
  // Present as a normal Chrome: headless is otherwise rejected by Cloudflare.
  await send("Network.setUserAgentOverride", {
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
    acceptLanguage: "it-IT,it;q=0.9,en;q=0.8",
    platform: "MacIntel",
  }, sessionId).catch(() => {});
  await send("Page.addScriptToEvaluateOnNewDocument", {
    source: "Object.defineProperty(navigator,'webdriver',{get:()=>undefined});",
  }, sessionId).catch(() => {});

  // 1) Land on the site so Cloudflare can issue its clearance cookie.
  await send("Page.navigate", { url: "https://boardgamegeek.com/" }, sessionId);

  let title = "";
  for (let i = 0; i < 60; i++) {
    await sleep(1000);
    try {
      const r = await send("Runtime.evaluate", { expression: "document.title", returnByValue: true }, sessionId);
      title = r.result.value || "";
    } catch { /* navigating */ }
    if (title && !/just a moment|attention required|checking/i.test(title)) break;
  }
  console.log("titolo pagina dopo Cloudflare:", JSON.stringify(title));

  // 2) Log in from the page context (browser passes the challenge, curl cannot).
  const expr = `(async () => {
    const r = await fetch('/login/api/v1', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({credentials: {username: ${JSON.stringify(username)}, password: ${JSON.stringify(password)}}}),
      credentials: 'include'
    });
    return r.status;
  })()`;
  let loginStatus = null;
  try {
    const r = await send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true }, sessionId);
    loginStatus = r.result.value;
  } catch (e) { console.log("login evaluate error:", e.message); }
  console.log("status login/api/v1 dal browser:", loginStatus);

  await sleep(1500);

  // 3) Collect the boardgamegeek.com cookies.
  const { cookies } = await send("Network.getAllCookies", {}, sessionId);
  const bgg = cookies.filter((c) => (c.domain || "").includes("boardgamegeek.com"));
  console.log("cookie trovati:", bgg.map((c) => c.name).join(", ") || "(nessuno)");
  for (const c of bgg) {
    const exp = c.expires && c.expires > 0
      ? `${new Date(c.expires * 1000).toISOString().slice(0, 10)} (~${Math.round((c.expires * 1000 - Date.now()) / 86400000)} giorni)`
      : "sessione (scade chiudendo il browser)";
    console.log(`  - ${c.name}: scadenza ${exp} | httpOnly=${c.httpOnly} | secure=${c.secure}`);
  }

  const cookieStr = bgg.map((c) => `${c.name}=${c.value}`).join("; ");
  const hasAuth = bgg.some((c) => c.name === "bggpassword") && bgg.some((c) => c.name === "bggusername");
  console.log("contiene bggusername+bggpassword:", hasAuth, "| lunghezza stringa:", cookieStr.length);

  let saved = false;
  if (!hasAuth) {
    console.log("NON_SALVATO: manca il cookie di autenticazione");
  } else if (useEndpoint) {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${endpointToken}` },
      body: JSON.stringify({ cookie: cookieStr }),
    });
    const txt = await res.text();
    console.log("POST endpoint ->", res.status, txt.slice(0, 120));
    saved = res.ok;
    console.log(saved ? "SALVATO_VIA_ENDPOINT" : "NON_SALVATO: endpoint ha rifiutato");
  } else {
    if (!sql) sql = neon(process.env.DATABASE_URL);
    await sql`UPDATE "Settings" SET "bggCookie" = ${cookieStr} WHERE id = 1`;
    saved = true;
    console.log("SALVATO_NEL_DB");
  }

  ws.close();
  chrome.kill();
  await sleep(500);
  try { fs.rmSync(profile, { recursive: true, force: true }); } catch {}
  process.exit(saved ? 0 : 1);   // non-zero so a scheduled run reports failure
})().catch((e) => { console.error("ERR", e.message); process.exit(1); });
