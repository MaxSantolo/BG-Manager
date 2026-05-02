import { NextRequest, NextResponse } from "next/server";
import { searchBgg, getBggGame } from "@/lib/bgg";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const query = searchParams.get("q");
  const id    = searchParams.get("id");

  if (id) {
    const game = await getBggGame(parseInt(id));
    if (!game) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(game);
  }

  if (query) {
    const results = await searchBgg(query);
    return NextResponse.json(results);
  }

  return NextResponse.json({ error: "Missing q or id param" }, { status: 400 });
}
