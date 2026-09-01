import { prisma } from "@/lib/prisma";
import { BookOpen } from "lucide-react";
import AllLoans from "./AllLoans";

export const dynamic = "force-dynamic";

export default async function LoansPage() {
  const loans = await prisma.loan.findMany({
    include: { game: { select: { id: true, name: true, thumbnail: true } } },
    orderBy: { loanDate: "desc" },
  });

  const serialised = loans.map((l) => ({
    id: l.id,
    borrower: l.borrower,
    loanDate: l.loanDate.toISOString(),
    returnDate: l.returnDate ? l.returnDate.toISOString() : null,
    returned: l.returned,
    notes: l.notes,
    game: l.game,
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <BookOpen size={20} style={{ color: "var(--accent-blue-light)" }} />
        <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Prestiti</h1>
      </div>
      <AllLoans initialLoans={serialised} />
    </div>
  );
}
