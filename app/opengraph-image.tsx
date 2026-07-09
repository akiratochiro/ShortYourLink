import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#EAECF0",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: 96,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 32 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <div style={{ width: 40, height: 8, background: "#F68048", borderRadius: 4 }} />
            <div style={{ width: 26, height: 8, background: "#F68048", borderRadius: 4 }} />
            <div style={{ width: 14, height: 8, background: "#F68048", borderRadius: 4 }} />
          </div>
          <span style={{ fontSize: 28, color: "#5B6478", letterSpacing: 4, textTransform: "uppercase" }}>
            shortyourlink
          </span>
        </div>
        <div style={{ fontSize: 72, fontWeight: 700, color: "#0D1A63", lineHeight: 1.1 }}>
          Long URLs,
        </div>
        <div style={{ fontSize: 72, fontWeight: 700, color: "#0D1A63", lineHeight: 1.1 }}>
          gone short.
        </div>
      </div>
    ),
    { ...size }
  );
}