import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { ChevronLeft, ShoppingCart } from "lucide-react";
import GameForm from "@/components/GameForm";

export default async function WishlistDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const game = await prisma.wishlistGame.findUnique({ where: { id: parseInt(id) } });
  if (!game) notFound();

  async function buyGame(formData: FormData) {
    "use server";
    const cost = formData.get("cost") as string;
    const purchaseDate = formData.get("purchaseDate") as string;

    const newGame = await prisma.game.create({
      data: {
        bggId:         game!.bggId,
        name:          game!.name,
        type:          game!.type,
        status:        "InCollezione",
        insert:        game!.insert,
        cost:          cost ? parseFloat(cost) : null,
        purchaseDate:  purchaseDate ? new Date(purchaseDate) : new Date(),
        thumbnail:     game!.thumbnail,
        image:         game!.image,
        description:   game!.description,
        designers:     game!.designers,
        mechanics:     game!.mechanics,
        bggRating:     game!.bggRating,
        bggWeight:     game!.bggWeight,
        minPlayers:    game!.minPlayers,
        maxPlayers:    game!.maxPlayers,
        playTime:      game!.playTime,
        yearPublished: game!.yearPublished,
        notes:         game!.notes,
      },
    });

    await prisma.wishlistGame.delete({ where: { id: game!.id } });
    revalidatePath("/wishlist");
    revalidatePath("/collection");
    redirect(`/collection/${newGame.id}`);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Link href="/wishlist" className="btn-ghost p-1.5">
          <ChevronLeft size={18} style={{ color: "var(--text-secondary)" }} />
        </Link>
        <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
          {game.name}
        </h1>
      </div>

      {/* Acquisto rapido */}
      <div className="card space-y-3" style={{ borderLeft: "3px solid var(--accent-red)" }}>
        <div className="flex items-center gap-2">
          <ShoppingCart size={15} style={{ color: "var(--accent-red-light)" }} />
          <h2 className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>
            Segna come acquistato
          </h2>
        </div>
        <form action={buyGame} className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Costo (€)</label>
            <input name="cost" type="number" step="0.01" min="0" className="w-32 text-sm" placeholder="0.00" />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Data acquisto</label>
            <input name="purchaseDate" type="date" className="text-sm"
              defaultValue={new Date().toISOString().split("T")[0]} />
          </div>
          <button type="submit" className="btn-primary text-sm">
            <ShoppingCart size={14} /> Acquistato!
          </button>
        </form>
      </div>

      <GameForm mode="wishlist" initialData={game as never} id={game.id} />
    </div>
  );
}
