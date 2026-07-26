import { NextRequest } from "next/server";
import { ImageResponse } from "next/og";
import { buildPlayReport } from "@/lib/playReport";
import { columnsFor, packColumns, columnHeights } from "@/lib/collageLayout";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const WIDTH = 1200;

function formatDay(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const from = searchParams.get("from");
  const to   = searchParams.get("to");
  const title = searchParams.get("title")?.slice(0, 60) || "Partite giocate";
  const showBadges = searchParams.get("badges") === "1";
  if (!from || !to) return new Response("Servono from e to (YYYY-MM-DD)", { status: 400 });

  const report = await buildPlayReport(from, to);
  if (report.games.length === 0)
    return new Response("Nessuna partita nel periodo selezionato", { status: 404 });

  const gap  = 10;
  const pad  = 40;
  const cols = columnsFor(report.games.length);
  const colWidth = Math.floor((WIDTH - pad * 2 - gap * (cols - 1)) / cols);

  // Masonry keeps every cover at its own proportions, so nothing is cropped.
  const columns = packColumns(report.games, cols, colWidth);
  const tallest = Math.max(...columnHeights(columns, colWidth, gap));
  const height  = Math.ceil(pad * 2 + 140 + tallest);

  const hours = Math.round(report.totalMinutes / 60);

  return new ImageResponse(
    (
      <div
        style={{
          width: WIDTH,
          height,
          display: "flex",
          flexDirection: "column",
          padding: pad,
          backgroundColor: "#0f1929",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", marginBottom: 28 }}>
          <div style={{ display: "flex", fontSize: 46, fontWeight: 700, color: "#f0ebe0" }}>{title}</div>
          <div style={{ display: "flex", fontSize: 24, color: "#9aacbf", marginTop: 8 }}>
            {formatDay(from)} — {formatDay(to)}
          </div>
          <div style={{ display: "flex", fontSize: 22, color: "#c0392b", marginTop: 10 }}>
            {report.totalPlays} partite · {report.totalGames} giochi
            {hours > 0 ? ` · ${hours} ore` : ""}
          </div>
        </div>

        <div style={{ display: "flex", gap }}>
          {columns.map((col, ci) => (
            <div key={ci} style={{ display: "flex", flexDirection: "column", gap, width: colWidth }}>
              {col.map(g => (
                <div key={g.key} style={{ display: "flex", position: "relative", width: colWidth }}>
                  {g.thumbnail ? (
                    // Satori renders this to PNG server-side; next/image has no role here.
                    // Width only: the height follows the cover's own proportions.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={g.thumbnail} width={colWidth} style={{ borderRadius: 6 }} alt="" />
                  ) : (
                    <div
                      style={{
                        display: "flex",
                        width: colWidth,
                        height: colWidth,
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: 6,
                        backgroundColor: "#162035",
                        color: "#5c7080",
                        fontSize: Math.max(10, Math.floor(colWidth / 9)),
                        padding: 6,
                        textAlign: "center",
                      }}
                    >
                      {g.name.slice(0, 24)}
                    </div>
                  )}

                  {showBadges && g.plays > 1 && (
                    <div
                      style={{
                        position: "absolute",
                        right: 0,
                        bottom: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        minWidth: 26,
                        height: 26,
                        paddingLeft: 6,
                        paddingRight: 6,
                        borderTopLeftRadius: 8,
                        borderBottomRightRadius: 6,
                        backgroundColor: "#8b1a1a",
                        color: "#f0ebe0",
                        fontSize: 16,
                        fontWeight: 700,
                      }}
                    >
                      {g.plays}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    ),
    { width: WIDTH, height }
  );
}
