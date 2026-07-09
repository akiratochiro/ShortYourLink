import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#0D1A63",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
        }}
      >
        <div style={{ width: 88, height: 16, background: "#F68048", borderRadius: 8 }} />
        <div style={{ width: 60, height: 16, background: "#F68048", borderRadius: 8 }} />
        <div style={{ width: 32, height: 16, background: "#F68048", borderRadius: 8 }} />
      </div>
    ),
    { ...size }
  );
}