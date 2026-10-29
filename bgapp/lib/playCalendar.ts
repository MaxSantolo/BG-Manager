import { prisma } from "@/lib/prisma";
import { dayInput } from "@/lib/dates";

/**
 * Partite per giorno di calendario, per il calendario stile GitHub.
 * Chiave "AAAA-MM-GG". Una riga Play può valere più partite (quantity), ed è così
 * che le contano anche H-index e statistiche. Le date delle partite sono giorni a
 * mezzanotte UTC (vedi lib/dates), quindi dayInput dà il giorno giusto.
 */
export function countByDay(plays: { date: Date; quantity: number }[]): Record<string, number> {
  const days: Record<string, number> = {};
  for (const p of plays) {
    const d = dayInput(p.date);
    if (d) days[d] = (days[d] ?? 0) + p.quantity;
  }
  return days;
}

export async function playsByDay(): Promise<Record<string, number>> {
  return countByDay(await prisma.play.findMany({ select: { date: true, quantity: true } }));
}
