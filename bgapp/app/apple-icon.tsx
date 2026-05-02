import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 180,
          height: 180,
          backgroundColor: "#0f1929",
          borderRadius: 40,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            width: 136,
            height: 136,
            backgroundColor: "#162035",
            borderRadius: 26,
            border: "6px solid #c0392b",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 28,
          }}
        >
          <div style={{ display: "flex", gap: 28 }}>
            <div style={{ width: 22, height: 22, borderRadius: "50%", backgroundColor: "#c0392b" }} />
            <div style={{ width: 22, height: 22, borderRadius: "50%", backgroundColor: "#c0392b" }} />
          </div>
          <div style={{ display: "flex", gap: 28 }}>
            <div style={{ width: 22, height: 22, borderRadius: "50%", backgroundColor: "#c0392b" }} />
            <div style={{ width: 22, height: 22, borderRadius: "50%", backgroundColor: "#c0392b" }} />
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
