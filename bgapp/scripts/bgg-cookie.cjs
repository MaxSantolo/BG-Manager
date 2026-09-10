/**
 * Rinnova il cookie di sessione BGG pilotando un Chrome reale.
 *
 * Perché serve un browser: gli endpoint di login di BGG (/login, /login/api/v1,
 * geeklogin.php) sono dietro una challenge Cloudflare che una richiesta
 * server-to-server non supera. Gli endpoint di scrittura invece la passano, per
 * cui basta procurarsi il cookie di sessione una volta ogni ~30 giorni.
 *
 * Due modi di girare:
 *  - locale (launchd): DATABASE_URL impostata → credenziali lette da Settings e
 *    cookie riscritto direttamente sul DB;
 *  - da CI: BGG_USERNAME/BGG_PASSWORD + BGG_COOKIE_ENDPOINT/BGG_COOKIE_TOKEN →
 *    nessuna credenziale del database coinvolta, il cookie viene POSTato all'app.
 *
 * Non stampa mai password né valori dei cookie: solo nomi, scadenze e lunghezze.
 */
const { spawn } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");
const WebSocket = require("ws");
require("dotenv").config();
const { neon } = require("@neondatabase/serverless");

const HEADLESS = process.argv.includes("--headless") || process.env.BGG_HEADLESS === "1";
const IS_CI = !!process.env.CI;
/** Solo questi cookie servono all'autenticazione. Portarsi dietro il resto
 *  (in particolare cf_clearance, legato a IP+User-Agent di CHI ha fatto il
 *  login) peggiora le cose: rispedito da un IP diverso è un segnale peggiore
 *  della sua assenza. */
const COOKIE_WHITELIST = ["bggusername", "bggpassword", "SessionID"];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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

/** Chrome scrive la porta scelta qui quando la si lascia decidere a lui (porta 0);
 *  usare una porta fissa farebbe attaccare al browser di un run precedente. */
