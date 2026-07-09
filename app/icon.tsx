import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#0D1A63",
          borderRadius: 6,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 3,
        }}
      >
        <div style={{ width: 16, height: 3, background: "#F68048", borderRadius: 2 }} />
        <div style={{ width: 11, height: 3, background: "#F68048", borderRadius: 2 }} />
        <div style={{ width: 6, height: 3, background: "#F68048", borderRadius: 2 }} />
      </div>
    ),
    { ...size }
  );
}