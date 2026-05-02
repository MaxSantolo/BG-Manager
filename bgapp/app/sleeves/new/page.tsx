import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export const metadata = { title: "Aggiungi bustina" };

async function addSleeve(formData: FormData) {
  "use server";
  const size = formData.get("size") as string;
  const label = (formData.get("label") as string).trim() || null;
  const quantity = Number(formData.get("quantity")) || 0;
  await prisma.sleeve.create({ data: { size, label, quantity } });
  revalidatePath("/sleeves");
  redirect("/sleeves");
}

export default function NewSleevePage() {
  return (
    <form action={addSleeve} className="space-y-4 max-w-md mx-auto mt-8 card p-6">
      <h2 className="text-xl font-bold mb-2">Aggiungi bustina</h2>
      <div>
        <label className="block mb-1 font-medium">Dimensione *</label>
        <input name="size" required className="w-full" placeholder="Es: 63x88" />
      </div>
      <div>
        <label className="block mb-1 font-medium">Etichetta</label>
        <input name="label" className="w-full" placeholder="Es: Standard Euro (opzionale)" />
      </div>
      <div>
        <label className="block mb-1 font-medium">Quantità disponibile</label>
        <input name="quantity" type="number" min="0" className="w-full" defaultValue={0} />
      </div>
      <button type="submit" className="btn-primary w-full mt-2">Salva</button>
    </form>
  );
}
