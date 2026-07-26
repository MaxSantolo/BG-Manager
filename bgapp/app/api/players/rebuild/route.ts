import { NextResponse } from "next/server";
import { rebuildPlayers } from "@/lib/registry";

export const maxDuration = 60;

export async function POST() {
  const result = await rebuildPlayers();
  return NextResponse.json({ ...result, total: result.created + result.updated });
}