async function readDevToolsPort(profile) {
  const file = path.join(profile, "DevToolsActivePort");
  for (let i = 0; i < 60; i++) {
    try {
      const txt = fs.readFileSync(file, "utf8").split("\n")[0].trim();
      if (txt) return Number(txt);
    } catch {}
    await sleep(500);
  }
  throw new Error("Chrome non ha esposto la porta CDP");
}

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

  // Preflight: verifica che la destinazione accetti il token PRIMA di fare il
  // login. Un login riuscito che poi non riesce a salvare butta via la sessione
  // (BGG può invalidare la precedente) lasciandoti senza cookie funzionante.
  if (useEndpoint) {
    let pre;
    try {
      pre = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${endpointToken}` },
        body: JSON.stringify({ cookie: "preflight" }),
      });
    } catch (e) {
      console.log("PREFLIGHT_FALLITO: endpoint irraggiungibile:", e.message);
      process.exit(1);
    }
    // 400 = token accettato, corpo rifiutato: esattamente ciò che vogliamo.
    if (pre.status !== 400) {
      console.log(`PREFLIGHT_FALLITO: atteso 400, ricevuto ${pre.status} (token errato o endpoint non attivo)`);
      process.exit(1);
    }
    console.log("preflight endpoint: ok");
  }

  const CHROME = findChrome();
  console.log("chrome:", CHROME, "| headless:", HEADLESS);
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), "bggchrome-"));
  let chrome = null;
  let ws = null;
  let saved = false;

  try {
    chrome = spawn(CHROME, [
      "--remote-debugging-port=0",
      `--user-data-dir=${profile}`,
      "--no-first-run", "--no-default-browser-check",
      "--disable-features=Translate",
      "--window-size=1100,800",
      "--disable-blink-features=AutomationControlled",
      ...(HEADLESS ? ["--headless=new", "--disable-gpu", "--disable-dev-shm-usage"] : []),
      // --no-sandbox serve solo nei container della CI; in locale indebolirebbe
      // il browser senza motivo.
      ...(IS_CI ? ["--no-sandbox"] : []),
      "about:blank",
    ], { stdio: "ignore" });

    const port = await readDevToolsPort(profile);
    let version = null;
    for (let i = 0; i < 40; i++) {
      try { version = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json(); break; }
      catch { await sleep(500); }
    }
    if (!version) throw new Error("Chrome non risponde su CDP");

    ws = new WebSocket(version.webSocketDebuggerUrl, { perMessageDeflate: false });
    await new Promise((res, rej) => { ws.once("open", res); ws.once("error", rej); });
    const send = rpc(ws);

    const { targetId } = await send("Target.createTarget", { url: "about:blank" });
    const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
    await send("Page.enable", {}, sessionId);
    await send("Network.enable", {}, sessionId);
    // Presentarsi come Chrome normale: headless "nudo" viene respinto da Cloudflare.
    await send("Network.setUserAgentOverride", {
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
      acceptLanguage: "it-IT,it;q=0.9,en;q=0.8",
      platform: "MacIntel",
    }, sessionId).catch(() => {});
    await send("Page.addScriptToEvaluateOnNewDocument", {
      source: "Object.defineProperty(navigator,'webdriver',{get:()=>undefined});",
    }, sessionId).catch(() => {});

    // 1) Passa da Cloudflare.
    await send("Page.navigate", { url: "https://boardgamegeek.com/" }, sessionId);
    let title = "";
    for (let i = 0; i < 60; i++) {
      await sleep(1000);
      try {
        const r = await send("Runtime.evaluate", { expression: "document.title", returnByValue: true }, sessionId);
        title = r.result.value || "";
      } catch {}
      if (title && !/just a moment|attention required|checking/i.test(title)) break;
    }
    console.log("titolo pagina dopo Cloudflare:", JSON.stringify(title));

    // 2) Login dal contesto della pagina.
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

    // Guardia decisiva: BGG imposta cookie con quei nomi anche SENZA una sessione
    // valida, quindi fidarsi della loro sola presenza sovrascriverebbe un cookie
    // buono con uno morto. Senza login riuscito non si salva nulla.
    if (loginStatus !== 204 && loginStatus !== 200) {
      console.log(`NON_SALVATO: login non riuscito (status ${loginStatus})`);
      process.exitCode = 1;
      return;
    }

    await sleep(1500);

    // 3) Raccogli SOLO i cookie di autenticazione.
    const { cookies } = await send("Network.getAllCookies", {}, sessionId);
    const bgg = cookies.filter(
      (c) => (c.domain || "").includes("boardgamegeek.com") && COOKIE_WHITELIST.includes(c.name)
    );
    console.log("cookie trovati:", bgg.map((c) => c.name).join(", ") || "(nessuno)");
    for (const c of bgg) {
      const exp = c.expires && c.expires > 0
        ? `${new Date(c.expires * 1000).toISOString().slice(0, 10)} (~${Math.round((c.expires * 1000 - Date.now()) / 86400000)} giorni)`
        : "sessione";
      console.log(`  - ${c.name}: scadenza ${exp} | httpOnly=${c.httpOnly} | secure=${c.secure}`);
    }

    const cookieStr = bgg.map((c) => `${c.name}=${c.value}`).join("; ");
    const hasAuth = bgg.some((c) => c.name === "bggpassword") && bgg.some((c) => c.name === "bggusername");
    console.log("contiene bggusername+bggpassword:", hasAuth, "| lunghezza stringa:", cookieStr.length);

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
      // Upsert + RETURNING: un UPDATE su una riga inesistente riporterebbe
      // successo aggiornando zero righe, e il rinnovo diventerebbe fantasma.
      const out = await sql`
        INSERT INTO "Settings" (id, "bggCookie") VALUES (1, ${cookieStr})
        ON CONFLICT (id) DO UPDATE SET "bggCookie" = EXCLUDED."bggCookie"
        RETURNING id`;
      saved = out.length > 0;
      console.log(saved ? "SALVATO_NEL_DB" : "NON_SALVATO: nessuna riga scritta");
    }
  } finally {
    // Cleanup anche sui percorsi di errore: un Chrome orfano resterebbe vivo con
    // la sessione BGG nel profilo su disco.
    try { ws && ws.close(); } catch {}
    try { chrome && chrome.kill(); } catch {}
    await sleep(300);
    try { fs.rmSync(profile, { recursive: true, force: true }); } catch {}
  }

  process.exit(saved ? 0 : 1);
})().catch((e) => { console.error("ERR", e.message); process.exit(1); });
