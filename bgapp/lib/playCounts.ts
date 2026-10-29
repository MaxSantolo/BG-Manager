/**
 * A quale gioco appartiene una partita. Una riga Play punta al gioco per
 * gameId oppure, quando la sincronizzazione non l'ha risolto, solo per
 * bggGameId o per nome: bggGameId va ricondotto al gioco locale quando esiste,
 * altrimenti lo stesso gioco si spezza in due (nella classifica dei più
 * giocati, nell'H-index, nel conteggio dei giochi diversi).
 */
export function playGameRef(
  p: { gameId: number | null; bggGameId: number | null; gameName: string },
  gameIdByBggId: Map<number, number>,
): { key: string; gameId: number | null } {
  const gameId = p.gameId ?? (p.bggGameId != null ? gameIdByBggId.get(p.bggGameId) ?? null : null);
  if (gameId != null) return { key: `g:${gameId}`, gameId };
  if (p.bggGameId != null) return { key: `b:${p.bggGameId}`, gameId: null };
  return { key: `n:${p.gameName.trim().toLowerCase()}`, gameId: null };
}

export function gameIdsByBggId(games: { id: number; bggId: number | null }[]) {
  const m = new Map<number, number>();
  for (const g of games) if (g.bggId != null) m.set(g.bggId, g.id);
  return m;
}
