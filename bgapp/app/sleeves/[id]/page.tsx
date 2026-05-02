import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import DeleteSleeveButton from "./DeleteSleeveButton";

export const metadata = { title: "Modifica bustina" };

async function updateSleeve(id: number, formData: FormData) {
  "use server";
  const size = formData.get("size") as string;
  const label = (formData.get("label") as string).trim() || null;
  const quantity = Number(formData.get("quantity")) || 0;
  await prisma.sleeve.update({ where: { id }, data: { size, label, quantity } });
  revalidatePath("/sleeves");
  redirect("/sleeves");
}

async function deleteSleeve(id: number) {
  "use server";
  await prisma.sleeve.delete({ where: { id } });
  revalidatePath("/sleeves");
  redirect("/sleeves");
}

export default async function EditSleevePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sleeve = await prisma.sleeve.findUnique({ where: { id: Number(id) } });
  if (!sleeve) return <div className="text-center mt-10">Bustina non trovata.</div>;
  return (
    <div className="max-w-md mx-auto mt-8 space-y-3">
    <form action={updateSleeve.bind(null, sleeve.id)} className="space-y-4 card p-6">
      <h2 className="text-xl font-bold mb-2">Modifica bustina</h2>
      <div>
        <label className="block mb-1 font-medium">Dimensione *</label>
        <input name="size" required className="w-full" defaultValue={sleeve.size} />
      </div>
      <div>
        <label className="block mb-1 font-medium">Etichetta</label>
        <input name="label" className="w-full" defaultValue={sleeve.label ?? ""} placeholder="Es: Standard Euro (opzionale)" />
      </div>
      <div>
        <label className="block mb-1 font-medium">Quantità disponibile</label>
        <input name="quantity" type="number" min="0" className="w-full" defaultValue={sleeve.quantity} />
      </div>
      <div className="flex gap-2 mt-4">
        <button type="submit" className="btn-primary flex-1">Salva</button>
      </div>
    </form>
    <div className="flex">
      <DeleteSleeveButton action={deleteSleeve.bind(null, sleeve.id)} />
    </div>
    </div>
  );
}
