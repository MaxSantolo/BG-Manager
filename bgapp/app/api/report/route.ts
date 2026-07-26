import { NextRequest, NextResponse } from "next/server";
import { buildPlayReport } from "@/lib/playReport";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const from = searchParams.get("from");
  const to   = searchParams.get("to");

  if (!from || !to)
    return NextResponse.json({ error: "Servono i parametri from e to (YYYY-MM-DD)" }, { status: 400 });

  return NextResponse.json(await buildPlayReport(from, to));
}
