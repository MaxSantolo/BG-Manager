import { prisma } from "@/lib/prisma";
import { Settings } from "lucide-react";
import SettingsForm from "./SettingsForm";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const settings = await prisma.settings.findUnique({ where: { id: 1 } });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Settings size={20} style={{ color: "var(--text-muted)" }} />
        <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Impostazioni</h1>
      </div>
      <SettingsForm
        initialUsername={settings?.bggUsername ?? ""}
        initialPassword={settings?.bggPassword ?? ""}
      />
    </div>
  );
}
