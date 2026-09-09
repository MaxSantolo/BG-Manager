import { prisma } from "@/lib/prisma";
import { Settings } from "lucide-react";
import SettingsForm from "./SettingsForm";
import StatusConfigEditor from "./StatusConfigEditor";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const settings = await prisma.settings.findUnique({ where: { id: 1 } });

  const lastSync = settings?.lastSyncAt
    ? new Intl.DateTimeFormat("it-IT", {
        day: "2-digit", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit", timeZone: "Europe/Rome",
      }).format(settings.lastSyncAt)
    : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Settings size={20} style={{ color: "var(--text-muted)" }} />
        <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Impostazioni</h1>
      </div>
      <SettingsForm
        initialUsername={settings?.bggUsername ?? ""}
        initialHasPassword={!!settings?.bggPassword?.trim()}
        initialHasCookie={!!settings?.bggCookie?.trim()}
        initialAutoSync={settings?.autoSyncOnStart ?? true}
        initialLastSync={lastSync}
      />
      <StatusConfigEditor />
    </div>
  );
}
