import { prisma } from "@/lib/prisma";
import SleevesList from "./SleevesList";

export const metadata = { title: "Magazzino bustine" };
export const dynamic = "force-dynamic";

export default async function SleevesPage() {
  const sleeves = await prisma.sleeve.findMany({ orderBy: { size: "asc" } });
  return <SleevesList sleeves={sleeves} />;
}
