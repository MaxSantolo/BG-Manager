export async function bggLogin(username: string, password: string): Promise<string> {
  const res = await fetch("https://boardgamegeek.com/login/api/v1", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ credentials: { username, password } }),
  });
  if (!res.ok) throw new Error(`Login BGG fallito (${res.status}). Controlla username e password.`);

  const raw = res.headers.getSetCookie?.() ?? [];
  if (raw.length === 0) {
    raw.push(...(res.headers.get("set-cookie") ?? "").split(/,(?=[^ ])/));
  }
  const cookie = raw.map(c => c.split(";")[0]).join("; ");
  if (!cookie) throw new Error("Login BGG: nessun cookie ricevuto.");
  return cookie;
}
