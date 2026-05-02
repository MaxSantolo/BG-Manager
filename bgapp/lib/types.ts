export type GameStatus = "InCollezione" | "InVendita" | "Preordinato" | "Venduto" | "GiocatoEsterno";
export type GameType = "Base" | "Espansione" | "Base + Espansione";
export type InsertStatus = "Sì" | "No" | "NA";
export type SleevesStatus = "Sì" | "No" | "NA" | "Necessarie" | "IH" | "TB";

export interface SleeveEntry {
  size: string;
  qty: number;
}

export const SLEEVE_SIZES = [
  "63x88", "44x68", "70x70", "54x80", "88x125",
  "41x63", "101x127", "59x91", "65x100", "56x87",
  "46x71", "57.5x89", "70x120", "75x105", "70x110",
  "57x57", "44x63",
] as const;

// GiocatoEsterno è escluso da GAME_STATUSES: non compare nel form di modifica
export const GAME_STATUSES: GameStatus[] = ["InCollezione", "InVendita", "Preordinato", "Venduto"];
export const GAME_TYPES: GameType[] = ["Base", "Espansione", "Base + Espansione"];
export const INSERT_OPTIONS: InsertStatus[] = ["Sì", "No", "NA"];
export const SLEEVES_OPTIONS: SleevesStatus[] = ["Sì", "No", "NA", "Necessarie", "IH", "TB"];

export const STATUS_LABELS: Record<GameStatus, string> = {
  InCollezione:   "In Collezione",
  InVendita:      "In Vendita",
  Preordinato:    "Preordinato",
  Venduto:        "Venduto",
  GiocatoEsterno: "Giocato (ospite)",
};

export const STATUS_COLORS: Record<GameStatus, string> = {
  InCollezione:   "bg-blue-900 text-blue-200",
  InVendita:      "bg-amber-900 text-amber-200",
  Preordinato:    "bg-purple-900 text-purple-200",
  Venduto:        "bg-red-900 text-red-200",
  GiocatoEsterno: "bg-zinc-800 text-zinc-400",
};
