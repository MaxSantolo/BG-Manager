import { FileImage } from "lucide-react";
import ReportTool, { type Preset } from "./ReportTool";

export const dynamic = "force-dynamic";

/** Rome, not UTC: "today" should mean the user's today, not the server's. */
function romeToday(): Date {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Rome", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());
  return new Date(`${parts}T00:00:00.000Z`);
}

const iso = (d: Date) => d.toISOString().slice(0, 10);

function presets(): Preset[] {
  const today = romeToday();
  const y = today.getUTCFullYear();
  const minus = (days: number) => new Date(today.getTime() - days * 86_400_000);
  return [
    { label: "Quest'anno",   from: iso(new Date(Date.UTC(y, 0, 1))),     to: iso(today) },
    { label: "Ultimi 30 gg", from: iso(minus(30)),                        to: iso(today) },
    { label: "Ultimi 90 gg", from: iso(minus(90)),                        to: iso(today) },
    { label: `${y - 1}`,     from: iso(new Date(Date.UTC(y - 1, 0, 1))),  to: `${y - 1}-12-31` },
  ];
}

export default function ReportPage() {
  const ranges = presets();
  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <FileImage size={20} style={{ color: "var(--accent-red-light)" }} />
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
            Report partite
          </h1>
        </div>
        <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
          Scegli un periodo e scarica un collage delle copertine dei giochi giocati.
        </p>
      </div>
      <ReportTool presets={ranges} />
    </div>
  );
}
