import { NextResponse } from "next/server";
import { rebuildPlaces } from "@/lib/registry";

export const maxDuration = 60;

export async function POST() {
  const result = await rebuildPlaces();
  return NextResponse.json({ ...result, total: result.created + result.updated });
}
